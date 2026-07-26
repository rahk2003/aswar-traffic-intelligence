from datetime import date, datetime
from typing import Any

from geoalchemy2 import Geometry
from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Location(Base):
    __tablename__ = "locations"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    latitude: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    longitude: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    geom: Mapped[Any] = mapped_column(
        Geometry(
            geometry_type="POINT",
            srid=4326,
            spatial_index=True,
        ),
        nullable=False,
    )

    road_number: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    vehicle_count_24h: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    data_from: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )

    data_to: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )

    traffic_data_source: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class TrafficReading(Base):
    __tablename__ = "traffic_readings"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    location_id: Mapped[int] = mapped_column(
        ForeignKey(
            "locations.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    collected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    road_class: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
    )

    current_speed_kmph: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    free_flow_speed_kmph: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    speed_drop_percent: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    congestion_index: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    current_travel_time_seconds: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    free_flow_travel_time_seconds: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    traffic_delay_seconds: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    confidence: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    road_closed: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    raw_response: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class OSMSnapshot(Base):
    __tablename__ = "osm_snapshots"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    location_id: Mapped[int] = mapped_column(
        ForeignKey(
            "locations.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    collected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    radius_meters: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    total_elements: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    roads_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    traffic_signals_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    amenities_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    shops_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    tourism_places_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    road_types: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        default=dict,
        nullable=False,
    )

    amenity_types: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        default=dict,
        nullable=False,
    )

    shop_types: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        default=dict,
        nullable=False,
    )

    tourism_types: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        default=dict,
        nullable=False,
    )

    raw_response: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )