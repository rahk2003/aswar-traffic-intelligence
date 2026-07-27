import asyncio
from copy import deepcopy
from datetime import (
    datetime,
    timezone,
)
import json
from pathlib import Path
from time import sleep

import httpx
import pytest
from fastapi.testclient import TestClient

from app.config import (
    DynamicWorldSettings,
    SatelliteSettings,
)
from app.main import app
from app.routes.satellite import (
    get_satellite_service,
)
from app.services.dynamic_world_service import (
    DynamicWorldService,
    DynamicWorldServiceError,
    VEGETATION_BANDS,
    _dynamic_world_limitations,
    _parse_dynamic_world_statistics,
)
from app.services.satellite_service import (
    STATISTICAL_EVALSCRIPT,
    SatelliteService,
    SatelliteServiceError,
    _parse_statistics,
)


NOW = datetime(
    2026,
    7,
    26,
    12,
    0,
    tzinfo=timezone.utc,
)
SECRET = "test-secret-never-log"
PNG_BYTES = b"\x89PNG\r\n\x1a\nsatellite"


def test_dynamic_world_timeout_is_sanitized(
    monkeypatch,
):
    service = DynamicWorldService(
        DynamicWorldSettings(
            project_id="test-project",
            credentials_path=str(
                Path(__file__)
            ),
            dataset="GOOGLE/DYNAMICWORLD/V1",
            search_days=30,
            max_pixels=5_000_000,
            request_timeout_seconds=0.01,
        )
    )

    def slow_analysis(*_args):
        sleep(0.05)
        return {}

    monkeypatch.setattr(
        service,
        "_get_probabilities_sync",
        slow_analysis,
    )

    with pytest.raises(
        DynamicWorldServiceError,
        match="timed out",
    ):
        run(
            service.get_probabilities(
                latitude=24.7136,
                longitude=46.6753,
                radius_meters=500,
                reference_date=NOW,
            )
        )


def make_settings(
    *,
    configured: bool = True,
    timeout: float = 5.0,
) -> SatelliteSettings:
    return SatelliteSettings(
        client_id=(
            "test-client"
            if configured
            else ""
        ),
        client_secret=(
            SECRET
            if configured
            else ""
        ),
        token_url=(
            "https://copernicus.test/token"
        ),
        catalog_url=(
            "https://copernicus.test/catalog"
        ),
        process_url=(
            "https://copernicus.test/process"
        ),
        statistical_url=(
            "https://copernicus.test/statistics"
        ),
        max_cloud_cover=20.0,
        search_days=90,
        cache_ttl_seconds=21600,
        request_timeout_seconds=timeout,
    )


def catalog_payload(
    *,
    acquisition_date: str = (
        "2026-07-20T07:32:10Z"
    ),
    cloud_cover: float = 4.2,
    scene_id: str = "scene-1",
) -> dict:
    return {
        "features": [
            {
                "id": scene_id,
                "properties": {
                    "datetime":
                        acquisition_date,
                    "eo:cloud_cover":
                        cloud_cover,
                },
            }
        ]
    }


def statistics_payload(
    *,
    sample_count: int = 1000,
    no_data_count: int = 100,
) -> dict:
    means = [
        0.12,
        0.08,
        0.15,
    ]

    return {
        "data": [
            {
                "outputs": {
                    "indices": {
                        "bands": {
                            f"B{index}": {
                                "stats": {
                                    "mean": mean,
                                    "sampleCount":
                                        sample_count,
                                    "noDataCount":
                                        no_data_count,
                                }
                            }
                            for index, mean
                            in enumerate(means)
                        }
                    }
                }
            }
        ]
    }


def dynamic_world_result() -> dict:
    return {
        "probabilities": {
            "built": 55.0,
            "bare": 25.0,
            "vegetation": 15.0,
            "water": 4.0,
            "other": 1.0,
        },
        "probability_sum_percentage": 100.0,
        "valid_pixel_percentage": 90.0,
        "masked_pixel_percentage": 10.0,
        "mean_top_probability_percentage": 78.0,
        "analysis_confidence": "high",
        "limitations": [],
        "acquisition_date":
            "2026-07-20T00:00:00Z",
        "matched_reference_date": True,
        "image_count": 1,
    }


class FakeDynamicWorldService:
    def __init__(
        self,
        *,
        configured: bool = True,
        result: dict | None = None,
    ) -> None:
        self.is_configured = configured
        self.result = (
            result
            or dynamic_world_result()
        )
        self.calls = 0

    async def get_probabilities(
        self,
        **_kwargs,
    ) -> dict:
        self.calls += 1
        return deepcopy(self.result)


