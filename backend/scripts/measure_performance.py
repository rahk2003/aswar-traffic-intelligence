from __future__ import annotations

import argparse
import statistics
from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
from time import perf_counter
from typing import Callable, Iterator

from app.services import live_point_analysis
from app.services.assistant_service import (
    generate_assistant_explanation,
)


SPATIAL_RESULT = {
    "radius_meters": 500,
    "road_density_km_per_km2": 14.2,
    "intersection_count": 18,
    "nearby_services_count": 12,
    "nearest_road_type": "primary",
    "nearest_road_name": "Performance Road",
    "road_type_score": 90.0,
    "road_type_score_reason":
        "nearest_supported_road",
}
TRAFFIC_RESULT = {
    "current_speed_kmph": 42.0,
    "free_flow_speed_kmph": 60.0,
    "congestion_index": 0.3,
}
ASSISTANT_ANALYSIS = {
    "traffic_score": 69.3,
    "traffic_level": "High",
    "historical_volume_available": False,
    "factors": [
        {
            "key": "roadType",
            "score": 90,
            "weight": 30,
        },
        {
            "key": "roadDensity",
            "score": 56.8,
            "weight": 25,
        },
    ],
}


@contextmanager
def mocked_live_sources() -> Iterator[None]:
    original_osm = (
        live_point_analysis.fetch_osm_metrics
    )
    original_traffic = (
        live_point_analysis.fetch_tomtom_traffic
    )
    live_point_analysis.fetch_osm_metrics = (
        lambda *_args, **_kwargs: dict(
            SPATIAL_RESULT
        )
    )
    live_point_analysis.fetch_tomtom_traffic = (
        lambda *_args, **_kwargs: dict(
            TRAFFIC_RESULT
        )
    )

    try:
        yield
    finally:
        live_point_analysis.fetch_osm_metrics = (
            original_osm
        )
        live_point_analysis.fetch_tomtom_traffic = (
            original_traffic
        )


def analyze_once() -> None:
    result = (
        live_point_analysis.analyze_live_point(
            24.7136,
            46.6753,
            500,
        )
    )

    if result["traffic_score"] is None:
        raise RuntimeError(
            "Internal analysis did not produce a score."
        )


def compare_once() -> None:
    with ThreadPoolExecutor(
        max_workers=2
    ) as executor:
        futures = [
            executor.submit(analyze_once)
            for _ in range(2)
        ]

        for future in futures:
            future.result()


def assistant_once() -> None:
    result = generate_assistant_explanation(
        question="Why did this location get this score?",
        question_type="why_score",
        language="en",
        analysis=ASSISTANT_ANALYSIS,
    )

    if not result.get("answer"):
        raise RuntimeError(
            "Assistant did not return an answer."
        )


def measure(
    operation: Callable[[], None],
    iterations: int,
) -> dict[str, float]:
    durations = []

    for _ in range(iterations):
        started_at = perf_counter()
        operation()
        durations.append(
            (perf_counter() - started_at) * 1000
        )

    ordered = sorted(durations)
    percentile_index = min(
        len(ordered) - 1,
        max(
            0,
            round(0.95 * len(ordered)) - 1,
        ),
    )

    return {
        "average_ms": round(
            statistics.fmean(durations),
            3,
        ),
        "maximum_ms": round(
            max(durations),
            3,
        ),
        "p95_ms": round(
            ordered[percentile_index],
            3,
        ),
    }


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Measure internal processing separately "
            "from external service latency."
        )
    )
    parser.add_argument(
        "--iterations",
        type=int,
        default=25,
    )
    return parser.parse_args()


def main() -> int:
    arguments = parse_arguments()

    if arguments.iterations < 3:
        raise SystemExit(
            "--iterations must be at least 3"
        )

    with mocked_live_sources():
        results = {
            "analyze_point_internal": measure(
                analyze_once,
                arguments.iterations,
            ),
            "comparison_internal": measure(
                compare_once,
                arguments.iterations,
            ),
            "assistant_local": measure(
                assistant_once,
                arguments.iterations,
            ),
        }

    for name, timing in results.items():
        print(
            f"{name}: "
            f"avg={timing['average_ms']} ms, "
            f"p95={timing['p95_ms']} ms, "
            f"max={timing['maximum_ms']} ms"
        )

    print(
        "satellite_external: measure through the "
        "configured integration; unit tests use mocks."
    )
    print(
        "report_frontend: measure in a real browser; "
        "there is no backend report endpoint."
    )

    slow_internal = any(
        timing["maximum_ms"] >= 2000
        for timing in results.values()
    )

    return 1 if slow_internal else 0


if __name__ == "__main__":
    raise SystemExit(main())
