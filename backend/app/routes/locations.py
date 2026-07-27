from typing import Any
from pydantic import BaseModel, Field
from app.services.live_point_analysis import (
    analyze_live_point,
)
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
)

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    Location,
    OSMSnapshot,
    TrafficReading,
)
from app.services.spatial_analysis import (
    get_spatial_metrics,
)
from app.services.traffic_scoring import (
    calculate_traffic_score,
)


router = APIRouter(
    prefix="/api/locations",
    tags=["Locations"],
)
class CompareLocationsRequest(BaseModel):
    location_a_id: int
    location_b_id: int
class AnalyzePointRequest(BaseModel):
    latitude: float = Field(
        ge=-90,
        le=90,
    )

    longitude: float = Field(
        ge=-180,
        le=180,
    )

    radius_meters: int = Field(
        default=500,
        ge=250,
        le=2000,
    )

def get_latest_traffic(
    database: Session,
    location_id: int,
) -> TrafficReading | None:
    return database.scalar(
        select(TrafficReading)
        .where(
            TrafficReading.location_id
            == location_id
        )
        .order_by(
            TrafficReading.collected_at.desc(),
            TrafficReading.id.desc(),
        )
        .limit(1)
    )


def get_latest_osm_snapshot(
    database: Session,
    location_id: int,
) -> OSMSnapshot | None:
    return database.scalar(
        select(OSMSnapshot)
        .where(
            OSMSnapshot.location_id
            == location_id
        )
        .order_by(
            OSMSnapshot.collected_at.desc(),
            OSMSnapshot.id.desc(),
        )
        .limit(1)
    )


def calculate_location_score(
    database: Session,
    location: Location,
    latest_traffic: TrafficReading | None,
) -> tuple[
    dict[str, Any] | None,
    dict[str, Any] | None,
]:
    spatial_data = get_spatial_metrics(
        database=database,
        location_id=location.id,
    )

    if spatial_data is None:
        return None, None

    congestion_index = 0.0

    if (
        latest_traffic is not None
        and latest_traffic.congestion_index
        is not None
    ):
        congestion_index = float(
            latest_traffic.congestion_index
        )

    traffic_score_data = calculate_traffic_score(
        road_type_score=spatial_data[
            "road_type_score"
        ],
        road_density_km_per_km2=spatial_data[
            "road_density_km_per_km2"
        ],
        intersection_count=spatial_data[
            "intersection_count"
        ],
        nearby_services_count=spatial_data[
            "nearby_services_count"
        ],
        congestion_index=congestion_index,
        vehicle_count_24h=(
            location.vehicle_count_24h
        ),
    )

    return spatial_data, traffic_score_data


@router.get("/ranking")
def get_locations_ranking(
    database: Session = Depends(get_db),
) -> dict:
    """
    Rank locations that have official 24-hour vehicle
    counts. Context-only locations are returned separately.
    """

    locations = database.scalars(
        select(Location).order_by(Location.id)
    ).all()

    ranked_locations = []
    context_only_locations = []
    unavailable_locations = []

    for location in locations:
        latest_traffic = get_latest_traffic(
            database=database,
            location_id=location.id,
        )

        spatial_data, score_data = (
            calculate_location_score(
                database=database,
                location=location,
                latest_traffic=latest_traffic,
            )
        )

        if (
            spatial_data is None
            or score_data is None
        ):
            unavailable_locations.append(
                {
                    "location_id": location.id,
                    "location_name": location.name,
                    "reason": (
                        "Spatial analysis data "
                        "is unavailable"
                    ),
                }
            )
            continue

        location_result = {
            "location_id": location.id,
            "location_name": location.name,
            "latitude": location.latitude,
            "longitude": location.longitude,
            "road_number": location.road_number,
            "vehicle_count_24h": (
                location.vehicle_count_24h
            ),
            "data_from": location.data_from,
            "data_to": location.data_to,
            "traffic_data_source": (
                location.traffic_data_source
            ),
            "nearest_road_type": spatial_data[
                "nearest_road_type"
            ],
            "nearest_road_name": spatial_data[
                "nearest_road_name"
            ],
            "road_density_km_per_km2": (
                spatial_data[
                    "road_density_km_per_km2"
                ]
            ),
            "intersection_count": spatial_data[
                "intersection_count"
            ],
            "nearby_services_count": spatial_data[
                "nearby_services_count"
            ],
            "current_speed_kmph": (
                latest_traffic.current_speed_kmph
                if latest_traffic is not None
                else None
            ),
            "free_flow_speed_kmph": (
                latest_traffic.free_flow_speed_kmph
                if latest_traffic is not None
                else None
            ),
            "congestion_index": (
                latest_traffic.congestion_index
                if latest_traffic is not None
                else None
            ),
            "historical_volume_score": score_data[
                "historical_volume_score"
            ],
            "score_method": score_data[
                "score_method"
            ],
            "traffic_score": score_data[
                "traffic_score"
            ],
            "traffic_level": score_data[
                "traffic_level"
            ],
        }

        if score_data[
            "historical_volume_available"
        ]:
            ranked_locations.append(
                location_result
            )
        else:
            context_only_locations.append(
                location_result
            )

    ranked_locations.sort(
        key=lambda item: item["traffic_score"],
        reverse=True,
    )

    context_only_locations.sort(
        key=lambda item: item["traffic_score"],
        reverse=True,
    )

    for rank, location_result in enumerate(
        ranked_locations,
        start=1,
    ):
        location_result["rank"] = rank

    return {
        "ranking_basis": (
            "Official 24-hour vehicle volume, "
            "road characteristics, spatial context, "
            "and live traffic conditions"
        ),
        "ranking_note": (
            "Context-only locations are separated "
            "because they use a different scoring method."
        ),
        "total_ranked_locations": len(
            ranked_locations
        ),
        "ranked_locations": ranked_locations,
        "total_context_only_locations": len(
            context_only_locations
        ),
        "context_only_locations": (
            context_only_locations
        ),
        "unavailable_locations": (
            unavailable_locations
        ),
    }

