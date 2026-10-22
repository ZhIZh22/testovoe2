from fastapi import APIRouter, HTTPException

from ..cities import CITIES
from ..providers.events import events_service
from ..schemas import City, Event

router = APIRouter(prefix="/api", tags=["events"])


@router.get("/cities", response_model=list[City])
async def cities():
    return CITIES


@router.get("/events")
async def list_events(city: str = "msk"):
    events, source = await events_service.list(city)
    return {"source": source, "events": events}


@router.get("/events/{event_id}", response_model=Event)
async def get_event(event_id: str):
    event = events_service.get(event_id)
    if not event:
        raise HTTPException(404, {"code": "event_not_found", "message": "Мероприятие не найдено"})
    return event
