"""Бизнес-правила заказа. Чистые функции без I/O — их же повторяет фронтенд (src/lib/rules.ts)."""

from dataclasses import dataclass
from enum import StrEnum

MIN_PARTICIPANTS = 1
MAX_PARTICIPANTS = 4
FULL_PRICE = 2000
CHILD_PRICE = 1000
FULL_TICKET_AGE = 14  # с 14 лет — полный билет
ADULT_AGE = 18  # ребёнок допускается только вместе с участником от 18 лет
MAX_AGE = 120


class TicketType(StrEnum):
    FULL = "full"
    CHILD = "child"


def ticket_type(age: int) -> TicketType:
    return TicketType.FULL if age >= FULL_TICKET_AGE else TicketType.CHILD


def ticket_price(age: int) -> int:
    return FULL_PRICE if ticket_type(age) is TicketType.FULL else CHILD_PRICE


@dataclass(frozen=True)
class RuleError:
    code: str
    message: str
    index: int | None = None  # номер участника, к которому относится ошибка


def check_participants(participants: list[tuple[str, int]], min_age: int = 0) -> list[RuleError]:
    """participants — список (имя, возраст). Возвращает все нарушения сразу."""
    errors: list[RuleError] = []
    n = len(participants)
    if not MIN_PARTICIPANTS <= n <= MAX_PARTICIPANTS:
        errors.append(
            RuleError(
                "participants_count", f"В заказе может быть от 1 до {MAX_PARTICIPANTS} участников"
            )
        )
    for i, (name, age) in enumerate(participants):
        if not name.strip():
            errors.append(RuleError("name_required", "Укажите имя", i))
        if not 0 <= age <= MAX_AGE:
            errors.append(RuleError("age_invalid", "Укажите возраст от 0 до 120", i))
        elif age < min_age:
            errors.append(RuleError("age_restricted", f"Мероприятие для зрителей {min_age}+", i))

    has_child = any(ticket_type(a) is TicketType.CHILD for _, a in participants)
    has_adult = any(a >= ADULT_AGE for _, a in participants)
    if has_child and not has_adult:
        errors.append(
            RuleError(
                "child_without_adult", "Ребёнок до 14 лет может пройти только со взрослым от 18 лет"
            )
        )
    return errors


def order_total(ages: list[int]) -> int:
    return sum(ticket_price(a) for a in ages)
