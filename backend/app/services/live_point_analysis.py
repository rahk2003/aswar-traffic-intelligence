from __future__ import annotations
from concurrent.futures import ThreadPoolExecutor
from time import perf_counter
import math
import os
from collections import Counter
from pathlib import Path
from typing import Any, Iterator

import httpx
from dotenv import load_dotenv
from pyproj import Transformer
from shapely.geometry import (
    GeometryCollection,
    LineString,
    MultiLineString,
    Point,
)
from shapely.geometry.base import BaseGeometry
from shapely.ops import transform, unary_union

from app.services.traffic_scoring import (
    calculate_traffic_score,
)


BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BASE_DIR / ".env")


OVERPASS_URLS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]


ROAD_TYPE_SCORES = {
    "motorway": 100,
    "motorway_link": 95,
    "trunk": 95,
    "trunk_link": 90,
    "primary": 90,
    "primary_link": 85,
    "secondary": 80,
    "secondary_link": 75,
    "tertiary": 70,
    "tertiary_link": 65,
    "unclassified": 55,
    "residential": 45,
    "living_street": 30,
    "service": 20,
}


TRAFFIC_LEVEL_CODES = {
    "Very High": "very_high",
    "High": "high",
    "Moderate": "moderate",
    "Low": "low",
}


def iter_line_strings(
    geometry: BaseGeometry,
) -> Iterator[LineString]:
    if isinstance(geometry, LineString):
        yield geometry
        return

    if isinstance(
        geometry,
        (MultiLineString, GeometryCollection),
    ):
        for child in geometry.geoms:
            yield from iter_line_strings(child)


def get_projector(
    latitude: float,
    longitude: float,
) -> Transformer:
    utm_zone = int(
        math.floor((longitude + 180) / 6) + 1
    )

    if latitude >= 0:
        epsg_code = 32600 + utm_zone
    else:
        epsg_code = 32700 + utm_zone

    return Transformer.from_crs(
        "EPSG:4326",
        f"EPSG:{epsg_code}",
        always_xy=True,
    )


