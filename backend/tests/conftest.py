import pytest
from httpx import ASGITransport, AsyncClient

from app.config import settings
from app.main import app

settings.events_source = "mock"


@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
