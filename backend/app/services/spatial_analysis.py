from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session


SPATIAL_METRICS_SQL = text(
    """
    WITH latest_snapshot AS (
        SELECT
            radius_meters
        FROM osm_snapshots
        WHERE location_id = :location_id
        ORDER BY collected_at DESC, id DESC
        LIMIT 1
    ),

    location_area AS (
        SELECT
            location.id AS location_id,
            location.name AS location_name,
            snapshot.radius_meters,

            ST_Buffer(
                location.geom::geography,
                snapshot.radius_meters
            )::geometry AS buffer_geom

        FROM locations AS location
        CROSS JOIN latest_snapshot AS snapshot

        WHERE location.id = :location_id
    ),

    clipped_roads AS (
        SELECT
            road.osm_id,
            road.highway_type,
            road.road_name,

            ST_CollectionExtract(
                ST_Intersection(
                    road.geom,
                    area.buffer_geom
                ),
                2
            ) AS clipped_geom

        FROM location_area AS area

        JOIN clean_osm_road_geometries AS road
            ON road.location_id = area.location_id

        WHERE ST_Intersects(
            road.geom,
            area.buffer_geom
        )
    ),

    road_totals AS (
        SELECT
            COUNT(*) FILTER (
                WHERE clipped_geom IS NOT NULL
                  AND NOT ST_IsEmpty(clipped_geom)
            ) AS road_segments,

            COALESCE(
                SUM(
                    ST_Length(
                        clipped_geom::geography
                    )
                ),
                0
            ) AS total_road_length_meters

        FROM clipped_roads
    ),

    noded_network AS (
        SELECT
            ST_Node(
                ST_UnaryUnion(
                    ST_Collect(clipped_geom)
                )
            ) AS geom

        FROM clipped_roads

        WHERE clipped_geom IS NOT NULL
          AND NOT ST_IsEmpty(clipped_geom)
    ),

    network_segments AS (
        SELECT
            (ST_Dump(geom)).geom AS segment_geom
        FROM noded_network
        WHERE geom IS NOT NULL
          AND NOT ST_IsEmpty(geom)
    ),

    segment_endpoints AS (
        SELECT
            ST_StartPoint(segment_geom) AS point_geom
        FROM network_segments

        UNION ALL

        SELECT
            ST_EndPoint(segment_geom) AS point_geom
        FROM network_segments
    ),

    junction_points AS (
        SELECT
            ST_SnapToGrid(
                point_geom,
                0.000001
            ) AS junction_geom,

            COUNT(*) AS connected_segments

        FROM segment_endpoints

        GROUP BY ST_SnapToGrid(
            point_geom,
            0.000001
        )

        HAVING COUNT(*) >= 3
    ),

    intersection_totals AS (
        SELECT
            COUNT(*) AS intersection_count
        FROM junction_points
    ),

    nearest_road AS (
        SELECT
            road.highway_type,
            road.road_name,

            ST_Distance(
                location.geom::geography,
                road.geom::geography
            ) AS nearest_road_distance_meters

        FROM locations AS location

        JOIN clean_osm_road_geometries AS road
            ON road.location_id = location.id

        WHERE location.id = :location_id
          AND road.highway_type IN (
              'motorway',
              'motorway_link',
              'trunk',
              'trunk_link',
              'primary',
              'primary_link',
              'secondary',
              'secondary_link',
              'tertiary',
              'tertiary_link',
              'unclassified',
              'residential',
              'living_street',
              'service'
          )

        ORDER BY ST_Distance(
            location.geom::geography,
            road.geom::geography
        )

        LIMIT 1
    )

    SELECT
        area.location_id,
        area.location_name,
        area.radius_meters,

        totals.road_segments,

        ROUND(
            totals.total_road_length_meters::numeric,
            2
        ) AS total_road_length_meters,

        ROUND(
            (
                totals.total_road_length_meters
                / 1000
            )::numeric,
            3
        ) AS total_road_length_km,

        ROUND(
            (
                ST_Area(
                    area.buffer_geom::geography
                )
                / 1000000
            )::numeric,
            3
        ) AS analysis_area_km2,

        ROUND(
            (
                (
                    totals.total_road_length_meters
                    / 1000
                )
                /
                (
                    ST_Area(
                        area.buffer_geom::geography
                    )
                    / 1000000
                )
            )::numeric,
            3
        ) AS road_density_km_per_km2,

        intersections.intersection_count,

        (
            SELECT COUNT(*)
            FROM clean_osm_services AS service
            WHERE service.location_id = area.location_id
        ) AS nearby_services_count,

        nearest.highway_type AS nearest_road_type,
        nearest.road_name AS nearest_road_name,

        ROUND(
            nearest.nearest_road_distance_meters::numeric,
            2
        ) AS nearest_road_distance_meters,

        CASE nearest.highway_type
            WHEN 'motorway' THEN 100
            WHEN 'motorway_link' THEN 95
            WHEN 'trunk' THEN 95
            WHEN 'trunk_link' THEN 90
            WHEN 'primary' THEN 90
            WHEN 'primary_link' THEN 85
            WHEN 'secondary' THEN 80
            WHEN 'secondary_link' THEN 75
            WHEN 'tertiary' THEN 70
            WHEN 'tertiary_link' THEN 65
            WHEN 'unclassified' THEN 55
            WHEN 'residential' THEN 45
            WHEN 'living_street' THEN 30
            WHEN 'service' THEN 20
            ELSE 10
        END AS road_type_score

    FROM location_area AS area
    CROSS JOIN road_totals AS totals
    CROSS JOIN intersection_totals AS intersections
    LEFT JOIN nearest_road AS nearest
        ON TRUE;
    """
)


def get_spatial_metrics(
    database: Session,
    location_id: int,
) -> dict[str, Any] | None:
    result = database.execute(
        SPATIAL_METRICS_SQL,
        {"location_id": location_id},
    ).mappings().one_or_none()

    if result is None:
        return None

    return {
        "location_id": result["location_id"],
        "location_name": result["location_name"],
        "radius_meters": result["radius_meters"],
        "road_segments": int(
            result["road_segments"] or 0
        ),
        "total_road_length_meters": float(
            result["total_road_length_meters"] or 0
        ),
        "total_road_length_km": float(
            result["total_road_length_km"] or 0
        ),
        "analysis_area_km2": float(
            result["analysis_area_km2"] or 0
        ),
        "road_density_km_per_km2": float(
            result["road_density_km_per_km2"] or 0
        ),
        "intersection_count": int(
            result["intersection_count"] or 0
        ),
        "nearby_services_count": int(
            result["nearby_services_count"] or 0
        ),
        "nearest_road_type": result[
            "nearest_road_type"
        ],
        "nearest_road_name": result[
            "nearest_road_name"
        ],
        "nearest_road_distance_meters": float(
            result["nearest_road_distance_meters"] or 0
        ),
        "road_type_score": float(
            result["road_type_score"] or 0
        ),
        "road_type_score_reason": (
            "nearest_supported_road"
            if result["nearest_road_type"]
            else "no_supported_road_found"
        ),
    }
