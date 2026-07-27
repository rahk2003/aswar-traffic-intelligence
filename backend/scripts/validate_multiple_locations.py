from __future__ import annotations

import argparse
import json
from concurrent.futures import (
    ThreadPoolExecutor,
    as_completed,
)
from dataclasses import asdict, dataclass
from typing import Any

from app.services.live_point_analysis import (
    analyze_live_point,
)


DEFAULT_LOCATIONS = (
    {
        "category": "busy_main_road",
        "name": "King Fahd Road - Al Olaya",
        "latitude": 24.699352,
        "longitude": 46.678625,
    },
    {
        "category": "motorway",
        "name": "Northern Ring Road - KAFD junction",
        "latitude": 24.7680,
        "longitude": 46.6436,
    },
    {
        "category": "residential",
        "name": "Al Yasmin residential area",
        "latitude": 24.8174,
        "longitude": 46.6304,
    },
    {
        "category": "sparse",
        "name": "Western low-density edge",
        "latitude": 24.8300,
        "longitude": 46.3500,
    },
    {
        "category": "outskirts",
        "name": "South-eastern outskirts",
        "latitude": 24.6000,
        "longitude": 47.0500,
    },
)


@dataclass(frozen=True)
class ValidationRow:
    category: str
    name: str
    status: str
    traffic_score: float | None
    road_density: float | None
    intersections: int | None
    nearby_services: int | None
    nearest_road_name: str | None
    nearest_road_type: str | None
    road_type_score: float | None
    road_type_score_reason: str | None
    current_speed_kmph: float | None
    congestion_index: float | None
    duration_seconds: float | None
    warnings: list[str]
    checks: list[str]
    error: str | None = None


def _validate_result(
    location: dict[str, Any],
    result: dict[str, Any],
) -> ValidationRow:
    spatial = result.get("spatial_analysis")
    traffic = result.get("live_traffic")
    score = result.get("traffic_score")
    checks: list[str] = []

    if spatial is not None:
        road_type_score = spatial.get(
            "road_type_score"
        )
        nearest_type = spatial.get(
            "nearest_road_type"
        )
        reason = spatial.get(
            "road_type_score_reason"
        )

        if road_type_score == 10:
            if (
                nearest_type is not None
                or reason
                != "no_supported_road_found"
            ):
                checks.append(
                    "invalid_road_type_fallback"
                )
        elif road_type_score is not None:
            if not 0 <= float(road_type_score) <= 100:
                checks.append(
                    "road_type_score_out_of_range"
                )
            if reason != "nearest_supported_road":
                checks.append(
                    "missing_supported_road_reason"
                )

        for key in (
            "road_density_km_per_km2",
            "intersection_count",
            "nearby_services_count",
        ):
            value = spatial.get(key)

            if value is None or value < 0:
                checks.append(
                    f"invalid_{key}"
                )

    if score is not None:
        traffic_score = score.get(
            "traffic_score"
        )

        if (
            traffic_score is None
            or not 0 <= float(traffic_score) <= 100
        ):
            checks.append(
                "traffic_score_out_of_range"
            )

    if (
        result.get("analysis_status")
        == "available"
        and (
            spatial is None
            or traffic is None
            or score is None
        )
    ):
        checks.append(
            "available_result_is_incomplete"
        )

    return ValidationRow(
        category=location["category"],
        name=location["name"],
        status=result.get(
            "analysis_status",
            "unknown",
        ),
        traffic_score=(
            score.get("traffic_score")
            if score
            else None
        ),
        road_density=(
            spatial.get(
                "road_density_km_per_km2"
            )
            if spatial
            else None
        ),
        intersections=(
            spatial.get("intersection_count")
            if spatial
            else None
        ),
        nearby_services=(
            spatial.get(
                "nearby_services_count"
            )
            if spatial
            else None
        ),
        nearest_road_name=(
            spatial.get("nearest_road_name")
            if spatial
            else None
        ),
        nearest_road_type=(
            spatial.get("nearest_road_type")
            if spatial
            else None
        ),
        road_type_score=(
            spatial.get("road_type_score")
            if spatial
            else None
        ),
        road_type_score_reason=(
            spatial.get(
                "road_type_score_reason"
            )
            if spatial
            else None
        ),
        current_speed_kmph=(
            traffic.get("current_speed_kmph")
            if traffic
            else None
        ),
        congestion_index=(
            traffic.get("congestion_index")
            if traffic
            else None
        ),
        duration_seconds=result.get(
            "analysis_duration_seconds"
        ),
        warnings=list(
            result.get("data_warnings", [])
        ),
        checks=checks,
    )


