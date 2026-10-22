"""Учёт мест и заказов в памяти процесса.

В production это была бы одна строка в PostgreSQL:
UPDATE sessions SET seats_left = seats_left - :n WHERE id = :id AND seats_left >= :n RETURNING seats_left
Здесь ту же атомарность даёт asyncio.Lock (сервис запускается в одном процессе).
"""

import asyncio
import hashlib
import secrets
from datetime import UTC, datetime

from .schemas import Order

# Распределение вместимости для сеансов из внешнего API: часть сеансов почти распродана
_CAPACITY_POOL = [2, 3, 6, 12, 25, 40, 80, 150]


def seeded_capacity(session_id: str) -> int:
    h = int(hashlib.sha256(session_id.encode()).hexdigest(), 16)
    return _CAPACITY_POOL[h % len(_CAPACITY_POOL)]


class SoldOut(Exception):
    def __init__(self, seats_left: int):
        self.seats_left = seats_left


class UnknownSession(Exception):
    pass


class Inventory:
    def __init__(self) -> None:
        self._seats: dict[str, int] = {}
        self._orders: dict[str, Order] = {}
        self._idempotency: dict[str, str] = {}
        self._lock = asyncio.Lock()

    def register(self, session_id: str, capacity: int | None = None) -> int:
        """Регистрирует сеанс, если его ещё нет, и возвращает остаток мест."""
        if session_id not in self._seats:
            self._seats[session_id] = (
                capacity if capacity is not None else seeded_capacity(session_id)
            )
        return self._seats[session_id]

    def seats_left(self, session_id: str) -> int:
        if session_id not in self._seats:
            raise UnknownSession(session_id)
        return self._seats[session_id]

    async def book(self, session_id: str, count: int, idempotency_key: str | None, build_order):
        """Списывает места и сохраняет заказ. build_order(order_id) -> Order."""
        async with self._lock:
            if idempotency_key and idempotency_key in self._idempotency:
                return self._orders[self._idempotency[idempotency_key]]
            left = self.seats_left(session_id)
            if left < count:
                raise SoldOut(left)
            self._seats[session_id] = left - count
            order_id = f"SQ-{datetime.now(UTC):%y%m%d}-{secrets.token_hex(3).upper()}"
            order = build_order(order_id)
            self._orders[order_id] = order
            if idempotency_key:
                self._idempotency[idempotency_key] = order_id
            return order

    def get_order(self, order_id: str) -> Order | None:
        return self._orders.get(order_id)

    def reset(self) -> None:
        self._seats.clear()
        self._orders.clear()
        self._idempotency.clear()


inventory = Inventory()