def standard_handler(
    counts: dict[str, int],
):
    def handler(
        request: httpx.Request,
    ) -> httpx.Response:
        path = request.url.path

        if path == "/token":
            counts["token"] += 1
            assert (
                SECRET.encode()
                in request.content
            )
            return httpx.Response(
                200,
                json={
                    "access_token": "token-1",
                    "expires_in": 3600,
                },
            )

        if path == "/catalog":
            counts["catalog"] += 1
            assert request.headers[
                "Accept"
            ] == "application/geo+json"
            request_payload = json.loads(
                request.content
            )
            assert request_payload[
                "collections"
            ] == ["sentinel-2-l2a"]
            assert (
                request_payload[
                    "filter-lang"
                ]
                == "cql2-text"
            )
            assert (
                "sortby"
                not in request_payload
            )
            assert request_payload[
                "limit"
            ] == 100
            return httpx.Response(
                200,
                json=catalog_payload(),
            )

        if path == "/statistics":
            counts["statistics"] += 1
            request_payload = json.loads(
                request.content
            )
            assert (
                "B11"
                in request_payload[
                    "aggregation"
                ]["evalscript"]
            )
            return httpx.Response(
                200,
                json=statistics_payload(),
            )

        if path == "/process":
            counts["process"] += 1
            request_payload = json.loads(
                request.content
            )
            process_input = (
                request_payload["input"][
                    "data"
                ][0]
            )
            assert process_input[
                "processing"
            ]["upsampling"] == "BICUBIC"
            assert (
                "naturalColor"
                in request_payload["evalscript"]
            )
            return httpx.Response(
                200,
                content=PNG_BYTES,
                headers={
                    "Content-Type": "image/png",
                },
            )

        raise AssertionError(
            f"Unexpected path: {path}"
        )

    return handler


def make_service(
    handler,
    *,
    configured: bool = True,
    timeout: float = 5.0,
    dynamic_world_service=None,
) -> SatelliteService:
    return SatelliteService(
        make_settings(
            configured=configured,
            timeout=timeout,
        ),
        transport=httpx.MockTransport(
            handler
        ),
        dynamic_world_service=(
            dynamic_world_service
            or FakeDynamicWorldService()
        ),
        now_factory=lambda: NOW,
    )


def run(coroutine):
    return asyncio.run(coroutine)


def test_not_configured_status_and_route():
    service = make_service(
        lambda _request: (
            pytest.fail(
                "No HTTP request was expected"
            )
        ),
        configured=False,
    )

    result = run(
        service.get_context(
            24.7136,
            46.6753,
            500,
        )
    )

    assert result == {
        "status": "not_configured",
        "message": (
            "Satellite analysis is "
            "not configured."
        ),
    }

    app.dependency_overrides[
        get_satellite_service
    ] = lambda: service

    try:
        with TestClient(app) as client:
            response = client.get(
                "/api/satellite/context",
                params={
                    "latitude": 24.7136,
                    "longitude": 46.6753,
                    "radius_meters": 500,
                },
            )
    finally:
        app.dependency_overrides.pop(
            get_satellite_service,
            None,
        )

    assert response.status_code == 200
    assert (
        response.json()["status"]
        == "not_configured"
    )


def test_dynamic_world_not_configured_status():
    service = make_service(
        lambda _request: pytest.fail(
            "No HTTP request was expected"
        ),
        dynamic_world_service=(
            FakeDynamicWorldService(
                configured=False
            )
        ),
    )

    result = run(
        service.get_context(
            24.7136,
            46.6753,
            500,
        )
    )

    assert result == {
        "status": "not_configured",
        "message": (
            "Dynamic World analysis is "
            "not configured."
        ),
    }


def test_token_is_obtained_once_and_cached():
    token_calls = 0

    def handler(
        request: httpx.Request,
    ) -> httpx.Response:
        nonlocal token_calls
        token_calls += 1

        return httpx.Response(
            200,
            json={
                "access_token": "cached-token",
                "expires_in": 3600,
            },
        )

    service = make_service(handler)

    async def get_tokens():
        async with service._client() as client:
            first = await service._access_token(
                client
            )
            second = await service._access_token(
                client
            )
            return first, second

    first, second = run(get_tokens())

    assert first == "cached-token"
    assert second == "cached-token"
    assert token_calls == 1


