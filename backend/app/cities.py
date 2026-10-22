from .schemas import City

# slug — как в KudaGo
CITIES: list[City] = [
    City(slug="msk", name="Москва", timezone="Europe/Moscow"),
    City(slug="spb", name="Санкт-Петербург", timezone="Europe/Moscow"),
    City(slug="kzn", name="Казань", timezone="Europe/Moscow"),
    City(slug="ekb", name="Екатеринбург", timezone="Asia/Yekaterinburg"),
    City(slug="nsk", name="Новосибирск", timezone="Asia/Novosibirsk"),
    City(slug="nnv", name="Нижний Новгород", timezone="Europe/Moscow"),
    City(slug="krd", name="Краснодар", timezone="Europe/Moscow"),
    City(slug="sochi", name="Сочи", timezone="Europe/Moscow"),
]
CITY_BY_SLUG = {c.slug: c for c in CITIES}
