from typing import TypedDict


VEHICLE_COUNT_REFERENCE_24H = 20_000


class TrafficScoreResult(TypedDict):
    road_type_score: float
    road_density_score: float
    intersection_score: float
    services_score: float
    live_traffic_score: float
    historical_volume_score: float | None
    historical_volume_available: bool
    score_method: str
    weights_used: dict[str, float]
    traffic_score: float
    traffic_level: str


def clamp(
    value: float,
    minimum: float = 0,
    maximum: float = 100,
) -> float:
    return max(
        minimum,
        min(value, maximum),
    )


def normalize_vehicle_count(
    vehicle_count_24h: int | None,
) -> float | None:
    """
    Normalize the official 24-hour vehicle count.

    Prototype assumption:
    - 20,000 vehicles per 24 hours or more = 100
    - Missing official count = None
    """

    if vehicle_count_24h is None:
        return None

    if vehicle_count_24h <= 0:
        return 0.0

    return clamp(
        vehicle_count_24h
        / VEHICLE_COUNT_REFERENCE_24H
        * 100
    )


def calculate_traffic_score(
    road_type_score: float,
    road_density_km_per_km2: float,
    intersection_count: int,
    nearby_services_count: int,
    congestion_index: float,
    vehicle_count_24h: int | None = None,
) -> TrafficScoreResult:
    """
    Calculate a prototype Traffic Score from 0 to 100.

    Normalization assumptions:
    - 25 km/km² road density = 100
    - 50 intersections = 100
    - 20 nearby services = 100
    - Congestion index is expected between 0 and 1
    - 20,000 vehicles per 24 hours = 100

    Two methods are supported:
    1. historical_and_context:
       Used when an official 24-hour vehicle count exists.
    2. context_only:
       Used when the official vehicle count is missing.
    """

    normalized_road_type = clamp(
        road_type_score
    )

    road_density_score = clamp(
        road_density_km_per_km2
        / 25
        * 100
    )

    intersection_score = clamp(
        intersection_count
        / 50
        * 100
    )

    services_score = clamp(
        nearby_services_count
        / 20
        * 100
    )

    normalized_congestion_index = max(
        0.0,
        min(float(congestion_index), 1.0),
    )

    live_traffic_score = clamp(
        normalized_congestion_index
        * 100
    )

    historical_volume_score = (
        normalize_vehicle_count(
            vehicle_count_24h
        )
    )

    if historical_volume_score is not None:
        score_method = "historical_and_context"

        weights_used = {
            "historical_volume": 0.50,
            "road_type": 0.20,
            "road_density": 0.10,
            "intersections": 0.05,
            "services": 0.05,
            "live_traffic": 0.10,
        }

        traffic_score = (
            historical_volume_score
            * weights_used["historical_volume"]
            + normalized_road_type
            * weights_used["road_type"]
            + road_density_score
            * weights_used["road_density"]
            + intersection_score
            * weights_used["intersections"]
            + services_score
            * weights_used["services"]
            + live_traffic_score
            * weights_used["live_traffic"]
        )

    else:
        score_method = "context_only"

        weights_used = {
            "historical_volume": 0.00,
            "road_type": 0.30,
            "road_density": 0.25,
            "intersections": 0.15,
            "services": 0.10,
            "live_traffic": 0.20,
        }

        traffic_score = (
            normalized_road_type
            * weights_used["road_type"]
            + road_density_score
            * weights_used["road_density"]
            + intersection_score
            * weights_used["intersections"]
            + services_score
            * weights_used["services"]
            + live_traffic_score
            * weights_used["live_traffic"]
        )

    traffic_score = round(
        clamp(traffic_score),
        2,
    )

    if traffic_score >= 80:
        traffic_level = "Very High"
    elif traffic_score >= 60:
        traffic_level = "High"
    elif traffic_score >= 40:
        traffic_level = "Moderate"
    else:
        traffic_level = "Low"

    return {
        "road_type_score": round(
            normalized_road_type,
            2,
        ),
        "road_density_score": round(
            road_density_score,
            2,
        ),
        "intersection_score": round(
            intersection_score,
            2,
        ),
        "services_score": round(
            services_score,
            2,
        ),
        "live_traffic_score": round(
            live_traffic_score,
            2,
        ),
        "historical_volume_score": (
            round(
                historical_volume_score,
                2,
            )
            if historical_volume_score is not None
            else None
        ),
        "historical_volume_available": (
            historical_volume_score is not None
        ),
        "score_method": score_method,
        "weights_used": weights_used,
        "traffic_score": traffic_score,
        "traffic_level": traffic_level,
    }