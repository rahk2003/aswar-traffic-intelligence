import json
import os
from datetime import datetime, timezone
from pathlib import Path

import httpx
from dotenv import load_dotenv


# Paths
BASE_DIR = Path(__file__).resolve().parent
ENV_FILE = BASE_DIR / ".env"
OUTPUT_DIR = BASE_DIR / "data" / "raw"

# Load environment variables
load_dotenv(ENV_FILE)

api_key = os.getenv("TOMTOM_API_KEY")

if not api_key:
    raise RuntimeError(
        "TOMTOM_API_KEY was not found. Check the backend/.env file."
    )


# Sample location in Riyadh
latitude = 24.7136
longitude = 46.6753


# TomTom Flow Segment Data API
url = (
    "https://api.tomtom.com/traffic/services/4/"
    "flowSegmentData/absolute/15/json"
)

params = {
    "key": api_key,
    "point": f"{latitude},{longitude}",
    "unit": "kmph",
}


# Request traffic data
try:
    response = httpx.get(
        url,
        params=params,
        timeout=30.0,
    )

    response.raise_for_status()
    traffic_response = response.json()

except httpx.HTTPStatusError as error:
    print(f"TomTom returned status: {error.response.status_code}")
    print(error.response.text)
    raise

except httpx.RequestError as error:
    raise RuntimeError(
        f"Could not connect to TomTom: {error}"
    ) from error


# Extract traffic values
flow_data = traffic_response.get("flowSegmentData", {})

current_speed = flow_data.get("currentSpeed")
free_flow_speed = flow_data.get("freeFlowSpeed")

current_travel_time = flow_data.get("currentTravelTime")
free_flow_travel_time = flow_data.get("freeFlowTravelTime")


# Calculate traffic indicators
speed_drop_percent = 0.0
congestion_index = 0.0
delay_seconds = 0

if current_speed is not None and free_flow_speed:
    speed_drop_percent = (
        (free_flow_speed - current_speed)
        / free_flow_speed
    ) * 100

    congestion_index = 1 - (
        current_speed / free_flow_speed
    )

if (
    current_travel_time is not None
    and free_flow_travel_time is not None
):
    delay_seconds = (
        current_travel_time
        - free_flow_travel_time
    )


# Create output folder and filename
OUTPUT_DIR.mkdir(
    parents=True,
    exist_ok=True,
)

collected_at = datetime.now(timezone.utc)

filename = (
    f"traffic_sample_"
    f"{collected_at.strftime('%Y%m%d_%H%M%S')}.json"
)

output_path = OUTPUT_DIR / filename


# Prepare output data
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
            2,
        ),
        "current_travel_time_seconds": current_travel_time,
        "free_flow_travel_time_seconds": free_flow_travel_time,
        "traffic_delay_seconds": delay_seconds,
        "confidence": flow_data.get("confidence"),
        "road_closed": flow_data.get("roadClosure"),
    },
    "raw_response": traffic_response,
}


# Save data as JSON
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


# Print results
print("\nTomTom traffic data collected successfully")
print(f"Road class: {flow_data.get('frc')}")
print(f"Current speed: {current_speed} km/h")
print(f"Free-flow speed: {free_flow_speed} km/h")
print(f"Speed drop: {speed_drop_percent:.1f}%")
print(f"Congestion index: {congestion_index:.2f}")
print(
    f"Current travel time: "
    f"{current_travel_time} seconds"
)
print(
    f"Free-flow travel time: "
    f"{free_flow_travel_time} seconds"
)
print(f"Traffic delay: {delay_seconds} seconds")
print(f"Confidence: {flow_data.get('confidence')}")
print(f"Road closed: {flow_data.get('roadClosure')}")
print(f"Saved to: {output_path}")