from fastapi.testclient import TestClient
import pytest

from app.database import (
    DatabaseNotConfiguredError,
    get_engine,
    reset_database_state,
)
from app.main import app


REQUIRED_CONFIGURATION = (
    "DATABASE_URL",
    "TOMTOM_API_KEY",
    "GOOGLE_CLOUD_PROJECT",
    "GOOGLE_APPLICATION_CREDENTIALS",
    "COPERNICUS_CLIENT_ID",
    "COPERNICUS_CLIENT_SECRET",
)


def remove_live_configuration(
    monkeypatch,
) -> None:
    for variable in REQUIRED_CONFIGURATION:
        monkeypatch.delenv(
            variable,
            raising=False,
        )


def test_database_module_is_lazy_without_url(
    monkeypatch,
):
    monkeypatch.delenv(
        "DATABASE_URL",
        raising=False,
    )
    reset_database_state()

    with pytest.raises(
        DatabaseNotConfiguredError,
        match="Database service is not configured",
    ):
        get_engine()


def test_auto_mode_without_credentials_is_demo(
    monkeypatch,
):
    remove_live_configuration(
        monkeypatch
    )
    monkeypatch.setenv(
        "DEMO_MODE",
        "auto",
    )

    with TestClient(app) as client:
        response = client.get(
            "/api/health"
        )

    assert response.status_code == 200
    data = response.json()
    assert data["mode"] == "demo"
    assert data["requested_mode"] == "auto"
    assert (
        data["services"]["database"]
        == "unconfigured"
    )
    assert (
        data["services"]["tomtom"]
        == "unconfigured"
    )


def test_health_allows_local_frontend_dev_port(
    monkeypatch,
):
    remove_live_configuration(
        monkeypatch
    )
    monkeypatch.setenv(
        "DEMO_MODE",
        "auto",
    )

    with TestClient(app) as client:
        response = client.options(
            "/api/health",
            headers={
                "Origin": (
                    "http://127.0.0.1:5174"
                ),
                "Access-Control-Request-Method":
                    "GET",
            },
        )

    assert response.status_code == 200
    assert (
        response.headers[
            "access-control-allow-origin"
        ]
        == "http://127.0.0.1:5174"
    )


def test_analyze_point_in_demo_mode(
    monkeypatch,
):
    remove_live_configuration(
        monkeypatch
    )
    monkeypatch.setenv(
        "DEMO_MODE",
        "true",
    )

    with TestClient(app) as client:
        response = client.post(
            "/api/locations/analyze-point",
            json={
                "latitude": 24.7136,
                "longitude": 46.6753,
                "radius_meters": 750,
            },
        )

    assert response.status_code == 200
    data = response.json()
    assert data["analysis_status"] == "demo"
    assert data["data_mode"] == "demo"
    assert data["is_demo"] is True
    assert (
        data["requested_point"][
            "radius_meters"
        ]
        == 750
    )
    assert (
        data["traffic_score"][
            "traffic_score"
        ]
        == 85.2
    )
    assert data["source_status"] == {
        "database": "demo",
        "openstreetmap": "demo",
        "tomtom": "demo",
        "satellite": "demo",
    }


def test_demo_comparison_works(
    monkeypatch,
):
    monkeypatch.setenv(
        "DEMO_MODE",
        "true",
    )

    with TestClient(app) as client:
        response = client.post(
            "/api/locations/compare",
            json={
                "location_a_id": 1,
                "location_b_id": 2,
            },
        )

    assert response.status_code == 200
    data = response.json()
    assert data["is_demo"] is True
    assert data["location_a"][
        "is_demo"
    ] is True
    assert data["location_b"][
        "is_demo"
    ] is True


def test_satellite_demo_without_credentials(
    monkeypatch,
):
    remove_live_configuration(
        monkeypatch
    )
    monkeypatch.setenv(
        "DEMO_MODE",
        "auto",
    )

    with TestClient(app) as client:
        response = client.get(
            "/api/satellite/context",
            params={
                "latitude": 24.7136,
                "longitude": 46.6753,
                "radius_meters": 500,
            },
        )
        preview_response = client.get(
            "/api/satellite/preview",
            params={
                "latitude": 24.7136,
                "longitude": 46.6753,
                "radius_meters": 500,
            },
        )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "demo"
    assert data["is_demo"] is True
    assert (
        data["land_context"][
            "probability_sum_percentage"
        ]
        == 100.0
    )
    assert preview_response.status_code == 200
    assert (
        preview_response.headers[
            "content-type"
        ]
        == "image/svg+xml"
    )


def test_demo_assistant_labels_sample_result(
    monkeypatch,
):
    monkeypatch.setenv(
        "DEMO_MODE",
        "true",
    )

    with TestClient(app) as client:
        response = client.post(
            "/api/assistant/explain",
            json={
                "question": (
                    "Is this location suitable?"
                ),
                "question_type": "suitability",
                "language": "en",
                "analysis": {
                    "traffic_score": 85.2,
                    "traffic_level": "Very High",
                    "data_mode": "demo",
                    "is_demo": True,
                    "factors": [],
                },
            },
        )

    assert response.status_code == 200
    data = response.json()
    assert data["source"] == "local"
    assert "Demo Mode" in data["answer"]
    assert "not a live reading" in data["answer"]


def test_demo_comparison_assistant_is_explicit(
    monkeypatch,
):
    monkeypatch.setenv(
        "DEMO_MODE",
        "true",
    )
    base_location = {
        "traffic_level": "High",
        "data_mode": "demo",
        "is_demo": True,
        "factors": [
            {
                "key": "roadDensity",
                "score": 80,
                "weight": 25,
            },
            {
                "key": "services",
                "score": 45,
                "weight": 15,
            },
        ],
        "satellite_context": {
            "built_percentage": 70,
            "probability_sum_percentage": 100,
            "is_estimated": True,
        },
    }

    with TestClient(app) as client:
        response = client.post(
            "/api/assistant/compare",
            json={
                "language": "en",
                "location_a": {
                    **base_location,
                    "traffic_score": 82,
                },
                "location_b": {
                    **base_location,
                    "traffic_score": 64,
                    "satellite_context": {
                        **base_location[
                            "satellite_context"
                        ],
                        "built_percentage": 51,
                    },
                },
            },
        )

    assert response.status_code == 200
    data = response.json()
    assert "Demo Mode" in data["answer"]
    assert "Location A" in data["answer"]
    assert "built-area" in data["answer"]
    assert "does not modify" in data["answer"]


def test_live_mode_missing_database_is_clear_503(
    monkeypatch,
):
    monkeypatch.setenv(
        "DEMO_MODE",
        "false",
    )
    monkeypatch.delenv(
        "DATABASE_URL",
        raising=False,
    )
    reset_database_state()

    with TestClient(app) as client:
        response = client.get(
            "/api/locations/ranking"
        )

    assert response.status_code == 503
    assert (
        "Database service is not configured"
        in response.json()["detail"]
    )
