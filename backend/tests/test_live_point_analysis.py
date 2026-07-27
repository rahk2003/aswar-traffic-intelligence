from __future__ import annotations

from copy import deepcopy
from time import perf_counter

import httpx
import pytest
from fastapi.testclient import TestClient

from app.main import app
import app.routes.locations as locations_routes
import app.services.live_point_analysis as live_analysis
from app.services.traffic_scoring import (
    calculate_traffic_score,
)


LATITUDE = 24.7136
LONGITUDE = 46.6753


class FakeResponse:
    def __init__(
        self,
        payload,
        *,
        status_code: int = 200,
        json_error: Exception | None = None,
    ) -> None:
        self.payload = payload
        self.status_code = status_code
        self.json_error = json_error

    def raise_for_status(self) -> None:
        if self.status_code >= 400:
            request = httpx.Request(
                "POST",
                "https://service.test",
            )
            response = httpx.Response(
                self.status_code,
                request=request,
            )
            raise httpx.HTTPStatusError(
                "upstream failed",
                request=request,
                response=response,
            )

    def json(self):
        if self.json_error:
            raise self.json_error

        return deepcopy(self.payload)


class FakeOverpassClient:
    def __init__(
        self,
        response: FakeResponse,
    ) -> None:
        self.response = response

    def __enter__(self):
        return self

    def __exit__(
        self,
        _exception_type,
        _exception,
        _traceback,
    ) -> None:
        return None

    def post(self, *_args, **_kwargs):
        return self.response


def make_osm_payload() -> dict:
    return {
        "elements": [
            {
                "type": "way",
                "id": 1,
                "nodes": [1, 2],
                "tags": {
                    "highway": "footway",
                    "name": "Nearest Footway",
                },
                "geometry": [
                    {
                        "lat": LATITUDE,
                        "lon": LONGITUDE - 0.001,
                    },
                    {
                        "lat": LATITUDE,
                        "lon": LONGITUDE + 0.001,
                    },
                ],
            },
            {
                "type": "way",
                "id": 2,
                "nodes": [3, 4],
                "tags": {
                    "highway": "primary",
                    "name": "King Fahd Road",
                    "name:ar": "طريق الملك فهد",
                },
                "geometry": [
                    {
                        "lat": LATITUDE + 0.001,
                        "lon": LONGITUDE - 0.002,
                    },
                    {
                        "lat": LATITUDE + 0.001,
                        "lon": LONGITUDE + 0.002,
                    },
                ],
            },
            {
                "type": "node",
                "id": 30,
                "tags": {
                    "amenity": "cafe",
                },
            },
        ]
    }


def make_spatial_metrics() -> dict:
    return {
        "radius_meters": 500,
        "road_density_km_per_km2": 12.5,
        "intersection_count": 8,
        "traffic_signals_count": 2,
        "nearby_services_count": 6,
        "nearest_road_type": "primary",
        "nearest_road_name": "King Fahd Road",
        "nearest_road_name_ar": "طريق الملك فهد",
        "nearest_road_name_en": None,
        "road_type_score": 90.0,
    }


def make_live_traffic() -> dict:
    return {
        "current_speed_kmph": 42.0,
        "free_flow_speed_kmph": 60.0,
        "congestion_index": 0.3,
    }


def test_analyze_point_endpoint_success(
    monkeypatch,
):
    expected = {
        "analysis_type": "live_point",
        "requested_point": {
            "latitude": LATITUDE,
            "longitude": LONGITUDE,
            "radius_meters": 500,
        },
        "spatial_analysis":
            make_spatial_metrics(),
        "live_traffic": make_live_traffic(),
        "traffic_score": {
            "traffic_score": 72.0,
        },
    }
    calls = []

    def fake_analyze_live_point(
        latitude,
        longitude,
        radius_meters,
    ):
        calls.append(
            (
                latitude,
                longitude,
                radius_meters,
            )
        )
        return expected

    monkeypatch.setattr(
        locations_routes,
        "analyze_live_point",
        fake_analyze_live_point,
    )

    with TestClient(app) as client:
        response = client.post(
            "/api/locations/analyze-point",
            json={
                "latitude": LATITUDE,
                "longitude": LONGITUDE,
                "radius_meters": 500,
            },
        )

    assert response.status_code == 200
    assert response.json() == expected
    assert calls == [
        (
            LATITUDE,
            LONGITUDE,
            500,
        )
    ]


@pytest.mark.parametrize(
    "payload",
    [
        {
            "longitude": LONGITUDE,
            "radius_meters": 500,
        },
        {
            "latitude": 91,
            "longitude": LONGITUDE,
            "radius_meters": 500,
        },
        {
            "latitude": LATITUDE,
            "longitude": -181,
            "radius_meters": 500,
        },
        {
            "latitude": LATITUDE,
            "longitude": LONGITUDE,
            "radius_meters": 200,
        },
    ],
)
def test_analyze_point_rejects_invalid_input(
    payload,
):
    with TestClient(app) as client:
        response = client.post(
            "/api/locations/analyze-point",
            json=payload,
        )

    assert response.status_code == 422
    assert response.json()["detail"]


def test_analyze_point_external_failure_is_502(
    monkeypatch,
):
    monkeypatch.setattr(
        locations_routes,
        "analyze_live_point",
        lambda **_kwargs: (
            _raise_runtime_error(
                "OpenStreetMap analysis failed."
            )
        ),
    )

    with TestClient(app) as client:
        response = client.post(
            "/api/locations/analyze-point",
            json={
                "latitude": LATITUDE,
                "longitude": LONGITUDE,
                "radius_meters": 500,
            },
        )

    assert response.status_code == 502
    assert response.json() == {
        "detail":
            "OpenStreetMap analysis failed."
    }


