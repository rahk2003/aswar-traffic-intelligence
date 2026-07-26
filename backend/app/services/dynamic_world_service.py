from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
import json
from math import isfinite
from threading import Lock
from typing import Any

import ee

from app.config import DynamicWorldSettings


DYNAMIC_WORLD_BANDS = (
    "water",
    "trees",
    "grass",
    "flooded_vegetation",
    "crops",
    "shrub_and_scrub",
    "built",
    "bare",
    "snow_and_ice",
)
VEGETATION_BANDS = (
    "trees",
    "grass",
    "flooded_vegetation",
    "crops",
    "shrub_and_scrub",
)
RESOLUTION_METERS = 10


class DynamicWorldServiceError(RuntimeError):
    """Sanitized Google Earth Engine service error."""


class DynamicWorldNotConfiguredError(
    DynamicWorldServiceError
):
    pass


class DynamicWorldNoDataError(
    DynamicWorldServiceError
):
    pass


class DynamicWorldService:
    """Dynamic World probability-band analysis client."""

    def __init__(
        self,
        settings: DynamicWorldSettings,
    ) -> None:
        self.settings = settings
        self._initialized = False
        self._initialization_lock = Lock()

    @property
    def is_configured(self) -> bool:
        return self.settings.is_configured

    async def get_probabilities(
        self,
        *,
        latitude: float,
        longitude: float,
        radius_meters: int,
        reference_date: datetime,
    ) -> dict[str, Any]:
        if not self.is_configured:
            raise DynamicWorldNotConfiguredError(
                "Dynamic World is not configured."
            )

        try:
            return await asyncio.to_thread(
                self._get_probabilities_sync,
                latitude,
                longitude,
                radius_meters,
                reference_date,
            )
        except (
            DynamicWorldNotConfiguredError,
            DynamicWorldNoDataError,
        ):
            raise
        except Exception:
            raise DynamicWorldServiceError(
                "Dynamic World analysis failed."
            ) from None

    def _initialize(self) -> None:
        if self._initialized:
            return

        with self._initialization_lock:
            if self._initialized:
                return

            try:
                with open(
                    self.settings.credentials_path,
                    encoding="utf-8",
                ) as credentials_file:
                    credentials_payload = json.load(
                        credentials_file
                    )

                service_account_email = (
                    credentials_payload[
                        "client_email"
                    ]
                )
                credentials = (
                    ee.ServiceAccountCredentials(
                        service_account_email,
                        key_file=(
                            self.settings
                            .credentials_path
                        ),
                    )
                )
                ee.Initialize(
                    credentials,
                    project=(
                        self.settings.project_id
                    ),
                )
            except (
                OSError,
                KeyError,
                TypeError,
                ValueError,
                ee.EEException,
            ):
                raise DynamicWorldServiceError(
                    "Dynamic World authentication failed."
                ) from None

            self._initialized = True

    def _get_probabilities_sync(
        self,
        latitude: float,
        longitude: float,
        radius_meters: int,
        reference_date: datetime,
    ) -> dict[str, Any]:
        self._initialize()
        reference_day = _utc_day(
            reference_date
        )
        reference_end = (
            reference_day
            + timedelta(days=1)
        )
        geometry = (
            ee.Geometry.Point(
                [longitude, latitude]
            )
            .buffer(radius_meters, 1)
        )
        base_collection = (
            ee.ImageCollection(
                self.settings.dataset
            )
            .filterBounds(geometry)
            .select(
                list(DYNAMIC_WORLD_BANDS)
            )
        )
        exact_collection = (
            base_collection.filterDate(
                _iso_z(reference_day),
                _iso_z(reference_end),
            )
        )
        fallback_collection = (
            base_collection.filterDate(
                _iso_z(
                    reference_day
                    - timedelta(
                        days=(
                            self.settings
                            .search_days
                        )
                    )
                ),
                _iso_z(reference_end),
            )
        )
        matched_reference_date = (
            exact_collection.size().gt(0)
        )
        has_fallback = (
            fallback_collection.size().gt(0)
        )
        reference_millis = ee.Date(
            _iso_z(reference_day)
        ).millis()
        selected_millis = ee.Number(
            ee.Algorithms.If(
                matched_reference_date,
                reference_millis,
                ee.Algorithms.If(
                    has_fallback,
                    fallback_collection
                    .aggregate_max(
                        "system:time_start"
                    ),
                    reference_millis,
                ),
            )
        )
        selected_date = ee.Date(
            selected_millis
        )
        selected_collection = (
            base_collection.filterDate(
                selected_date,
                selected_date.advance(
                    1,
                    "day",
                ),
            )
        )

        probabilities = (
            selected_collection.mean()
        )
        vegetation = (
            probabilities
            .select(
                list(VEGETATION_BANDS)
            )
            .reduce(ee.Reducer.sum())
            .rename("vegetation")
        )
        top_probability = (
            probabilities
            .reduce(ee.Reducer.max())
            .rename("top_probability")
        )
        valid_coverage = (
            probabilities
            .mask()
            .reduce(ee.Reducer.min())
            .unmask(0, False)
            .rename("valid_coverage")
        )
        summary_image = ee.Image.cat(
            [
                probabilities
                .select("built")
                .rename("built"),
                probabilities
                .select("bare")
                .rename("bare"),
                vegetation,
                probabilities
                .select("water")
                .rename("water"),
                probabilities
                .select("snow_and_ice")
                .rename("other"),
                top_probability,
                valid_coverage,
            ]
        )
        statistics = (
            ee.Dictionary(
                summary_image.reduceRegion(
                    reducer=ee.Reducer.mean(),
                    geometry=geometry,
                    scale=RESOLUTION_METERS,
                    maxPixels=(
                        self.settings.max_pixels
                    ),
                    tileScale=4,
                )
            )
            .set(
                "_image_count",
                selected_collection.size(),
            )
            .set(
                "_selected_millis",
                selected_millis,
            )
            .set(
                "_matched_reference_date",
                matched_reference_date,
            )
            .getInfo()
        )
        image_count = int(
            statistics.pop(
                "_image_count",
                0,
            )
            or 0
        )

        if image_count <= 0:
            raise DynamicWorldNoDataError(
                "No Dynamic World image was selected."
            )

        selected_day = datetime.fromtimestamp(
            float(
                statistics.pop(
                    "_selected_millis"
                )
            )
            / 1000.0,
            tz=timezone.utc,
        ).replace(
            hour=0,
            minute=0,
            second=0,
            microsecond=0,
        )
        matched_date = bool(
            statistics.pop(
                "_matched_reference_date",
                False,
            )
        )

        return _parse_dynamic_world_statistics(
            statistics,
            acquisition_date=selected_day,
            matched_reference_date=(
                matched_date
            ),
            image_count=image_count,
        )