@router.post("/compare")
def compare_locations(
    request: CompareLocationsRequest,
    database: Session = Depends(get_db),
) -> dict:
    """
    Compare the Traffic Score and spatial characteristics
    of two stored locations.
    """

    if request.location_a_id <= 0:
        raise HTTPException(
            status_code=400,
            detail="location_a_id must be greater than zero",
        )

    if request.location_b_id <= 0:
        raise HTTPException(
            status_code=400,
            detail="location_b_id must be greater than zero",
        )

    if request.location_a_id == request.location_b_id:
        raise HTTPException(
            status_code=400,
            detail="Please select two different locations",
        )

    location_a = database.get(
        Location,
        request.location_a_id,
    )

    location_b = database.get(
        Location,
        request.location_b_id,
    )

    if location_a is None:
        raise HTTPException(
            status_code=404,
            detail=(
                f"Location {request.location_a_id} "
                "was not found"
            ),
        )

    if location_b is None:
        raise HTTPException(
            status_code=404,
            detail=(
                f"Location {request.location_b_id} "
                "was not found"
            ),
        )

    latest_traffic_a = get_latest_traffic(
        database=database,
        location_id=location_a.id,
    )

    latest_traffic_b = get_latest_traffic(
        database=database,
        location_id=location_b.id,
    )

    spatial_a, score_a = calculate_location_score(
        database=database,
        location=location_a,
        latest_traffic=latest_traffic_a,
    )

    spatial_b, score_b = calculate_location_score(
        database=database,
        location=location_b,
        latest_traffic=latest_traffic_b,
    )

    if spatial_a is None or score_a is None:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Spatial analysis is unavailable "
                f"for location {location_a.id}"
            ),
        )

    if spatial_b is None or score_b is None:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Spatial analysis is unavailable "
                f"for location {location_b.id}"
            ),
        )

    location_a_result = {
        "location_id": location_a.id,
        "location_name": location_a.name,
        "latitude": location_a.latitude,
        "longitude": location_a.longitude,
        "road_number": location_a.road_number,
        "vehicle_count_24h": (
            location_a.vehicle_count_24h
        ),
        "nearest_road_type": spatial_a[
            "nearest_road_type"
        ],
        "nearest_road_name": spatial_a[
            "nearest_road_name"
        ],
        "road_density_km_per_km2": spatial_a[
            "road_density_km_per_km2"
        ],
        "intersection_count": spatial_a[
            "intersection_count"
        ],
        "nearby_services_count": spatial_a[
            "nearby_services_count"
        ],
        "congestion_index": (
            latest_traffic_a.congestion_index
            if latest_traffic_a is not None
            else None
        ),
        "score_method": score_a[
            "score_method"
        ],
        "traffic_score": score_a[
            "traffic_score"
        ],
        "traffic_level": score_a[
            "traffic_level"
        ],
    }

    location_b_result = {
        "location_id": location_b.id,
        "location_name": location_b.name,
        "latitude": location_b.latitude,
        "longitude": location_b.longitude,
        "road_number": location_b.road_number,
        "vehicle_count_24h": (
            location_b.vehicle_count_24h
        ),
        "nearest_road_type": spatial_b[
            "nearest_road_type"
        ],
        "nearest_road_name": spatial_b[
            "nearest_road_name"
        ],
        "road_density_km_per_km2": spatial_b[
            "road_density_km_per_km2"
        ],
        "intersection_count": spatial_b[
            "intersection_count"
        ],
        "nearby_services_count": spatial_b[
            "nearby_services_count"
        ],
        "congestion_index": (
            latest_traffic_b.congestion_index
            if latest_traffic_b is not None
            else None
        ),
        "score_method": score_b[
            "score_method"
        ],
        "traffic_score": score_b[
            "traffic_score"
        ],
        "traffic_level": score_b[
            "traffic_level"
        ],
    }

    traffic_score_a = float(
        score_a["traffic_score"]
    )

    traffic_score_b = float(
        score_b["traffic_score"]
    )

    same_scoring_method = (
        score_a["score_method"]
        == score_b["score_method"]
    )

    recommended_location = None
    comparison_result = "Different scoring methods"

    if same_scoring_method:
        if traffic_score_a > traffic_score_b:
            recommended_location = {
                "location_id": location_a.id,
                "location_name": location_a.name,
            }
            comparison_result = (
                f"{location_a.name} has the higher "
                "Traffic Score"
            )

        elif traffic_score_b > traffic_score_a:
            recommended_location = {
                "location_id": location_b.id,
                "location_name": location_b.name,
            }
            comparison_result = (
                f"{location_b.name} has the higher "
                "Traffic Score"
            )

        else:
            comparison_result = (
                "Both locations have the same "
                "Traffic Score"
            )

    return {
        "location_a": location_a_result,
        "location_b": location_b_result,
        "score_difference": round(
            abs(
                traffic_score_a
                - traffic_score_b
            ),
            2,
        ),
        "same_scoring_method": same_scoring_method,
        "recommended_location": recommended_location,
        "comparison_result": comparison_result,
        "comparison_note": (
            "A direct recommendation is made only "
            "when both locations use the same "
            "Traffic Score method."
        ),
    }
    
