from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Location, OSMSnapshot, TrafficReading


router = APIRouter(
    prefix="/api/locations",
    tags=["Locations"],
)


@router.get("/{location_id}/summary")
def get_location_summary(
    location_id: int,
    database: Session = Depends(get_db),
) -> dict:
    location = database.get(Location, location_id)

    if location is None:
        raise HTTPException(
            status_code=404,
            detail="Location not found",
        )

    latest_traffic = database.scalar(
        select(TrafficReading)
        .where(
            TrafficReading.location_id == location_id
        )
        .order_by(
            TrafficReading.collected_at.desc()
        )
        .limit(1)
    )

    latest_osm = database.scalar(
        select(OSMSnapshot)
        .where(
            OSMSnapshot.location_id == location_id
        )
        .order_by(
            OSMSnapshot.collected_at.desc()
        )
        .limit(1)
    )

    traffic_data = None

    if latest_traffic is not None:
        traffic_data = {
            "collected_at": latest_traffic.collected_at,
            "road_class": latest_traffic.road_class,
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
                latest_traffic.current_travel_time_seconds
            ),
            "free_flow_travel_time_seconds": (
                latest_traffic.free_flow_travel_time_seconds
            ),
            "traffic_delay_seconds": (
                latest_traffic.traffic_delay_seconds
            ),
            "confidence": latest_traffic.confidence,
            "road_closed": latest_traffic.road_closed,
        }

    osm_data = None

    if latest_osm is not None:
        osm_data = {
            "collected_at": latest_osm.collected_at,
            "radius_meters": latest_osm.radius_meters,
            "total_elements": latest_osm.total_elements,
            "roads_count": latest_osm.roads_count,
            "traffic_signals_count": (
                latest_osm.traffic_signals_count
            ),
            "amenities_count": latest_osm.amenities_count,
            "shops_count": latest_osm.shops_count,
            "tourism_places_count": (
                latest_osm.tourism_places_count
            ),
            "road_types": latest_osm.road_types,
            "amenity_types": latest_osm.amenity_types,
            "shop_types": latest_osm.shop_types,
            "tourism_types": latest_osm.tourism_types,
        }

    return {
        "location": {
            "id": location.id,
            "name": location.name,
            "latitude": location.latitude,
            "longitude": location.longitude,
        },
        "latest_traffic": traffic_data,
        "latest_osm_snapshot": osm_data,
    }