def _analyze_location(
    location: dict[str, Any],
    radius_meters: int,
) -> ValidationRow:
    try:
        result = analyze_live_point(
            latitude=location["latitude"],
            longitude=location["longitude"],
            radius_meters=radius_meters,
        )
    except RuntimeError as error:
        return ValidationRow(
            category=location["category"],
            name=location["name"],
            status="unavailable",
            traffic_score=None,
            road_density=None,
            intersections=None,
            nearby_services=None,
            nearest_road_name=None,
            nearest_road_type=None,
            road_type_score=None,
            road_type_score_reason=None,
            current_speed_kmph=None,
            congestion_index=None,
            duration_seconds=None,
            warnings=[],
            checks=[],
            error=str(error),
        )

    return _validate_result(
        location,
        result,
    )


def _format(value: Any) -> str:
    if value is None:
        return "-"

    if isinstance(value, float):
        return f"{value:.2f}"

    return str(value)


def _print_table(rows: list[ValidationRow]) -> None:
    headers = (
        "category",
        "status",
        "score",
        "density",
        "ints",
        "services",
        "road type",
        "type score",
        "speed",
        "seconds",
    )
    values = [
        (
            row.category,
            row.status,
            _format(row.traffic_score),
            _format(row.road_density),
            _format(row.intersections),
            _format(row.nearby_services),
            _format(row.nearest_road_type),
            _format(row.road_type_score),
            _format(row.current_speed_kmph),
            _format(row.duration_seconds),
        )
        for row in rows
    ]
    widths = [
        max(
            len(header),
            *(len(item[index]) for item in values),
        )
        for index, header in enumerate(headers)
    ]
    line = " | ".join(
        header.ljust(widths[index])
        for index, header in enumerate(headers)
    )

    print(line)
    print("-+-".join("-" * width for width in widths))

    for value_row in values:
        print(
            " | ".join(
                value.ljust(widths[index])
                for index, value in enumerate(
                    value_row
                )
            )
        )

    print()

    for row in rows:
        details = (
            f"{row.category}: "
            f"road={_format(row.nearest_road_name)}, "
            f"reason={_format(row.road_type_score_reason)}, "
            f"warnings={row.warnings or '-'}, "
            f"checks={row.checks or '-'}, "
            f"error={row.error or '-'}"
        )
        print(details)


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Validate live analysis across five "
            "different location categories."
        )
    )
    parser.add_argument(
        "--radius",
        type=int,
        choices=(250, 500, 750, 1000, 2000),
        default=500,
        help="Analysis radius in meters.",
    )
    parser.add_argument(
        "--workers",
        type=int,
        choices=(1, 2),
        default=2,
        help="Concurrent locations (kept low for Overpass).",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Print machine-readable JSON.",
    )
    return parser.parse_args()


def main() -> int:
    arguments = parse_arguments()
    rows_by_category: dict[str, ValidationRow] = {}

    with ThreadPoolExecutor(
        max_workers=arguments.workers
    ) as executor:
        futures = {
            executor.submit(
                _analyze_location,
                location,
                arguments.radius,
            ): location["category"]
            for location in DEFAULT_LOCATIONS
        }

        for future in as_completed(futures):
            category = futures[future]
            rows_by_category[category] = (
                future.result()
            )

    rows = [
        rows_by_category[
            location["category"]
        ]
        for location in DEFAULT_LOCATIONS
    ]

    if arguments.json:
        print(
            json.dumps(
                [asdict(row) for row in rows],
                ensure_ascii=False,
                indent=2,
            )
        )
    else:
        _print_table(rows)

    invariant_failures = [
        row
        for row in rows
        if row.checks
    ]
    completed = [
        row
        for row in rows
        if row.status in {
            "available",
            "partial",
        }
    ]

    if invariant_failures or not completed:
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