def _raise_runtime_error(
    message: str,
):
    raise RuntimeError(message)


def test_nearest_unsupported_path_does_not_hide_road(
    monkeypatch,
):
    response = FakeResponse(
        make_osm_payload()
    )
    monkeypatch.setattr(
        live_analysis.httpx,
        "Client",
        lambda **_kwargs:
            FakeOverpassClient(response),
    )

    metrics = (
        live_analysis.fetch_osm_metrics(
            LATITUDE,
            LONGITUDE,
            500,
        )
    )

    assert metrics[
        "nearest_road_type"
    ] == "primary"
    assert metrics[
        "nearest_road_name"
    ] == "King Fahd Road"
    assert metrics["road_type_score"] == 90.0
    assert metrics[
        "road_type_score_reason"
    ] == "nearest_supported_road"


def test_no_supported_road_returns_explicit_fallback(
    monkeypatch,
):
    payload = make_osm_payload()
    payload["elements"] = [
        payload["elements"][0]
    ]
    response = FakeResponse(payload)
    monkeypatch.setattr(
        live_analysis.httpx,
        "Client",
        lambda **_kwargs:
            FakeOverpassClient(response),
    )

    metrics = (
        live_analysis.fetch_osm_metrics(
            LATITUDE,
            LONGITUDE,
            500,
        )
    )

    assert metrics[
        "nearest_road_type"
    ] is None
    assert metrics[
        "nearest_road_name"
    ] is None
    assert metrics["road_type_score"] == 10.0
    assert metrics[
        "road_type_score_reason"
    ] == "no_supported_road_found"


def test_empty_osm_result_does_not_crash(
    monkeypatch,
):
    response = FakeResponse(
        {"elements": []}
    )
    monkeypatch.setattr(
        live_analysis.httpx,
        "Client",
        lambda **_kwargs:
            FakeOverpassClient(response),
    )

    metrics = (
        live_analysis.fetch_osm_metrics(
            LATITUDE,
            LONGITUDE,
            500,
        )
    )

    assert metrics[
        "road_density_km_per_km2"
    ] == 0.0
    assert metrics["intersection_count"] == 0
    assert metrics[
        "nearby_services_count"
    ] == 0
    assert metrics[
        "nearest_road_type"
    ] is None


def test_tomtom_missing_data_is_sanitized(
    monkeypatch,
):
    monkeypatch.setenv(
        "TOMTOM_API_KEY",
        "test-key",
    )
    monkeypatch.setattr(
        live_analysis.httpx,
        "get",
        lambda *_args, **_kwargs:
            FakeResponse({}),
    )

    with pytest.raises(
        RuntimeError,
        match=(
            "TomTom response did not contain "
            "flowSegmentData"
        ),
    ):
        live_analysis.fetch_tomtom_traffic(
            LATITUDE,
            LONGITUDE,
        )


def test_live_analysis_result_and_internal_speed(
    monkeypatch,
):
    monkeypatch.setattr(
        live_analysis,
        "fetch_osm_metrics",
        lambda *_args:
            make_spatial_metrics(),
    )
    monkeypatch.setattr(
        live_analysis,
        "fetch_tomtom_traffic",
        lambda *_args:
            make_live_traffic(),
    )

    started = perf_counter()
    result = (
        live_analysis.analyze_live_point(
            LATITUDE,
            LONGITUDE,
            500,
        )
    )
    elapsed = perf_counter() - started

    assert elapsed < 1.0
    assert result[
        "analysis_duration_seconds"
    ] < 1.0
    assert result[
        "analysis_status"
    ] == "available"
    assert result["data_warnings"] == []
    assert result[
        "traffic_score"
    ]["traffic_score"] == pytest.approx(
        calculate_traffic_score(
            road_type_score=90,
            road_density_km_per_km2=12.5,
            intersection_count=8,
            nearby_services_count=6,
            congestion_index=0.3,
        )["traffic_score"]
    )


def test_single_external_failure_returns_partial_result(
    monkeypatch,
):
    monkeypatch.setattr(
        live_analysis,
        "fetch_osm_metrics",
        lambda *_args:
            make_spatial_metrics(),
    )
    monkeypatch.setattr(
        live_analysis,
        "fetch_tomtom_traffic",
        lambda *_args:
            _raise_runtime_error(
                "TomTom unavailable"
            ),
    )

    result = (
        live_analysis.analyze_live_point(
            LATITUDE,
            LONGITUDE,
            500,
        )
    )

    assert result[
        "analysis_status"
    ] == "partial"
    assert result["data_warnings"] == [
        "traffic_unavailable"
    ]
    assert result[
        "spatial_analysis"
    ]["nearest_road_type"] == "primary"
    assert result["live_traffic"] is None
    assert result["traffic_score"] is None


def test_both_external_failures_raise_clean_error(
    monkeypatch,
):
    monkeypatch.setattr(
        live_analysis,
        "fetch_osm_metrics",
        lambda *_args:
            _raise_runtime_error(
                "OSM unavailable"
            ),
    )
    monkeypatch.setattr(
        live_analysis,
        "fetch_tomtom_traffic",
        lambda *_args:
            _raise_runtime_error(
                "TomTom unavailable"
            ),
    )

    with pytest.raises(
        RuntimeError,
        match=(
            "Live location analysis is "
            "temporarily unavailable"
        ),
    ):
        live_analysis.analyze_live_point(
            LATITUDE,
            LONGITUDE,
            500,
        )
