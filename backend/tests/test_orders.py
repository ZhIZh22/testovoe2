import asyncio

from app.inventory import inventory

ADULT = {"name": "Анна", "age": 34}
CHILD = {"name": "Маша", "age": 9}


async def session_with(client, seats_wanted):
    data = (await client.get("/api/events", params={"city": "msk"})).json()
    for e in data["events"]:
        for s in e["sessions"]:
            if s["seats_left"] == seats_wanted:
                return e, s
    raise AssertionError(f"нет сеанса с {seats_wanted} местами")


async def test_success_order(client):
    event, session = await session_with(client, 40)
    r = await client.post(
        "/api/orders",
        json={
            "session_id": session["id"],
            "email": "anna@example.com",
            "participants": [ADULT, CHILD],
        },
    )
    assert r.status_code == 201
    order = r.json()
    assert order["total"] == 3000
    assert [x["ticket"] for x in order["lines"]] == ["full", "child"]
    detail = (await client.get(f"/api/events/{event['id']}")).json()
    left = next(s for s in detail["sessions"] if s["id"] == session["id"])["seats_left"]
    assert left == 38


async def test_rules_checked_on_server(client):
    _, session = await session_with(client, 120)
    r = await client.post(
        "/api/orders",
        json={"session_id": session["id"], "email": "a@example.com", "participants": [CHILD]},
    )
    assert r.status_code == 422
    assert r.json()["detail"]["errors"][0]["code"] == "child_without_adult"


async def test_sold_out_and_idempotency(client):
    _, session = await session_with(client, 2)
    body = {"session_id": session["id"], "email": "a@example.com", "participants": [ADULT]}
    first = await client.post("/api/orders", json=body, headers={"Idempotency-Key": "k1"})
    repeat = await client.post("/api/orders", json=body, headers={"Idempotency-Key": "k1"})
    assert first.json()["id"] == repeat.json()["id"]
    assert inventory.seats_left(session["id"]) == 1

    r = await client.post("/api/orders", json={**body, "participants": [ADULT, ADULT]})
    assert r.status_code == 409
    assert r.json()["detail"] == {
        "code": "sold_out",
        "seats_left": 1,
        "message": "Пока вы оформляли заказ, места закончились",
    }


async def test_race_for_last_seats(client):
    _event, session = await session_with(client, 3)
    body = {"session_id": session["id"], "email": "a@example.com", "participants": [ADULT, ADULT]}
    results = await asyncio.gather(*[client.post("/api/orders", json=body) for _ in range(5)])
    assert sorted(r.status_code for r in results) == [201, 409, 409, 409, 409]
    assert inventory.seats_left(session["id"]) == 1