def fetch_osm_metrics(
    latitude: float,
    longitude: float,
    radius_meters: int,
) -> dict[str, Any]:
    query = f"""
    [out:json][timeout:45];
    (
        way(around:{radius_meters},{latitude},{longitude})
            ["highway"];

        node(around:{radius_meters},{latitude},{longitude})
            ["highway"="traffic_signals"];

        nwr(around:{radius_meters},{latitude},{longitude})
            ["amenity"];

        nwr(around:{radius_meters},{latitude},{longitude})
            ["shop"];

        nwr(around:{radius_meters},{latitude},{longitude})
            ["tourism"];
    );
    out body geom qt;
    """

    headers = {
        "User-Agent": (
            "AdvertisingLocationIntelligence/1.0 "
            "(outdoor advertising prototype)"
        )
    }

    timeout = httpx.Timeout(
        timeout=90.0,
        connect=15.0,
    )

    osm_payload = None
    successful_server = None
    errors: list[str] = []

    with httpx.Client(
        timeout=timeout,
        follow_redirects=True,
    ) as client:
        for server_url in OVERPASS_URLS:
            try:
                response = client.post(
                    server_url,
                    data={"data": query},
                    headers=headers,
                )

                response.raise_for_status()
                osm_payload = response.json()
                successful_server = server_url
                break

            except httpx.HTTPStatusError as error:
                errors.append(
                    f"{server_url} returned "
                    f"HTTP {error.response.status_code}"
                )

            except httpx.TimeoutException:
                errors.append(
                    f"{server_url} timed out"
                )

            except httpx.RequestError as error:
                errors.append(
                    f"{server_url} connection error: "
                    f"{error}"
                )

            except ValueError:
                errors.append(
                    f"{server_url} returned invalid JSON"
                )

    if osm_payload is None:
        raise RuntimeError(
            "OpenStreetMap analysis failed. "
            + " | ".join(errors)
        )

    elements = osm_payload.get("elements", [])

    road_records: list[dict[str, Any]] = []
    service_ids: set[str] = set()

    road_types: Counter[str] = Counter()
    amenity_types: Counter[str] = Counter()
    shop_types: Counter[str] = Counter()
    tourism_types: Counter[str] = Counter()

    traffic_signals_count = 0

    for element in elements:
        tags = element.get("tags", {})

        highway_type = tags.get("highway")
        amenity_type = tags.get("amenity")
        shop_type = tags.get("shop")
        tourism_type = tags.get("tourism")

        if highway_type == "traffic_signals":
            traffic_signals_count += 1

        if amenity_type:
            amenity_types[amenity_type] += 1

        if shop_type:
            shop_types[shop_type] += 1

        if tourism_type:
            tourism_types[tourism_type] += 1

        if (
            amenity_type
            or shop_type
            or tourism_type
        ):
            service_ids.add(
                f"{element.get('type')}:"
                f"{element.get('id')}"
            )

        if (
            element.get("type") != "way"
            or not highway_type
        ):
            continue

        geometry = element.get("geometry", [])

        coordinates = [
            (
                point["lon"],
                point["lat"],
            )
            for point in geometry
            if (
                "lon" in point
                and "lat" in point
            )
        ]

        if len(coordinates) < 2:
            continue

        road_types[highway_type] += 1

        road_records.append(
            {
                "osm_id": element.get("id"),
                "highway_type": highway_type,
                "road_name": (
                    tags.get("name")
                    or tags.get("ref")
                ),
                "road_name_ar": tags.get("name:ar"),
                "road_name_en": tags.get("name:en"),
                "geometry": LineString(coordinates),
                "node_ids": element.get("nodes", []),
                "node_coordinates": coordinates,
            }
        )

    projector = get_projector(
        latitude=latitude,
        longitude=longitude,
    )

    project_geometry = projector.transform

    selected_point = transform(
        project_geometry,
        Point(longitude, latitude),
    )

    analysis_buffer = selected_point.buffer(
        radius_meters
    )

    clipped_lines: list[LineString] = []
    clipped_road_count = 0

    nearest_road = None
    nearest_distance = float("inf")

    for road in road_records:
        projected_road = transform(
            project_geometry,
            road["geometry"],
        )

        distance = selected_point.distance(
            projected_road
        )

        if distance < nearest_distance:
            nearest_distance = distance
            nearest_road = road

        clipped_geometry = projected_road.intersection(
            analysis_buffer
        )

        road_has_geometry = False

        for line in iter_line_strings(
            clipped_geometry
        ):
            if line.is_empty or line.length <= 0:
                continue

            clipped_lines.append(line)
            road_has_geometry = True

        if road_has_geometry:
            clipped_road_count += 1

    total_road_length_meters = sum(
        line.length
        for line in clipped_lines
    )

    analysis_area_km2 = (
        analysis_buffer.area / 1_000_000
    )

    if analysis_area_km2 > 0:
        road_density = (
            total_road_length_meters
            / 1000
            / analysis_area_km2
        )
    else:
        road_density = 0.0

    major_road_types = {
        "motorway",
        "motorway_link",
        "trunk",
        "trunk_link",
        "primary",
        "primary_link",
        "secondary",
        "secondary_link",
        "tertiary",
        "tertiary_link",
    }

    drivable_road_types = {
        *major_road_types,
        "residential",
        "unclassified",
        "living_street",
    }

    node_data: dict[int, dict[str, Any]] = {}

    for road in road_records:
        road_type = road["highway_type"]

        if road_type not in drivable_road_types:
            continue

        node_ids = road.get("node_ids", [])
        node_coordinates = road.get(
            "node_coordinates",
            [],
        )

        if (
            len(node_ids) < 2
            or len(node_ids)
            != len(node_coordinates)
        ):
            continue

        last_index = len(node_ids) - 1

        for index, item in enumerate(
            zip(node_ids, node_coordinates)
        ):
            node_id, coordinate = item

            projected_node = transform(
                project_geometry,
                Point(coordinate),
            )

            if not analysis_buffer.covers(
                projected_node
            ):
                continue

            node_record = node_data.setdefault(
                node_id,
                {
                    "point": projected_node,
                    "connected_segments": 0,
                    "road_types": set(),
                },
            )

            node_record["connected_segments"] += (
                1
                if index in {0, last_index}
                else 2
            )

            node_record["road_types"].add(
                road_type
            )

    candidate_intersections = [
        node["point"]
        for node in node_data.values()
        if (
            node["connected_segments"] >= 3
            and node["road_types"].intersection(
                major_road_types
            )
        )
    ]

    raw_intersection_nodes_count = len(
        candidate_intersections
    )

    cluster_distance_meters = 35.0
    intersection_centers = []

    for candidate in candidate_intersections:
        represents_existing_intersection = any(
            candidate.distance(existing) <=
            cluster_distance_meters
            for existing in intersection_centers
        )

        if not represents_existing_intersection:
            intersection_centers.append(candidate)

    intersection_count = len(
        intersection_centers
    )

    nearest_road_type = None
    nearest_road_name = None
    nearest_road_name_ar = None
    nearest_road_name_en = None
    nearest_road_distance = None
    road_type_score = 10.0

    if nearest_road is not None:
        nearest_road_type = nearest_road[
            "highway_type"
        ]

        nearest_road_name = nearest_road[
            "road_name"
        ]

        nearest_road_name_ar = nearest_road[
            "road_name_ar"
        ]

        nearest_road_name_en = nearest_road[
            "road_name_en"
        ]

        nearest_road_distance = round(
            nearest_distance,
            2,
        )

        road_type_score = float(
            ROAD_TYPE_SCORES.get(
                nearest_road_type,
                10,
            )
        )

    return {
        "source": "OpenStreetMap Overpass API",
        "overpass_server": successful_server,
        "radius_meters": radius_meters,
        "total_elements": len(elements),
        "road_segments": clipped_road_count,
        "total_road_length_meters": round(
            total_road_length_meters,
            2,
        ),
        "total_road_length_km": round(
            total_road_length_meters / 1000,
            3,
        ),
        "analysis_area_km2": round(
            analysis_area_km2,
            3,
        ),
        "road_density_km_per_km2": round(
            road_density,
            3,
        ),
        "intersection_count": intersection_count,
        "traffic_signals_count": (
            traffic_signals_count
        ),
        "nearby_services_count": len(
            service_ids
        ),
        "nearest_road_type": nearest_road_type,
        "nearest_road_name": nearest_road_name,
        "nearest_road_name_ar": (
            nearest_road_name_ar
        ),
        "nearest_road_name_en": (
            nearest_road_name_en
        ),
        "nearest_road_distance_meters": (
            nearest_road_distance
        ),
        "road_type_score": road_type_score,
        "road_types": dict(road_types),
        "amenity_types": dict(amenity_types),
        "shop_types": dict(shop_types),
        "tourism_types": dict(
            tourism_types
        ),
    }


