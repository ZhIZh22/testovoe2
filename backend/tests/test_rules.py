from app.rules import check_participants, order_total, ticket_price


def codes(people, min_age=0):
    return {e.code for e in check_participants(people, min_age)}


def test_prices_by_age():
    assert ticket_price(13) == 1000
    assert ticket_price(14) == 2000
    assert order_total([35, 10, 14]) == 5000


def test_child_needs_adult_in_same_order():
    assert "child_without_adult" in codes([("Маша", 10)])
    assert "child_without_adult" in codes([("Маша", 10), ("Петя", 17)])
    assert codes([("Маша", 10), ("Анна", 18)]) == set()


def test_teen_can_go_alone():
    assert codes([("Петя", 15)]) == set()


def test_count_limits_and_fields():
    assert "participants_count" in codes([])
    assert "participants_count" in codes([("А", 30)] * 5)
    assert {"name_required", "age_invalid"} <= codes([(" ", 200)])


def test_event_age_restriction():
    assert "age_restricted" in codes([("Анна", 30), ("Маша", 5)], min_age=6)
