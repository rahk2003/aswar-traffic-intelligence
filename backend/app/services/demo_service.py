import json
from functools import lru_cache
from math import asin, cos, radians, sin, sqrt
from pathlib import Path
from typing import Any
from urllib.parse import urlencode

from app.services.traffic_scoring import (
    calculate_traffic_score,
)


DATA_DIR = (
    Path(__file__).resolve().parents[2]
    / "data"
)
DEMO_LOCATIONS_FILE = (
    DATA_DIR / "demo_locations.json"
)
DEMO_SATELLITE_FILE = (
    DATA_DIR / "demo_satellite.svg"
)
DEMO_SOURCE_STATUS = {
    "database": "demo",
    "openstreetmap": "demo",
    "tomtom": "demo",
    "satellite": "demo",
}
TRAFFIC_LEVEL_CODES = {
    "Very High": "very_high",
    "High": "high",
    "Moderate": "moderate",
    "Low": "low",
}


@lru_cache(maxsize=1)
def load_demo_locations() -> list[
    dict[str, Any]
]:
    with DEMO_LOCATIONS_FILE.open(
        "r",
        encoding="utf-8",
    ) as file:
        data = json.load(file)

    if not isinstance(data, list):
        raise RuntimeError(
            "Demo location data is invalid."
        )

    return data


def _distance_km(
    latitude_a: float,
    longitude_a: float,
    latitude_b: float,
    longitude_b: float,
) -> float:
    earth_radius_km = 6371.0088
    latitude_delta = radians(
        latitude_b - latitude_a
    )
    longitude_delta = radians(
        longitude_b - longitude_a
    )
    first_latitude = radians(latitude_a)
    second_latitude = radians(latitude_b)
    haversine = (
        sin(latitude_delta / 2) ** 2
        + cos(first_latitude)
        * cos(second_latitude)
        * sin(longitude_delta / 2) ** 2
    )

    return (
        2
        * earth_radius_km
        * asin(sqrt(haversine))
    )


def select_demo_location(
    latitude: float,
    longitude: float,
) -> dict[str, Any]:
    return min(
        load_demo_locations(),
        key=lambda location: _distance_km(
            latitude,
            longitude,
            float(location["latitude"]),
            float(location["longitude"]),
        ),
    )


def _score_for(
    location: dict[str, Any],
) -> dict[str, Any]:
    score = calculate_traffic_score(
        road_type_score=float(
            location["road_type_score"]
        ),
        road_density_km_per_km2=float(
            location["road_density"]
        ),
        intersection_count=int(
            location["intersection_count"]
        ),
        nearby_services_count=int(
            location["nearby_services"]
        ),
        congestion_index=float(
            location["congestion_index"]
        ),
        vehicle_count_24h=None,
    )

    return {
        **score,
        "traffic_level_code": (
            TRAFFIC_LEVEL_CODES.get(
                score["traffic_level"],
                "unknown",
            )
        ),
    }


def build_demo_analysis(
    latitude: float,
    longitude: float,
    radius_meters: int,
) -> dict[str, Any]:
    location = select_demo_location(
        latitude,
        longitude,
    )
    current_speed = location[
        "current_speed_kmph"
    ]
    free_flow_speed = location[
        "free_flow_speed_kmph"
    ]
    congestion_index = float(
        location["congestion_index"]
    )

    return {
        "analysis_type": "demo_point",
        "analysis_status": "demo",
        "analysis_duration_seconds": (
            location["analysis_duration"]
        ),
        "analysis_duration": (
            location["analysis_duration"]
        ),
        "data_mode": "demo",
        "is_demo": True,
        "source_status": dict(
            DEMO_SOURCE_STATUS
        ),
        "demo_scenario": location[
            "scenario"
        ],
        "data_warnings": [],
        "requested_point": {
            "latitude": latitude,
            "longitude": longitude,
            "radius_meters": radius_meters,
        },
        "spatial_analysis": {
            "source": "Demo sample data",
            "radius_meters": radius_meters,
            "road_density_km_per_km2": (
                location["road_density"]
            ),
            "intersection_count": (
                location["intersection_count"]
            ),
            "traffic_signals_count": (
                location[
                    "traffic_signals_count"
                ]
            ),
            "nearby_services_count": (
                location["nearby_services"]
            ),
            "nearest_road_type": (
                location[
                    "nearest_road_type"
                ]
            ),
            "nearest_road_name": (
                location[
                    "nearest_road_name"
                ]
            ),
            "nearest_road_name_ar": (
                location[
                    "nearest_road_name_ar"
                ]
            ),
            "nearest_road_name_en": (
                location[
                    "nearest_road_name_en"
                ]
            ),
            "nearest_road_distance_meters": (
                24.0
                if location[
                    "nearest_road_type"
                ]
                else None
            ),
            "road_type_score": (
                location["road_type_score"]
            ),
            "road_type_score_reason": (
                "demo_sample"
            ),
            "amenity_types": dict(
                location["amenity_types"]
            ),
            "shop_types": dict(
                location["shop_types"]
            ),
            "tourism_types": dict(
                location["tourism_types"]
            ),
        },
        "live_traffic": {
            "source": "Demo sample data",
            "current_speed_kmph": (
                current_speed
            ),
            "free_flow_speed_kmph": (
                free_flow_speed
            ),
            "speed_drop_percent": round(
                congestion_index * 100,
                2,
            ),
            "congestion_index": (
                congestion_index
            ),
            "current_travel_time_seconds": (
                None
            ),
            "free_flow_travel_time_seconds": (
                None
            ),
            "traffic_delay_seconds": None,
            "confidence": None,
            "road_closed": False,
        },
        "traffic_score": _score_for(
            location
        ),
        "data_note": (
            "This is clearly labeled sample data "
            "for Demo Mode. It is not a live "
            "OpenStreetMap or TomTom result."
        ),
    }


