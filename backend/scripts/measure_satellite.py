from __future__ import annotations

import argparse
import asyncio
import json
from time import perf_counter

from app.config import (
    DynamicWorldSettings,
    SatelliteSettings,
)
from app.services.dynamic_world_service import (
    DynamicWorldService,
)
from app.services.satellite_service import (
    SatelliteService,
)


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Measure the configured Dynamic World and "
            "Sentinel-2 integration."
        )
    )
    parser.add_argument(
        "--latitude",
        type=float,
        default=24.7680,
    )
    parser.add_argument(
        "--longitude",
        type=float,
        default=46.6436,
    )
    parser.add_argument(
        "--radius",
        type=int,
        choices=(250, 500, 750, 1000, 2000),
        default=500,
    )
    return parser.parse_args()


async def measure(
    arguments: argparse.Namespace,
) -> tuple[dict, float]:
    service = SatelliteService(
        SatelliteSettings.from_environment(),
        dynamic_world_service=DynamicWorldService(
            DynamicWorldSettings
            .from_environment()
        ),
    )
    started_at = perf_counter()
    result = await service.get_context(
        latitude=arguments.latitude,
        longitude=arguments.longitude,
        radius_meters=arguments.radius,
    )
    elapsed_seconds = perf_counter() - started_at

    return result, elapsed_seconds


def main() -> int:
    arguments = parse_arguments()
    result, elapsed_seconds = asyncio.run(
        measure(arguments)
    )
    land_context = result.get(
        "land_context",
        {},
    )
    summary = {
        "status": result.get("status"),
        "elapsed_seconds": round(
            elapsed_seconds,
            3,
        ),
        "radius_meters": arguments.radius,
        "probability_sum_percentage":
            land_context.get(
                "probability_sum_percentage"
            ),
        "analysis_confidence": (
            result.get("quality", {})
            .get("analysis_confidence")
        ),
        "acquisition_date": (
            result.get("imagery", {})
            .get("acquisition_date")
        ),
        "message": result.get("message"),
    }
    print(
        json.dumps(
            summary,
            ensure_ascii=False,
            indent=2,
        )
    )

    return (
        0
        if result.get("status") == "available"
        else 1
    )


if __name__ == "__main__":
    raise SystemExit(main())
