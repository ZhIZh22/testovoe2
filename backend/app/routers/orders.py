from datetime import UTC, datetime

from fastapi import APIRouter, Header, HTTPException

from ..inventory import SoldOut, inventory
from ..providers.events import events_service
from ..rules import check_participants, ticket_price, ticket_type
from ..schemas import Order, OrderIn, OrderLine

router = APIRouter(prefix="/api/orders", tags=["orders"])


@router.post("", response_model=Order, status_code=201)
async def create_order(body: OrderIn, idempotency_key: str | None = Header(default=None)):
    event = events_service.event_for_session(body.session_id)
    session = next((s for s in event.sessions if s.id == body.session_id), None) if event else None
    if not event or not session:
        raise HTTPException(
            404,
            {
                "code": "session_not_found",
                "message": "Сеанс не найден. Обновите страницу и выберите сеанс заново",
            },
        )

    people = [(p.name.strip(), p.age) for p in body.participants]
    errors = check_participants(people, event.min_age)
    if errors:
        raise HTTPException(422, {"code": "rules_violated", "errors": [e.__dict__ for e in errors]})

    lines = [
        OrderLine(name=n, age=a, ticket=ticket_type(a), price=ticket_price(a)) for n, a in people
    ]

    def build(order_id: str) -> Order:
        return Order(
            id=order_id,
            event_id=event.id,
            event_title=event.title,
            session_id=session.id,
            starts_at=session.starts_at,
            email=body.email,
            lines=lines,
            total=sum(x.price for x in lines),
            created_at=datetime.now(UTC),
        )

    try:
        return await inventory.book(session.id, len(lines), idempotency_key, build)
    except SoldOut as exc:
        raise HTTPException(
            409,
            {
                "code": "sold_out",
                "seats_left": exc.seats_left,
                "message": "Пока вы оформляли заказ, места закончились",
            },
        ) from exc


@router.get("/{order_id}", response_model=Order)
async def get_order(order_id: str):
    order = inventory.get_order(order_id)
    if not order:
        raise HTTPException(404, {"code": "order_not_found", "message": "Заказ не найден"})
    return order