def build_demo_satellite_context(
    latitude: float,
    longitude: float,
    radius_meters: int,
) -> dict[str, Any]:
    location = select_demo_location(
        latitude,
        longitude,
    )
    satellite = location["satellite"]
    query = urlencode(
        {
            "latitude": latitude,
            "longitude": longitude,
            "radius_meters": radius_meters,
        }
    )

    return {
        "status": "demo",
        "message": (
            "Sample satellite context is displayed "
            "because Earth Engine is not being used "
            "in Demo Mode."
        ),
        "data_mode": "demo",
        "is_demo": True,
        "source_status": dict(
            DEMO_SOURCE_STATUS
        ),
        "requested_point": {
            "latitude": latitude,
            "longitude": longitude,
            "radius_meters": radius_meters,
        },
        "imagery": {
            "acquisition_date": "2026-07-15",
            "cloud_cover_percentage": 8.0,
            "resolution_meters": 10,
            "collection": (
                "Saved Demo Satellite Sample"
            ),
            "scene_id": (
                "demo-satellite-context"
            ),
            "search_period_days": 1,
            "preview_url": (
                "/api/satellite/preview?"
                + query
            ),
        },
        "land_context": {
            "built_percentage": (
                satellite["built"]
            ),
            "bare_percentage": (
                satellite["bare"]
            ),
            "vegetation_percentage": (
                satellite["vegetation"]
            ),
            "water_percentage": (
                satellite["water"]
            ),
            "other_percentage": (
                satellite["other"]
            ),
            "probability_sum_percentage": (
                100.0
            ),
            "valid_pixel_percentage": 100.0,
            "masked_pixel_percentage": 0.0,
        },
        "spectral_indices": {
            "mean_ndvi": satellite["ndvi"],
            "mean_ndbi": satellite["ndbi"],
            "mean_bsi": satellite["bsi"],
        },
        "quality": {
            "analysis_confidence": (
                satellite["confidence"]
            ),
            "mean_top_probability_percentage": (
                satellite[
                    "mean_top_probability"
                ]
            ),
            "classification_acquisition_date": (
                "2026-07-15"
            ),
            "matched_preview_date": True,
            "model_image_count": 1,
            "limitations": [
                (
                    "This is a saved Demo Mode "
                    "example, not a live Earth Engine "
                    "classification."
                )
            ],
        },
        "source": {
            "provider": "Demo sample",
            "dataset": (
                "Saved land-cover probabilities"
            ),
            "supporting_provider": (
                "Demo sample"
            ),
            "supporting_dataset": (
                "Saved satellite preview"
            ),
        },
        "is_estimated": True,
    }


def build_demo_ranking() -> dict[str, Any]:
    ranked_locations = []

    for rank, location in enumerate(
        sorted(
            load_demo_locations(),
            key=lambda item: _score_for(
                item
            )["traffic_score"],
            reverse=True,
        ),
        start=1,
    ):
        score = _score_for(location)
        ranked_locations.append(
            {
                "rank": rank,
                "location_id": location["id"],
                "location_name": location["name"],
                "latitude": location["latitude"],
                "longitude": location["longitude"],
                "vehicle_count_24h": None,
                "nearest_road_type": (
                    location[
                        "nearest_road_type"
                    ]
                ),
                "nearest_road_name": (
                    location[
                        "nearest_road_name"
                    ]
                ),
                "road_density_km_per_km2": (
                    location["road_density"]
                ),
                "intersection_count": (
                    location[
                        "intersection_count"
                    ]
                ),
                "nearby_services_count": (
                    location[
                        "nearby_services"
                    ]
                ),
                "congestion_index": (
                    location[
                        "congestion_index"
                    ]
                ),
                "score_method": (
                    score["score_method"]
                ),
                "traffic_score": (
                    score["traffic_score"]
                ),
                "traffic_level": (
                    score["traffic_level"]
                ),
                "data_mode": "demo",
                "is_demo": True,
            }
        )

    return {
        "ranking_basis": (
            "Clearly labeled sample locations "
            "for Demo Mode"
        ),
        "ranking_note": (
            "Demo data is not live traffic data."
        ),
        "total_ranked_locations": len(
            ranked_locations
        ),
        "ranked_locations": (
            ranked_locations
        ),
        "total_context_only_locations": 0,
        "context_only_locations": [],
        "unavailable_locations": [],
        "data_mode": "demo",
        "is_demo": True,
        "source_status": dict(
            DEMO_SOURCE_STATUS
        ),
    }


