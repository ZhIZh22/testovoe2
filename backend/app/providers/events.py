"""Источник событий: KudaGo public API с кэшем и откатом на встроенные моки."""

import logging
import re
import time
from datetime import UTC, datetime, timedelta

import httpx

from ..cities import CITIES, CITY_BY_SLUG
from ..config import settings
from ..inventory import inventory
from ..schemas import City, Event, Session
from .mock_events import build_mock_events

log = logging.getLogger(__name__)

KUDAGO_CATEGORIES = {
    "concert": "Концерт",
    "theater": "Театр",
    "exhibition": "Выставка",
    "festival": "Фестиваль",
    "kids": "Детям",
    "education": "Обучение",
    "party": "Вечеринка",
    "entertainment": "Развлечения",
    "tour": "Экскурсия",
    "quest": "Квест",
    "cinema": "Кино",
    "fashion": "Мода",
    "stand-up": "Стендап",
    "yarmarki-razvlecheniya-yarmarki": "Ярмарка",
    "recreation": "Отдых",
}
MAX_SESSIONS = 6
HORIZON_DAYS = 120


def parse_age(raw) -> int:
    """KudaGo отдаёт возраст как 0, "18+", "16" или null."""
    m = re.search(r"\d+", str(raw or ""))
    return int(m.group()) if m else 0


def _capitalize(s: str) -> str:
    return s[:1].upper() + s[1:] if s else s


def normalize_kudago(item: dict, city: City, now: datetime) -> dict | None:
    horizon = now + timedelta(days=HORIZON_DAYS)
    starts = sorted(
        {
            d["start"]
            for d in item.get("dates") or []
            if isinstance(d.get("start"), int | float)
            and now.timestamp() < d["start"] < horizon.timestamp()
        }
    )[:MAX_SESSIONS]
    if not starts:
        return None
    place = item.get("place") or {}
    images = item.get("images") or []
    cats = item.get("categories") or []
    eid = f"kg{item['id']}"
    return {
        "id": eid,
        "title": _capitalize(item.get("title") or item.get("short_title") or "Событие"),
        "category": next((KUDAGO_CATEGORIES[c] for c in cats if c in KUDAGO_CATEGORIES), None),
        "description": (item.get("description") or "").strip(),
        "city": city,
        "place": _capitalize(place.get("title") or "") or None,
        "address": place.get("address") or None,
        "image": images[0].get("image") if images else None,
        "min_age": parse_age(item.get("age_restriction")),
        "sessions": [(f"{eid}-{int(s)}", datetime.fromtimestamp(s, UTC), None) for s in starts],
        "source": "kudago",
        "url": item.get("site_url"),
    }


class EventsService:
    def __init__(self) -> None:
        self._by_city: dict[str, tuple[float, list[dict]]] = {}
        self._by_id: dict[str, dict] = {}
        self._session_event: dict[str, str] = {}
        self._mock = build_mock_events()
        self._remember(self._mock)

    def _remember(self, events: list[dict]) -> None:
        for e in events:
            self._by_id[e["id"]] = e
            for sid, _, capacity in e["sessions"]:
                inventory.register(sid, capacity)
                self._session_event[sid] = e["id"]

    async def _fetch_kudago(self, city: City) -> list[dict]:
        now = datetime.now(UTC)
        params = {
            "location": city.slug,
            "actual_since": int(now.timestamp()),
            "fields": "id,title,short_title,dates,place,images,age_restriction,"
            "description,categories,site_url",
            "expand": "place",
            "text_format": "text",
            "page_size": 60,
        }
        async with httpx.AsyncClient(timeout=settings.http_timeout) as client:
            r = await client.get(f"{settings.kudago_base_url}/events/", params=params)
            r.raise_for_status()
            results = r.json().get("results", [])
        events = [e for item in results if (e := normalize_kudago(item, city, now))]
        return events[:24]

    async def list(self, city_slug: str) -> tuple[list[Event], str]:
        city = CITY_BY_SLUG.get(city_slug) or CITIES[0]
        cached = self._by_city.get(city.slug)
        if cached and time.monotonic() - cached[0] < settings.events_cache_ttl:
            raw = cached[1]
        else:
            raw = []
            if settings.events_source == "kudago":
                try:
                    raw = await self._fetch_kudago(city)
                except (httpx.HTTPError, ValueError) as exc:
                    log.warning("KudaGo недоступен (%s), показываем моки", exc)
            if not raw:
                raw = [e for e in self._mock if e["city"].slug == city.slug]
            self._remember(raw)
            self._by_city[city.slug] = (time.monotonic(), raw)
        source = raw[0]["source"] if raw else "mock"
        return [self._to_model(e) for e in raw], source

    def get(self, event_id: str) -> Event | None:
        e = self._by_id.get(event_id)
        return self._to_model(e) if e else None

    def event_for_session(self, session_id: str) -> Event | None:
        eid = self._session_event.get(session_id)
        return self.get(eid) if eid else None

    def _to_model(self, e: dict) -> Event:
        sessions = [
            Session(id=sid, starts_at=starts, seats_left=inventory.seats_left(sid))
            for sid, starts, _ in e["sessions"]
        ]
        return Event(**{**e, "sessions": sessions})


events_service = EventsService()