def test_context_statistics_and_cache():
    counts = {
        "token": 0,
        "catalog": 0,
        "statistics": 0,
        "process": 0,
    }
    dynamic_world = FakeDynamicWorldService()
    service = make_service(
        standard_handler(counts),
        dynamic_world_service=dynamic_world,
    )
    original_score = {
        "traffic_score": 82.35,
        "weights_used": {
            "road_type": 0.25,
        },
    }
    unchanged_score = deepcopy(
        original_score
    )

    first = run(
        service.get_context(
            24.7136,
            46.6753,
            500,
        )
    )
    second = run(
        service.get_context(
            24.7136,
            46.6753,
            500,
        )
    )

    assert first["status"] == "available"
    assert first == second
    assert (
        first["imagery"][
            "cloud_cover_percentage"
        ]
        == 4.2
    )
    land_context = first["land_context"]
    class_total = sum(
        [
            land_context["built_percentage"],
            land_context["bare_percentage"],
            land_context["vegetation_percentage"],
            land_context["water_percentage"],
            land_context["other_percentage"],
        ]
    )
    assert class_total == pytest.approx(
        100.0,
        abs=0.05,
    )
    assert (
        land_context[
            "valid_pixel_percentage"
        ]
        == 90.0
    )
    assert (
        land_context[
            "masked_pixel_percentage"
        ]
        == 10.0
    )
    assert first["quality"][
        "analysis_confidence"
    ] == "high"
    assert first["quality"][
        "mean_top_probability_percentage"
    ] == 78.0
    assert first["source"]["dataset"] == (
        "GOOGLE/DYNAMICWORLD/V1"
    )
    assert dynamic_world.calls == 1
    assert counts == {
        "token": 1,
        "catalog": 1,
        "statistics": 1,
        "process": 0,
    }
    assert original_score == unchanged_score
    assert "traffic_score" not in first


def test_catalog_expands_to_365_days():
    catalog_calls = 0
    search_ranges = []

    def handler(
        request: httpx.Request,
    ) -> httpx.Response:
        nonlocal catalog_calls

        if request.url.path == "/token":
            return httpx.Response(
                200,
                json={
                    "access_token": "token",
                    "expires_in": 3600,
                },
            )

        if request.url.path == "/catalog":
            catalog_calls += 1
            payload = json.loads(
                request.content
            )
            search_ranges.append(
                payload["datetime"]
            )

            return httpx.Response(
                200,
                json=(
                    catalog_payload()
                    if catalog_calls == 3
                    else {"features": []}
                ),
            )

        if request.url.path == "/statistics":
            return httpx.Response(
                200,
                json=statistics_payload(),
            )

        raise AssertionError(
            "Unexpected request"
        )

    service = make_service(handler)
    result = run(
        service.get_context(
            24.7,
            46.6,
            750,
        )
    )

    assert result["status"] == "available"
    assert result["imagery"][
        "search_period_days"
    ] == 365
    assert catalog_calls == 3
    assert len(search_ranges) == 3


def test_no_imagery_after_all_windows():
    catalog_calls = 0

    def handler(
        request: httpx.Request,
    ) -> httpx.Response:
        nonlocal catalog_calls

        if request.url.path == "/token":
            return httpx.Response(
                200,
                json={
                    "access_token": "token",
                },
            )

        if request.url.path == "/catalog":
            catalog_calls += 1
            return httpx.Response(
                200,
                json={"features": []},
            )

        raise AssertionError(
            "Statistics should not be requested"
        )

    service = make_service(handler)
    result = run(
        service.get_context(
            24.7,
            46.6,
            500,
        )
    )

    assert result["status"] == "no_imagery"
    assert catalog_calls == 3


def test_preview_png_and_image_cache():
    counts = {
        "token": 0,
        "catalog": 0,
        "statistics": 0,
        "process": 0,
    }
    service = make_service(
        standard_handler(counts)
    )

    first = run(
        service.get_preview(
            24.7136,
            46.6753,
            500,
        )
    )
    second = run(
        service.get_preview(
            24.7136,
            46.6753,
            500,
        )
    )

    assert first == PNG_BYTES
    assert second == PNG_BYTES
    assert counts["process"] == 1
    assert counts["catalog"] == 1
    assert counts["token"] == 1


def test_process_failure_is_sanitized(
    caplog,
):
    def handler(
        request: httpx.Request,
    ) -> httpx.Response:
        if request.url.path == "/token":
            return httpx.Response(
                200,
                json={
                    "access_token": "token",
                },
            )

        if request.url.path == "/catalog":
            return httpx.Response(
                200,
                json=catalog_payload(),
            )

        if request.url.path == "/process":
            return httpx.Response(
                503,
                text=(
                    f"upstream failure {SECRET}"
                ),
            )

        raise AssertionError(
            "Unexpected request"
        )

    service = make_service(handler)

    with pytest.raises(
        SatelliteServiceError,
        match="Copernicus request failed",
    ) as error_info:
        run(
            service.get_preview(
                24.7,
                46.6,
                500,
            )
        )

    assert SECRET not in str(
        error_info.value
    )
    assert SECRET not in caplog.text


