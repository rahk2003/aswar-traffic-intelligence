import argparse
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import httpx


BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "data" / "raw"

# Public Overpass API servers.
# The script tries the next server if one is busy.
OVERPASS_URLS = [
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    "https://overpass-api.de/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
]


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Collect roads and nearby services from "
            "OpenStreetMap using Overpass API."
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

    parser.add_argument(
        "--radius",
        type=int,
        default=300,
        help="Search radius in meters.",
    )

    arguments = parser.parse_args()

    if not -90 <= arguments.lat <= 90:
        parser.error("Latitude must be between -90 and 90.")

    if not -180 <= arguments.lon <= 180:
        parser.error("Longitude must be between -180 and 180.")

    if not 50 <= arguments.radius <= 5000:
        parser.error(
            "Radius must be between 50 and 5000 meters."
        )

    return arguments


arguments = parse_arguments()

latitude = arguments.lat
longitude = arguments.lon
radius_meters = arguments.radius


query = f"""
[out:json][timeout:45];
(
    way(around:{radius_meters},{latitude},{longitude})
        ["highway"];

    node(around:{radius_meters},{latitude},{longitude})
        ["highway"="traffic_signals"];

    node(around:{radius_meters},{latitude},{longitude})
        ["amenity"];

    node(around:{radius_meters},{latitude},{longitude})
        ["shop"];

    node(around:{radius_meters},{latitude},{longitude})
        ["tourism"];
);
out geom qt;
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

osm_response = None
successful_server = None
errors: list[str] = []


with httpx.Client(
    timeout=timeout,
    follow_redirects=True,
) as client:
    for overpass_url in OVERPASS_URLS:
        print(f"Trying Overpass server: {overpass_url}")

        try:
            response = client.post(
                overpass_url,
                data={"data": query},
                headers=headers,
            )

            response.raise_for_status()

            osm_response = response.json()
            successful_server = overpass_url

            print("Server responded successfully")
            break

        except httpx.HTTPStatusError as error:
            message = (
                f"{overpass_url} returned "
                f"status {error.response.status_code}"
            )
            print(message)
            errors.append(message)

        except httpx.TimeoutException:
            message = f"{overpass_url} timed out"
            print(message)
            errors.append(message)

        except httpx.RequestError as error:
            message = (
                f"{overpass_url} connection error: {error}"
            )
            print(message)
            errors.append(message)

        except ValueError:
            message = (
                f"{overpass_url} returned invalid JSON"
            )
            print(message)
            errors.append(message)


if osm_response is None:
    error_details = "\n".join(errors)

    raise RuntimeError(
        "All Overpass API servers failed:\n"
        f"{error_details}"
    )


elements = osm_response.get("elements", [])

roads = []
traffic_signals = []
amenities = []
shops = []
tourism_places = []

road_types: Counter[str] = Counter()
amenity_types: Counter[str] = Counter()
shop_types: Counter[str] = Counter()
tourism_types: Counter[str] = Counter()


for element in elements:
    tags = element.get("tags", {})

    highway_type = tags.get("highway")
    amenity_type = tags.get("amenity")
    shop_type = tags.get("shop")
    tourism_type = tags.get("tourism")

    if (
        element.get("type") == "way"
        and highway_type
    ):
        roads.append(element)
        road_types[highway_type] += 1

    if highway_type == "traffic_signals":
        traffic_signals.append(element)

    if amenity_type:
        amenities.append(element)
        amenity_types[amenity_type] += 1

    if shop_type:
        shops.append(element)
        shop_types[shop_type] += 1

    if tourism_type:
        tourism_places.append(element)
        tourism_types[tourism_type] += 1


collected_at = datetime.now(timezone.utc)

OUTPUT_DIR.mkdir(
    parents=True,
    exist_ok=True,
)

coordinate_suffix = (
    f"lat{latitude:.5f}_"
    f"lon{longitude:.5f}"
)

filename = (
    "osm_sample_"
    f"{collected_at.strftime('%Y%m%d_%H%M%S')}_"
    f"{coordinate_suffix}.json"
)

output_path = OUTPUT_DIR / filename


output_data = {
    "source": "OpenStreetMap Overpass API",
    "overpass_server": successful_server,
    "requested_point": {
        "latitude": latitude,
        "longitude": longitude,
    },
    "radius_meters": radius_meters,
    "collected_at_utc": collected_at.isoformat(),
    "summary": {
        "total_elements": len(elements),
        "roads_count": len(roads),
        "traffic_signals_count": len(
            traffic_signals
        ),
        "amenities_count": len(amenities),
        "shops_count": len(shops),
        "tourism_places_count": len(
            tourism_places
        ),
        "road_types": dict(road_types),
        "amenity_types": dict(amenity_types),
        "shop_types": dict(shop_types),
        "tourism_types": dict(tourism_types),
    },
    "raw_response": osm_response,
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


print("\nOpenStreetMap data collected successfully")
print(f"Requested point: {latitude}, {longitude}")
print(f"Server used: {successful_server}")
print(f"Search radius: {radius_meters} meters")
print(f"Total elements: {len(elements)}")
print(f"Roads: {len(roads)}")
print(f"Traffic signals: {len(traffic_signals)}")
print(f"Amenities: {len(amenities)}")
print(f"Shops: {len(shops)}")
print(f"Tourism places: {len(tourism_places)}")
print(f"Road types: {dict(road_types)}")
print(f"Amenity types: {dict(amenity_types)}")
print(f"Shop types: {dict(shop_types)}")
print(f"Saved to: {output_path}")