@router.post("/analyze-point")
def analyze_point(
    request: AnalyzePointRequest,
) -> dict:
    """
    Analyze any point selected from the map using
    live OpenStreetMap and TomTom data.
    """

    try:
        return analyze_live_point(
            latitude=request.latitude,
            longitude=request.longitude,
            radius_meters=request.radius_meters,
        )

    except RuntimeError as error:
        raise HTTPException(
            status_code=502,
            detail=str(error),
        ) from error
@router.get("/{location_id}/summary")
def get_location_summary(
    location_id: int,
    database: Session = Depends(get_db),
) -> dict:
    """
    Return location information, the latest TomTom
    reading, OpenStreetMap snapshot, spatial metrics,
    and Traffic Score.
    """

    location = database.get(
        Location,
        location_id,
    )

    if location is None:
        raise HTTPException(
            status_code=404,
            detail="Location not found",
        )

    latest_traffic = get_latest_traffic(
        database=database,
        location_id=location_id,
    )

    latest_osm = get_latest_osm_snapshot(
        database=database,
        location_id=location_id,
    )

    traffic_data = None

    if latest_traffic is not None:
        traffic_data = {
            "collected_at": (
                latest_traffic.collected_at
            ),
            "road_class": (
                latest_traffic.road_class
            ),
            "current_speed_kmph": (
                latest_traffic.current_speed_kmph
            ),
            "free_flow_speed_kmph": (
                latest_traffic.free_flow_speed_kmph
            ),
            "speed_drop_percent": (
                latest_traffic.speed_drop_percent
            ),
            "congestion_index": (
                latest_traffic.congestion_index
            ),
            "current_travel_time_seconds": (
                latest_traffic
                .current_travel_time_seconds
            ),
            "free_flow_travel_time_seconds": (
                latest_traffic
                .free_flow_travel_time_seconds
            ),
            "traffic_delay_seconds": (
                latest_traffic
                .traffic_delay_seconds
            ),
            "confidence": (
                latest_traffic.confidence
            ),
            "road_closed": (
                latest_traffic.road_closed
            ),
        }

    osm_data = None

    if latest_osm is not None:
        osm_data = {
            "collected_at": (
                latest_osm.collected_at
            ),
            "radius_meters": (
                latest_osm.radius_meters
            ),
            "total_elements": (
                latest_osm.total_elements
            ),
            "roads_count": (
                latest_osm.roads_count
            ),
            "traffic_signals_count": (
                latest_osm
                .traffic_signals_count
            ),
            "amenities_count": (
                latest_osm.amenities_count
            ),
            "shops_count": (
                latest_osm.shops_count
            ),
            "tourism_places_count": (
                latest_osm
                .tourism_places_count
            ),
            "road_types": (
                latest_osm.road_types
            ),
            "amenity_types": (
                latest_osm.amenity_types
            ),
            "shop_types": (
                latest_osm.shop_types
            ),
            "tourism_types": (
                latest_osm.tourism_types
            ),
        }

    spatial_data, traffic_score_data = (
        calculate_location_score(
            database=database,
            location=location,
            latest_traffic=latest_traffic,
        )
    )

    return {
        "location": {
            "id": location.id,
            "name": location.name,
            "latitude": location.latitude,
            "longitude": location.longitude,
            "road_number": location.road_number,
            "vehicle_count_24h": (
                location.vehicle_count_24h
            ),
            "data_from": location.data_from,
            "data_to": location.data_to,
            "traffic_data_source": (
                location.traffic_data_source
            ),
        },
        "latest_traffic": traffic_data,
        "latest_osm_snapshot": osm_data,
        "spatial_analysis": spatial_data,
        "traffic_score": traffic_score_data,
    }