def get_demo_location_by_id(
    location_id: int,
) -> dict[str, Any] | None:
    return next(
        (
            location
            for location in load_demo_locations()
            if location["id"] == location_id
        ),
        None,
    )


def build_demo_summary(
    location_id: int,
) -> dict[str, Any] | None:
    location = get_demo_location_by_id(
        location_id
    )

    if location is None:
        return None

    analysis = build_demo_analysis(
        latitude=float(location["latitude"]),
        longitude=float(
            location["longitude"]
        ),
        radius_meters=500,
    )

    return {
        "location": {
            "id": location["id"],
            "name": location["name"],
            "latitude": location["latitude"],
            "longitude": (
                location["longitude"]
            ),
            "road_number": None,
            "vehicle_count_24h": None,
            "data_from": None,
            "data_to": None,
            "traffic_data_source": (
                "Demo sample data"
            ),
        },
        "latest_traffic": (
            analysis["live_traffic"]
        ),
        "latest_osm_snapshot": None,
        "spatial_analysis": (
            analysis["spatial_analysis"]
        ),
        "traffic_score": (
            analysis["traffic_score"]
        ),
        "data_mode": "demo",
        "is_demo": True,
        "source_status": dict(
            DEMO_SOURCE_STATUS
        ),
    }


def _comparison_location(
    location: dict[str, Any],
) -> dict[str, Any]:
    analysis = build_demo_analysis(
        latitude=float(location["latitude"]),
        longitude=float(
            location["longitude"]
        ),
        radius_meters=500,
    )
    spatial = analysis["spatial_analysis"]
    traffic = analysis["live_traffic"]
    score = analysis["traffic_score"]

    return {
        "location_id": location["id"],
        "location_name": location["name"],
        "latitude": location["latitude"],
        "longitude": location["longitude"],
        "road_number": None,
        "vehicle_count_24h": None,
        "nearest_road_type": (
            spatial["nearest_road_type"]
        ),
        "nearest_road_name": (
            spatial["nearest_road_name"]
        ),
        "road_density_km_per_km2": (
            spatial[
                "road_density_km_per_km2"
            ]
        ),
        "intersection_count": (
            spatial["intersection_count"]
        ),
        "nearby_services_count": (
            spatial[
                "nearby_services_count"
            ]
        ),
        "congestion_index": (
            traffic["congestion_index"]
        ),
        "score_method": (
            score["score_method"]
        ),
        "traffic_score": (
            score["traffic_score"]
        ),
        "traffic_level": (
            score["traffic_level"]
        ),
        "data_mode": "demo",
        "is_demo": True,
    }


def build_demo_comparison(
    location_a_id: int,
    location_b_id: int,
) -> dict[str, Any] | None:
    location_a = get_demo_location_by_id(
        location_a_id
    )
    location_b = get_demo_location_by_id(
        location_b_id
    )

    if (
        location_a is None
        or location_b is None
    ):
        return None

    result_a = _comparison_location(
        location_a
    )
    result_b = _comparison_location(
        location_b
    )
    score_a = float(
        result_a["traffic_score"]
    )
    score_b = float(
        result_b["traffic_score"]
    )
    recommended_location = None

    if score_a != score_b:
        winner = (
            result_a
            if score_a > score_b
            else result_b
        )
        recommended_location = {
            "location_id": (
                winner["location_id"]
            ),
            "location_name": (
                winner["location_name"]
            ),
        }

    return {
        "location_a": result_a,
        "location_b": result_b,
        "score_difference": round(
            abs(score_a - score_b),
            2,
        ),
        "same_scoring_method": True,
        "recommended_location": (
            recommended_location
        ),
        "comparison_result": (
            "Demo comparison using clearly "
            "labeled sample data"
        ),
        "comparison_note": (
            "Demo results are not live traffic "
            "measurements."
        ),
        "data_mode": "demo",
        "is_demo": True,
        "source_status": dict(
            DEMO_SOURCE_STATUS
        ),
    }
