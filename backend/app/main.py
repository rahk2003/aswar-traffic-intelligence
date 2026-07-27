from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.assistant import router as assistant_router
from app.routes.locations import router as locations_router
from app.routes.satellite import router as satellite_router
from app.runtime import get_runtime_status


app = FastAPI(
    title="Advertising Location Intelligence API",
    description=(
        "Traffic and geospatial intelligence API "
        "for outdoor advertising locations."
    ),
    version="0.1.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_origin_regex=(
        r"^https?://(localhost|127\.0\.0\.1)"
        r"(?::\d+)?$"
    ),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(locations_router)
app.include_router(assistant_router)
app.include_router(satellite_router)


@app.get("/")
def root() -> dict[str, str]:
    return {
        "message": (
            "Advertising Location Intelligence API "
            "is running"
        )
    }


@app.get("/api/health")
def health_check() -> dict:
    runtime = get_runtime_status()

    return {
        "status": "ok",
        "mode": runtime.mode,
        "requested_mode": (
            runtime.requested_mode
        ),
        "services": runtime.services,
        "demo_reason": runtime.demo_reason,
    }
