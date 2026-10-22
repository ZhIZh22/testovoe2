import logging
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .config import settings
from .routers import events, orders

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="Оформление билетов", version="0.1.0")
app.add_middleware(
    CORSMiddleware, allow_origins=settings.cors_origins, allow_methods=["*"], allow_headers=["*"]
)
app.include_router(events.router)
app.include_router(orders.router)


@app.get("/api/health")
async def health():
    return {"ok": True}


# В production-образе собранный фронтенд лежит рядом, и API отдаёт его сам.
STATIC = Path(settings.static_dir).resolve()
if (STATIC / "index.html").exists():
    app.mount("/assets", StaticFiles(directory=STATIC / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    async def spa(path: str):
        if path.startswith("api/"):
            raise HTTPException(404)
        file = STATIC / path
        if path and file.is_file() and STATIC in file.resolve().parents:
            return FileResponse(file)
        return FileResponse(STATIC / "index.html")
