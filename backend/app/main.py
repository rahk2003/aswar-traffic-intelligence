from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.locations import router as locations_router


app = FastAPI(
    title="Aswar Traffic Intelligence API",
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
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(locations_router)


@app.get("/")
def root() -> dict[str, str]:
    return {
        "message": (
            "Aswar Traffic Intelligence API is running"
        )
    }


@app.get("/api/health")
def health_check() -> dict[str, str]:
    return {
        "status": "ok"
    }