def fetch_tomtom_traffic(
    latitude: float,
    longitude: float,
) -> dict[str, Any]:
    api_key = os.getenv("TOMTOM_API_KEY")

    if not api_key:
        raise RuntimeError(
            "TOMTOM_API_KEY was not found "
            "in backend/.env"
        )

    url = (
        "https://api.tomtom.com/traffic/"
        "services/4/flowSegmentData/"
        "absolute/15/json"
    )

    params = {
        "key": api_key,
        "point": f"{latitude},{longitude}",
        "unit": "kmph",
    }

    try:
        response = httpx.get(
            url,
            params=params,
            timeout=30.0,
        )

        response.raise_for_status()
        payload = response.json()

    except httpx.HTTPStatusError as error:
        raise RuntimeError(
            "TomTom returned HTTP "
            f"{error.response.status_code}"
        ) from error

    except httpx.RequestError as error:
        raise RuntimeError(
            "Could not connect to TomTom: "
            f"{error}"
        ) from error

    flow_data = payload.get(
        "flowSegmentData",
        {},
    )

    if not flow_data:
        raise RuntimeError(
            "TomTom response did not contain "
            "flowSegmentData"
        )

    current_speed = flow_data.get(
        "currentSpeed"
    )

    free_flow_speed = flow_data.get(
        "freeFlowSpeed"
    )

    current_travel_time = flow_data.get(
        "currentTravelTime"
    )

    free_flow_travel_time = flow_data.get(
        "freeFlowTravelTime"
    )

    congestion_index = 0.0

    if (
        current_speed is not None
        and free_flow_speed is not None
        and free_flow_speed > 0
    ):
        congestion_index = max(
            0.0,
            min(
                1.0,
                1
                - float(current_speed)
                / float(free_flow_speed),
            ),
        )

    speed_drop_percent = (
        congestion_index * 100
    )

    traffic_delay_seconds = 0

    if (
        current_travel_time is not None
        and free_flow_travel_time is not None
    ):
        traffic_delay_seconds = max(
            0,
            current_travel_time
            - free_flow_travel_time,
        )

    return {
        "source": (
            "TomTom Flow Segment Data API"
        ),
        "road_class": flow_data.get("frc"),
        "current_speed_kmph": current_speed,
        "free_flow_speed_kmph": free_flow_speed,
        "speed_drop_percent": round(
            speed_drop_percent,
            2,
        ),
        "congestion_index": round(
            congestion_index,
            4,
        ),
        "current_travel_time_seconds": (
            current_travel_time
        ),
        "free_flow_travel_time_seconds": (
            free_flow_travel_time
        ),
        "traffic_delay_seconds": (
            traffic_delay_seconds
        ),
        "confidence": flow_data.get(
            "confidence"
        ),
        "road_closed": flow_data.get(
            "roadClosure",
            False,
        ),
    }


