from datetime import UTC, datetime, timedelta

from app.cities import CITY_BY_SLUG
from app.providers.events import normalize_kudago, parse_age


def test_parse_age():
    assert parse_age("18+") == 18
    assert parse_age(0) == 0
    assert parse_age(None) == 0


def test_normalize_kudago_keeps_only_future_dates():
    now = datetime(2026, 11, 1, tzinfo=UTC)
    future = int((now + timedelta(days=3)).timestamp())
    item = {
        "id": 42,
        "title": "концерт «Звёзды»",
        "categories": ["concert"],
        "dates": [{"start": -62135433000}, {"start": int(now.timestamp()) - 10}, {"start": future}],
        "place": {"title": "клуб", "address": "ул. Ленина, 1"},
        "age_restriction": "16+",
        "images": [{"image": "https://example.com/a.jpg"}],
    }
    e = normalize_kudago(item, CITY_BY_SLUG["msk"], now)
    assert e["title"] == "Концерт «Звёзды»"
    assert e["category"] == "Концерт"
    assert e["min_age"] == 16
    assert [s[0] for s in e["sessions"]] == [f"kg42-{future}"]
    assert normalize_kudago({**item, "dates": []}, CITY_BY_SLUG["msk"], now) is None
