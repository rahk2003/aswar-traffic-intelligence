import argparse
import json
from datetime import datetime
from pathlib import Path
from typing import Any

from geoalchemy2.elements import WKTElement
from sqlalchemy import func, select

from app.database import get_session_factory
from app.models import Location, OSMSnapshot, TrafficReading


BASE_DIR = Path(__file__).resolve().parent
RAW_DATA_DIR = BASE_DIR / "data" / "raw"


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Load matching TomTom and OpenStreetMap "
            "samples into PostgreSQL."
        )
    )

    parser.add_argument(
        "--name",
        required=True,
        help="Display name for the location.",
    )

    parser.add_argument(
        "--lat",
        type=float,
        required=True,
        help="Location latitude.",
    )

    parser.add_argument(
        "--lon",
        type=float,
        required=True,
        help="Location longitude.",
    )

    arguments = parser.parse_args()

    if not -90 <= arguments.lat <= 90:
        parser.error("Latitude must be between -90 and 90.")

    if not -180 <= arguments.lon <= 180:
        parser.error("Longitude must be between -180 and 180.")

    return arguments


def get_latest_file(pattern: str) -> Path:
    files = list(RAW_DATA_DIR.glob(pattern))

    if not files:
        raise FileNotFoundError(
            f"No files matching {pattern} were found "
            f"in {RAW_DATA_DIR}"
        )

    return max(
        files,
        key=lambda file_path: file_path.stat().st_mtime,
    )


def load_json(file_path: Path) -> dict[str, Any]:
    with file_path.open(
        "r",
        encoding="utf-8",
    ) as file:
        return json.load(file)


def parse_datetime(value: str) -> datetime:
    return datetime.fromisoformat(
        value.replace("Z", "+00:00")
    )


def validate_requested_point(
    data: dict[str, Any],
    expected_latitude: float,
    expected_longitude: float,
    source_name: str,
) -> None:
    requested_point = data.get("requested_point", {})

    actual_latitude = requested_point.get("latitude")
    actual_longitude = requested_point.get("longitude")

    if (
        actual_latitude is None
        or actual_longitude is None
    ):
        raise ValueError(
            f"{source_name} file does not contain "
            "requested_point coordinates."
        )

    tolerance = 0.000001

    if (
        abs(actual_latitude - expected_latitude)
        > tolerance
        or abs(actual_longitude - expected_longitude)
        > tolerance
    ):
        raise ValueError(
            f"{source_name} coordinates do not match "
            "the requested location."
        )


arguments = parse_arguments()

location_name = arguments.name
latitude = arguments.lat
longitude = arguments.lon

coordinate_suffix = (
    f"lat{latitude:.5f}_"
    f"lon{longitude:.5f}"
)

traffic_file = get_latest_file(
    f"traffic_sample_*_{coordinate_suffix}.json"
)

osm_file = get_latest_file(
    f"osm_sample_*_{coordinate_suffix}.json"
)

traffic_data = load_json(traffic_file)
osm_data = load_json(osm_file)

validate_requested_point(
    data=traffic_data,
    expected_latitude=latitude,
    expected_longitude=longitude,
    source_name="TomTom",
)

validate_requested_point(
    data=osm_data,
    expected_latitude=latitude,
    expected_longitude=longitude,
    source_name="OpenStreetMap",
)

traffic_analysis = traffic_data["analysis"]
osm_summary = osm_data["summary"]

traffic_collected_at = parse_datetime(
    traffic_data["collected_at_utc"]
)

osm_collected_at = parse_datetime(
    osm_data["collected_at_utc"]
)


with get_session_factory()() as database:
    location = database.scalar(
        select(Location).where(
            func.abs(
                Location.latitude - latitude
            ) < 0.000001,
            func.abs(
                Location.longitude - longitude
            ) < 0.000001,
        )
    )

    if location is None:
        location = Location(
            name=location_name,
            latitude=latitude,
            longitude=longitude,
            geom=WKTElement(
                f"POINT({longitude} {latitude})",
                srid=4326,
            ),
        )

        database.add(location)
        database.flush()

        print(
            "Location inserted successfully: "
            f"id={location.id}"
        )
    else:
        print(
            "Location already exists: "
            f"id={location.id}"
        )

    traffic_exists = database.scalar(
        select(TrafficReading.id).where(
            TrafficReading.location_id == location.id,
            TrafficReading.collected_at
            == traffic_collected_at,
        )
    )

    if traffic_exists is None:
        traffic_reading = TrafficReading(
            location_id=location.id,
            collected_at=traffic_collected_at,
            road_class=traffic_analysis.get(
                "road_class"
            ),
            current_speed_kmph=traffic_analysis.get(
                "current_speed_kmph"
            ),
            free_flow_speed_kmph=traffic_analysis.get(
                "free_flow_speed_kmph"
            ),
            speed_drop_percent=traffic_analysis.get(
                "speed_drop_percent"
            ),
            congestion_index=traffic_analysis.get(
                "congestion_index"
            ),
            current_travel_time_seconds=traffic_analysis.get(
                "current_travel_time_seconds"
            ),
            free_flow_travel_time_seconds=traffic_analysis.get(
                "free_flow_travel_time_seconds"
            ),
            traffic_delay_seconds=traffic_analysis.get(
                "traffic_delay_seconds"
            ),
            confidence=traffic_analysis.get(
                "confidence"
            ),
            road_closed=traffic_analysis.get(
                "road_closed",
                False,
            ),
            raw_response=traffic_data["raw_response"],
        )

        database.add(traffic_reading)

        print(
            "Traffic reading inserted successfully"
        )
    else:
        print("Traffic reading already exists")

    osm_exists = database.scalar(
        select(OSMSnapshot.id).where(
            OSMSnapshot.location_id == location.id,
            OSMSnapshot.collected_at
            == osm_collected_at,
        )
    )

    if osm_exists is None:
        osm_snapshot = OSMSnapshot(
            location_id=location.id,
            collected_at=osm_collected_at,
            radius_meters=osm_data["radius_meters"],
            total_elements=osm_summary.get(
                "total_elements",
                0,
            ),
            roads_count=osm_summary.get(
                "roads_count",
                0,
            ),
            traffic_signals_count=osm_summary.get(
                "traffic_signals_count",
                0,
            ),
            amenities_count=osm_summary.get(
                "amenities_count",
                0,
            ),
            shops_count=osm_summary.get(
                "shops_count",
                0,
            ),
            tourism_places_count=osm_summary.get(
                "tourism_places_count",
                0,
            ),
            road_types=osm_summary.get(
                "road_types",
                {},
            ),
            amenity_types=osm_summary.get(
                "amenity_types",
                {},
            ),
            shop_types=osm_summary.get(
                "shop_types",
                {},
            ),
            tourism_types=osm_summary.get(
                "tourism_types",
                {},
            ),
            raw_response=osm_data["raw_response"],
        )

        database.add(osm_snapshot)

        print(
            "OpenStreetMap snapshot inserted successfully"
        )
    else:
        print("OpenStreetMap snapshot already exists")

    database.commit()


print("\nSample data loaded into PostgreSQL successfully")
print(f"Location name: {location_name}")
print(f"Coordinates: {latitude}, {longitude}")
print(f"Traffic file: {traffic_file.name}")
print(f"OpenStreetMap file: {osm_file.name}")
