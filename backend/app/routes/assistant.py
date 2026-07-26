from typing import Literal

from fastapi import APIRouter
from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
)

from app.services.assistant_service import (
    generate_assistant_explanation,
)


router = APIRouter(
    prefix="/api/assistant",
    tags=["Assistant"],
)


class AssistantFactor(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )

    key: Literal[
        "roadType",
        "roadDensity",
        "intersections",
        "services",
        "liveTraffic",
        "historicalVolume",
    ]
    score: float = Field(ge=0, le=100)
    weight: float | None = Field(
        default=None,
        ge=0,
        le=100,
    )


class AssistantSatelliteContext(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )

    acquisition_date: str | None = Field(
        default=None,
        max_length=50,
    )
    cloud_cover_percentage: float | None = (
        Field(
            default=None,
            ge=0,
            le=100,
        )
    )
    built_percentage: float | None = (
        Field(
            default=None,
            ge=0,
            le=100,
        )
    )
    bare_percentage: float | None = (
        Field(
            default=None,
            ge=0,
            le=100,
        )
    )
    vegetation_percentage: float | None = (
        Field(
            default=None,
            ge=0,
            le=100,
        )
    )
    water_percentage: float | None = (
        Field(
            default=None,
            ge=0,
            le=100,
        )
    )
    other_percentage: float | None = (
        Field(
            default=None,
            ge=0,
            le=100,
        )
    )
    probability_sum_percentage: float | None = (
        Field(
            default=None,
            ge=99.9,
            le=100.1,
        )
    )
    mean_top_probability_percentage: float | None = (
        Field(
            default=None,
            ge=0,
            le=100,
        )
    )
    mean_ndvi: float | None = Field(
        default=None,
        ge=-1,
        le=1,
    )
    mean_ndbi: float | None = Field(
        default=None,
        ge=-1,
        le=1,
    )
    mean_bsi: float | None = Field(
        default=None,
        ge=-1,
        le=1,
    )
    analysis_confidence: Literal[
        "high",
        "moderate",
        "low",
    ] | None = None
    is_estimated: bool = True


class AssistantAnalysis(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )

    latitude: float | None = Field(
        default=None,
        ge=-90,
        le=90,
    )
    longitude: float | None = Field(
        default=None,
        ge=-180,
        le=180,
    )
    radius_meters: int | None = Field(
        default=None,
        ge=250,
        le=2000,
    )
    traffic_score: float | None = Field(
        default=None,
        ge=0,
        le=100,
    )
    traffic_level: str | None = Field(
        default=None,
        max_length=80,
    )
    road_density_km_per_km2: float | None = Field(
        default=None,
        ge=0,
    )
    intersection_count: int | None = Field(
        default=None,
        ge=0,
    )
    nearby_services_count: int | None = Field(
        default=None,
        ge=0,
    )
    nearest_road_type: str | None = Field(
        default=None,
        max_length=80,
    )
    nearest_road_name: str | None = Field(
        default=None,
        max_length=200,
    )
    current_speed_kmph: float | None = Field(
        default=None,
        ge=0,
        le=400,
    )
    free_flow_speed_kmph: float | None = Field(
        default=None,
        ge=0,
        le=400,
    )
    congestion_index: float | None = Field(
        default=None,
        ge=0,
        le=1,
    )
    historical_volume_available: bool = False
    factors: list[AssistantFactor] = Field(
        default_factory=list,
        max_length=6,
    )
    satellite_context: (
        AssistantSatelliteContext | None
    ) = None


class AssistantExplainRequest(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )

    question: str = Field(
        min_length=1,
        max_length=500,
    )
    question_type: Literal[
        "why_score",
        "strongest_factor",
        "weakest_factor",
        "suitability",
        "improve",
        "satellite_context",
        "custom",
    ] = "custom"
    language: Literal["ar", "en"]
    analysis: AssistantAnalysis

    @field_validator("question")
    @classmethod
    def validate_question(
        cls,
        value: str,
    ) -> str:
        stripped = value.strip()

        if not stripped:
            raise ValueError(
                "Question cannot be empty"
            )

        return stripped


class AssistantExplainResponse(BaseModel):
    answer: str
    source: Literal["ollama", "local"]
    fallback_used: bool


@router.post(
    "/explain",
    response_model=AssistantExplainResponse,
)
def explain_analysis(
    request: AssistantExplainRequest,
) -> AssistantExplainResponse:
    result = generate_assistant_explanation(
        question=request.question,
        question_type=request.question_type,
        language=request.language,
        analysis=request.analysis.model_dump(),
    )

    return AssistantExplainResponse(
        **result,
    )