def analyze_live_point(
    latitude: float,
    longitude: float,
    radius_meters: int,
) -> dict[str, Any]:
    started_at = perf_counter()

    with ThreadPoolExecutor(max_workers=2) as executor:
        osm_future = executor.submit(
            fetch_osm_metrics,
            latitude,
            longitude,
            radius_meters,
        )

        traffic_future = executor.submit(
            fetch_tomtom_traffic,
            latitude,
            longitude,
        )

        osm_metrics = osm_future.result()
        live_traffic = traffic_future.result()

    analysis_duration_seconds = round(
        perf_counter() - started_at,
        3,
    )

    score = calculate_traffic_score(
        road_type_score=osm_metrics[
            "road_type_score"
        ],
        road_density_km_per_km2=osm_metrics[
            "road_density_km_per_km2"
        ],
        intersection_count=osm_metrics[
            "intersection_count"
        ],
        nearby_services_count=osm_metrics[
            "nearby_services_count"
        ],
        congestion_index=live_traffic[
            "congestion_index"
        ],
        vehicle_count_24h=None,
    )

    return {
        "analysis_type": "live_point",
        "requested_point": {
            "latitude": latitude,
            "longitude": longitude,
            "radius_meters": radius_meters,
        },
        "spatial_analysis": osm_metrics,
        "live_traffic": live_traffic,
        "traffic_score": {
            **score,
            "traffic_level_code": (
                TRAFFIC_LEVEL_CODES.get(
                    score["traffic_level"],
                    "unknown",
                )
            ),
        },
        "data_note": (
            "This analysis uses live TomTom traffic "
            "conditions and current OpenStreetMap "
            "geospatial data. No official 24-hour "
            "vehicle count is available for an "
            "arbitrary map point."
        ),
    }
