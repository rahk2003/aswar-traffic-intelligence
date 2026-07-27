from typing import Literal

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    Response,
)
from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
)

from app.config import (
    DynamicWorldSettings,
    SatelliteSettings,
)
from app.services.dynamic_world_service import (
    DynamicWorldService,
)
from app.services.satellite_service import (
    SatelliteNoImageryError,
    SatelliteNotConfiguredError,
    SatelliteService,
    SatelliteServiceError,
)
from app.runtime import is_demo_mode
from app.services.demo_service import (
    DEMO_SATELLITE_FILE,
    build_demo_satellite_context,
)


router = APIRouter(
    prefix="/api/satellite",
    tags=["Satellite"],
)

_satellite_service = SatelliteService(
    SatelliteSettings.from_environment(),
    dynamic_world_service=DynamicWorldService(
        DynamicWorldSettings
        .from_environment()
    ),
)


def get_satellite_service() -> SatelliteService:
    return _satellite_service


class RequestedPoint(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )

    latitude: float = Field(
        ge=-90,
        le=90,
    )
    longitude: float = Field(
        ge=-180,
        le=180,
    )
    radius_meters: int = Field(
        ge=100,
        le=2000,
    )


class SatelliteImagery(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )

    acquisition_date: str
    cloud_cover_percentage: float = Field(
        ge=0,
        le=100,
    )
    resolution_meters: int = Field(gt=0)
    collection: str
    scene_id: str | None = None
    search_period_days: int = Field(
        ge=1,
        le=365,
    )
    preview_url: str


class LandContext(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )

    built_percentage: float = (
        Field(ge=0, le=100)
    )
    bare_percentage: float = (
        Field(ge=0, le=100)
    )
    vegetation_percentage: float = (
        Field(ge=0, le=100)
    )
    water_percentage: float = (
        Field(ge=0, le=100)
    )
    other_percentage: float = (
        Field(ge=0, le=100)
    )
    probability_sum_percentage: float = Field(
        ge=99.9,
        le=100.1,
    )
    valid_pixel_percentage: float = Field(
        ge=0,
        le=100,
    )
    masked_pixel_percentage: float = Field(
        ge=0,
        le=100,
    )


class SpectralIndices(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )

    mean_ndvi: float = Field(ge=-1, le=1)
    mean_ndbi: float = Field(ge=-1, le=1)
    mean_bsi: float = Field(ge=-1, le=1)


class SatelliteQuality(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )

    analysis_confidence: Literal[
        "high",
        "moderate",
        "low",
    ]
    mean_top_probability_percentage: float = Field(
        ge=0,
        le=100,
    )
    classification_acquisition_date: str
    matched_preview_date: bool
    model_image_count: int = Field(ge=1)
    limitations: list[str] = Field(
        default_factory=list,
        max_length=8,
    )


class SatelliteSource(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )

    provider: str
    dataset: str
    supporting_provider: str
    supporting_dataset: str


class SatelliteContextResponse(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )

    status: Literal[
        "available",
        "demo",
        "not_configured",
        "no_imagery",
        "temporarily_unavailable",
    ]
    message: str | None = None
    requested_point: RequestedPoint | None = None
    imagery: SatelliteImagery | None = None
    land_context: LandContext | None = None
    spectral_indices: SpectralIndices | None = None
    quality: SatelliteQuality | None = None
    source: SatelliteSource | None = None
    is_estimated: bool | None = None
    data_mode: Literal[
        "demo",
        "live",
    ] | None = None
    is_demo: bool = False
    source_status: dict[str, str] | None = None


@router.get(
    "/context",
    response_model=SatelliteContextResponse,
    response_model_exclude_none=True,
)
async def satellite_context(
    latitude: float = Query(
        ge=-90,
        le=90,
    ),
    longitude: float = Query(
        ge=-180,
        le=180,
    ),
    radius_meters: int = Query(
        ge=100,
        le=2000,
    ),
    service: SatelliteService = Depends(
        get_satellite_service
    ),
) -> SatelliteContextResponse:
    if is_demo_mode():
        return SatelliteContextResponse(
            **build_demo_satellite_context(
                latitude=latitude,
                longitude=longitude,
                radius_meters=radius_meters,
            )
        )

    result = await service.get_context(
        latitude=latitude,
        longitude=longitude,
        radius_meters=radius_meters,
    )

    return SatelliteContextResponse(
        **result
    )


@router.get(
    "/preview",
    responses={
        200: {
            "content": {
                "image/png": {},
            },
            "description": (
                "Cached Sentinel-2 true-color preview"
            ),
        }
    },
)
async def satellite_preview(
    latitude: float = Query(
        ge=-90,
        le=90,
    ),
    longitude: float = Query(
        ge=-180,
        le=180,
    ),
    radius_meters: int = Query(
        ge=100,
        le=2000,
    ),
    service: SatelliteService = Depends(
        get_satellite_service
    ),
) -> Response:
    if is_demo_mode():
        return Response(
            content=(
                DEMO_SATELLITE_FILE
                .read_bytes()
            ),
            media_type="image/svg+xml",
            headers={
                "Cache-Control": (
                    "public, max-age=21600"
                ),
                "X-Data-Mode": "demo",
            },
        )

    try:
        preview = await service.get_preview(
            latitude=latitude,
            longitude=longitude,
            radius_meters=radius_meters,
        )
    except SatelliteNotConfiguredError as error:
        raise HTTPException(
            status_code=503,
            detail=str(error),
        ) from None
    except SatelliteNoImageryError as error:
        raise HTTPException(
            status_code=404,
            detail=str(error),
        ) from None
    except SatelliteServiceError:
        raise HTTPException(
            status_code=503,
            detail=(
                "Satellite preview is "
                "temporarily unavailable."
            ),
        ) from None

    return Response(
        content=preview,
        media_type="image/png",
        headers={
            "Cache-Control": (
                "public, max-age=21600"
            ),
        },
    )
