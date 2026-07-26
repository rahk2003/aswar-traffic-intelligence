import json
from datetime import datetime
from pathlib import Path
from typing import Any

from geoalchemy2.elements import WKTElement
from sqlalchemy import select

from app.database import SessionLocal
from app.models import Location, OSMSnapshot, TrafficReading


BASE_DIR = Path(__file__).resolve().parent
RAW_DATA_DIR = BASE_DIR / "data" / "raw"


def get_latest_file(pattern: str) -> Path:
    files = list(RAW_DATA_DIR.glob(pattern))

    if not files:
        raise FileNotFoundError(
            f"No files matching {pattern} were found in {RAW_DATA_DIR}"
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


traffic_file = get_latest_file("traffic_sample_*.json")
osm_file = get_latest_file("osm_sample_*.json")

traffic_data = load_json(traffic_file)
osm_data = load_json(osm_file)

requested_point = traffic_data["requested_point"]

latitude = requested_point["latitude"]
longitude = requested_point["longitude"]

traffic_analysis = traffic_data["analysis"]
osm_summary = osm_data["summary"]

traffic_collected_at = parse_datetime(
    traffic_data["collected_at_utc"]
)

osm_collected_at = parse_datetime(
    osm_data["collected_at_utc"]
)


with SessionLocal() as database:
    location = database.scalar(
        select(Location).where(
            Location.latitude == latitude,
            Location.longitude == longitude,
        )
    )

    if location is None:
        location = Location(
            name="Riyadh Sample Location",
            latitude=latitude,
            longitude=longitude,
            geom=WKTElement(
                f"POINT({longitude} {latitude})",
                srid=4326,
            ),
        )

        database.add(location)
        database.flush()

        print("Location inserted successfully")
    else:
        print("Location already exists")

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
        print("Traffic reading inserted successfully")
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
        print("OpenStreetMap snapshot inserted successfully")
    else:
        print("OpenStreetMap snapshot already exists")

    database.commit()


print("\nSample data loaded into PostgreSQL successfully")
print(f"Traffic file: {traffic_file.name}")
print(f"OpenStreetMap file: {osm_file.name}")