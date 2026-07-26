import argparse
import json
import os
from datetime import datetime, timezone
from pathlib import Path

import httpx
from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent
ENV_FILE = BASE_DIR / ".env"
OUTPUT_DIR = BASE_DIR / "data" / "raw"

load_dotenv(ENV_FILE)

api_key = os.getenv("TOMTOM_API_KEY")

if not api_key:
    raise RuntimeError(
        "TOMTOM_API_KEY was not found. "
        "Check the backend/.env file."
    )


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Collect live traffic data from "
            "TomTom Flow Segment Data API."
        )
    )

    parser.add_argument(
        "--lat",
        type=float,
        default=24.7136,
        help="Location latitude.",
    )

    parser.add_argument(
        "--lon",
        type=float,
        default=46.6753,
        help="Location longitude.",
    )

    arguments = parser.parse_args()

    if not -90 <= arguments.lat <= 90:
        parser.error(
            "Latitude must be between -90 and 90."
        )

    if not -180 <= arguments.lon <= 180:
        parser.error(
            "Longitude must be between -180 and 180."
        )

    return arguments


def clamp(
    value: float,
    minimum: float = 0.0,
    maximum: float = 1.0,
) -> float:
    return max(
        minimum,
        min(value, maximum),
    )


arguments = parse_arguments()

latitude = arguments.lat
longitude = arguments.lon


url = (
    "https://api.tomtom.com/traffic/services/4/"
    "flowSegmentData/absolute/15/json"
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
    traffic_response = response.json()

except httpx.HTTPStatusError as error:
    print(
        "TomTom returned status: "
        f"{error.response.status_code}"
    )
    print(error.response.text)
    raise

except httpx.RequestError as error:
    raise RuntimeError(
        f"Could not connect to TomTom: {error}"
    ) from error


flow_data = traffic_response.get(
    "flowSegmentData",
    {},
)

if not flow_data:
    raise RuntimeError(
        "TomTom response did not contain "
        "flowSegmentData."
    )


current_speed = flow_data.get("currentSpeed")
free_flow_speed = flow_data.get("freeFlowSpeed")

current_travel_time = flow_data.get(
    "currentTravelTime"
)
free_flow_travel_time = flow_data.get(
    "freeFlowTravelTime"
)


speed_drop_percent = 0.0
congestion_index = 0.0
delay_seconds = 0


if (
    current_speed is not None
    and free_flow_speed is not None
    and free_flow_speed > 0
):
    raw_congestion_index = (
        1 - current_speed / free_flow_speed
    )

    congestion_index = clamp(
        raw_congestion_index
    )

    speed_drop_percent = (
        congestion_index * 100
    )


if (
    current_travel_time is not None
    and free_flow_travel_time is not None
):
    delay_seconds = max(
        0,
        current_travel_time
        - free_flow_travel_time,
    )


OUTPUT_DIR.mkdir(
    parents=True,
    exist_ok=True,
)

collected_at = datetime.now(timezone.utc)

coordinate_suffix = (
    f"lat{latitude:.5f}_"
    f"lon{longitude:.5f}"
)

filename = (
    "traffic_sample_"
    f"{collected_at.strftime('%Y%m%d_%H%M%S')}_"
    f"{coordinate_suffix}.json"
)

output_path = OUTPUT_DIR / filename


output_data = {
    "source": "TomTom Flow Segment Data API",
    "requested_point": {
        "latitude": latitude,
        "longitude": longitude,
    },
    "collected_at_utc": collected_at.isoformat(),
    "analysis": {
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
        "traffic_delay_seconds": delay_seconds,
        "confidence": flow_data.get("confidence"),
        "road_closed": flow_data.get(
            "roadClosure",
            False,
        ),
    },
    "raw_response": traffic_response,
}


with output_path.open(
    "w",
    encoding="utf-8",
) as file:
    json.dump(
        output_data,
        file,
        ensure_ascii=False,
        indent=2,
    )


print("\nTomTom traffic data collected successfully")
print(f"Requested point: {latitude}, {longitude}")
print(f"Road class: {flow_data.get('frc')}")
print(f"Current speed: {current_speed} km/h")
print(
    f"Free-flow speed: "
    f"{free_flow_speed} km/h"
)
print(
    f"Speed drop: "
    f"{speed_drop_percent:.2f}%"
)
print(
    f"Congestion index: "
    f"{congestion_index:.4f}"
)
print(
    "Current travel time: "
    f"{current_travel_time} seconds"
)
print(
    "Free-flow travel time: "
    f"{free_flow_travel_time} seconds"
)
print(f"Traffic delay: {delay_seconds} seconds")
print(f"Confidence: {flow_data.get('confidence')}")
print(
    f"Road closed: "
    f"{flow_data.get('roadClosure')}"
)
print(f"Saved to: {output_path}")