def test_timeout_returns_temporary_status():
    def handler(
        request: httpx.Request,
    ) -> httpx.Response:
        if request.url.path == "/token":
            raise httpx.ReadTimeout(
                "timed out",
                request=request,
            )

        raise AssertionError(
            "Unexpected request"
        )

    service = make_service(
        handler,
        timeout=1.0,
    )
    result = run(
        service.get_context(
            24.7,
            46.6,
            500,
        )
    )

    assert result["status"] == (
        "temporarily_unavailable"
    )


def test_zero_pixels_and_non_finite_values():
    with pytest.raises(
        SatelliteServiceError
    ):
        _parse_statistics(
            statistics_payload(
                sample_count=0,
                no_data_count=0,
            )
        )

    payload = statistics_payload()
    bands = (
        payload["data"][0]["outputs"]
        ["indices"]["bands"]
    )
    bands["B0"]["stats"]["mean"] = (
        float("nan")
    )
    parsed = _parse_statistics(payload)

    assert parsed["mean_ndvi"] == 0.0
    assert all(
        value == value
        for value in parsed.values()
    )


def test_polygon_and_route_validation():
    polygon = (
        SatelliteService
        .analysis_polygon(
            24.7136,
            179.999,
            2000,
        )
    )
    coordinates = (
        polygon["coordinates"][0]
    )

    assert len(coordinates) == 65
    assert coordinates[0] == coordinates[-1]
    assert all(
        -180 <= coordinate[0] <= 180
        for coordinate in coordinates
    )
    service = make_service(
        lambda _request: (
            pytest.fail(
                "No request expected"
            )
        ),
        configured=False,
    )
    app.dependency_overrides[
        get_satellite_service
    ] = lambda: service

    try:
        with TestClient(app) as client:
            invalid_latitude = client.get(
                "/api/satellite/context",
                params={
                    "latitude": 91,
                    "longitude": 46,
                    "radius_meters": 500,
                },
            )
            invalid_radius = client.get(
                "/api/satellite/context",
                params={
                    "latitude": 24,
                    "longitude": 46,
                    "radius_meters": 99,
                },
            )
    finally:
        app.dependency_overrides.pop(
            get_satellite_service,
            None,
        )

    assert invalid_latitude.status_code == 422
    assert invalid_radius.status_code == 422


def test_spectral_script_only_calculates_supporting_indices():
    assert (
        "bands: 3"
        in STATISTICAL_EVALSCRIPT
    )
    assert (
        "builtCandidate"
        not in STATISTICAL_EVALSCRIPT
    )


def test_dynamic_world_probabilities_are_grouped_and_normalized():
    result = _parse_dynamic_world_statistics(
        {
            "built": 0.42,
            "bare": 0.18,
            "vegetation": 0.30,
            "water": 0.08,
            "other": 0.02,
            "valid_coverage": 0.96,
            "top_probability": 0.81,
        },
        acquisition_date=NOW,
        matched_reference_date=True,
        image_count=2,
    )

    assert set(VEGETATION_BANDS) == {
        "trees",
        "grass",
        "flooded_vegetation",
        "crops",
        "shrub_and_scrub",
    }
    assert result[
        "probability_sum_percentage"
    ] == 100.0
    assert sum(
        result["probabilities"].values()
    ) == pytest.approx(100.0)
    assert "unknown" not in result[
        "probabilities"
    ]
    assert result[
        "analysis_confidence"
    ] == "high"


def test_low_confidence_has_a_specific_limitation():
    limitations = _dynamic_world_limitations(
        confidence="low",
        mean_top_probability_percentage=42,
        valid_pixel_percentage=100,
        matched_reference_date=True,
    )

    assert limitations == [
        (
            "Dynamic World probabilities are distributed "
            "across multiple land-cover classes, reducing "
            "classification confidence."
        )
    ]


def test_low_confidence_limitations_never_empty():
    limitations = _dynamic_world_limitations(
        confidence="low",
        mean_top_probability_percentage=90,
        valid_pixel_percentage=100,
        matched_reference_date=True,
    )

    assert limitations == [
        (
            "Multiple Dynamic World quality factors "
            "reduced "
            "classification confidence."
        )
    ]