def _utc_day(
    value: datetime,
) -> datetime:
    aware_value = (
        value.replace(tzinfo=timezone.utc)
        if value.tzinfo is None
        else value.astimezone(timezone.utc)
    )

    return aware_value.replace(
        hour=0,
        minute=0,
        second=0,
        microsecond=0,
    )


def _iso_z(
    value: datetime,
) -> str:
    return (
        value.astimezone(timezone.utc)
        .isoformat()
        .replace("+00:00", "Z")
    )


def _finite_probability(
    value: Any,
) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return 0.0

    if not isfinite(parsed):
        return 0.0

    return max(0.0, min(parsed, 1.0))


def _rounded_percentages(
    values: dict[str, float],
) -> dict[str, float]:
    total = sum(values.values())

    if total <= 0:
        raise DynamicWorldNoDataError(
            "Dynamic World returned no valid probabilities."
        )

    percentages = {
        key: round(
            value / total * 100.0,
            2,
        )
        for key, value in values.items()
    }
    difference = round(
        100.0 - sum(percentages.values()),
        2,
    )

    if difference:
        dominant_key = max(
            percentages,
            key=percentages.get,
        )
        percentages[dominant_key] = round(
            percentages[dominant_key]
            + difference,
            2,
        )

    return percentages


def _dynamic_world_confidence(
    mean_top_probability_percentage: float,
    valid_pixel_percentage: float,
) -> str:
    if (
        mean_top_probability_percentage >= 75
        and valid_pixel_percentage >= 85
    ):
        return "high"

    if (
        mean_top_probability_percentage >= 50
        and valid_pixel_percentage >= 60
    ):
        return "moderate"

    return "low"


def _dynamic_world_limitations(
    *,
    confidence: str,
    mean_top_probability_percentage: float,
    valid_pixel_percentage: float,
    matched_reference_date: bool,
) -> list[str]:
    limitations: list[str] = []

    if mean_top_probability_percentage < 50:
        limitations.append(
            "Dynamic World probabilities are distributed "
            "across multiple land-cover classes, reducing "
            "classification confidence."
        )

    if valid_pixel_percentage < 85:
        limitations.append(
            "Low Dynamic World valid-pixel coverage "
            "reduced classification confidence."
        )

    if not matched_reference_date:
        limitations.append(
            "The nearest available Dynamic World result "
            "did not exactly match the Sentinel-2 preview "
            "date."
        )

    if confidence == "low" and not limitations:
        limitations.append(
            "Multiple Dynamic World quality factors "
            "reduced classification confidence."
        )

    return limitations


def _parse_dynamic_world_statistics(
    statistics: Any,
    *,
    acquisition_date: datetime,
    matched_reference_date: bool,
    image_count: int,
) -> dict[str, Any]:
    if not isinstance(statistics, dict):
        raise DynamicWorldServiceError(
            "Dynamic World statistics are invalid."
        )

    raw_probabilities = {
        key: _finite_probability(
            statistics.get(key)
        )
        for key in (
            "built",
            "bare",
            "vegetation",
            "water",
            "other",
        )
    }
    percentages = _rounded_percentages(
        raw_probabilities
    )
    valid_pixel_percentage = round(
        _finite_probability(
            statistics.get(
                "valid_coverage"
            )
        )
        * 100.0,
        2,
    )
    mean_top_probability_percentage = round(
        _finite_probability(
            statistics.get(
                "top_probability"
            )
        )
        * 100.0,
        2,
    )
    confidence = _dynamic_world_confidence(
        mean_top_probability_percentage,
        valid_pixel_percentage,
    )

    return {
        "probabilities": percentages,
        "probability_sum_percentage": round(
            sum(percentages.values()),
            2,
        ),
        "valid_pixel_percentage":
            valid_pixel_percentage,
        "masked_pixel_percentage": round(
            100.0 - valid_pixel_percentage,
            2,
        ),
        "mean_top_probability_percentage":
            mean_top_probability_percentage,
        "analysis_confidence": confidence,
        "limitations":
            _dynamic_world_limitations(
                confidence=confidence,
                mean_top_probability_percentage=(
                    mean_top_probability_percentage
                ),
                valid_pixel_percentage=(
                    valid_pixel_percentage
                ),
                matched_reference_date=(
                    matched_reference_date
                ),
            ),
        "acquisition_date": _iso_z(
            acquisition_date
        ),
        "matched_reference_date":
            matched_reference_date,
        "image_count": image_count,
    }
