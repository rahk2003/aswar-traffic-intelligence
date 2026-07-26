from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.database import get_db
from app.main import app
import app.routes.locations as locations_routes


def make_location(
    location_id: int,
    name: str,
    vehicle_count_24h: int | None = None,
):
    return SimpleNamespace(
        id=location_id,
        name=name,
        latitude=24.7136,
        longitude=46.6753,
        road_number="65",
        vehicle_count_24h=vehicle_count_24h,
        data_from=None,
        data_to=None,
        traffic_data_source="Test data",
    )


def make_spatial_data(
    road_density: float = 12.5,
    intersections: int = 20,
    services: int = 15,
):
    return {
        "nearest_road_type": "primary",
        "nearest_road_name": "Test Road",
        "road_type_score": 80.0,
        "road_density_km_per_km2": road_density,
        "intersection_count": intersections,
        "nearby_services_count": services,
    }


def make_score_data(
    score: float,
    method: str = "context_only",
    historical_available: bool = False,
):
    if score >= 70:
        level = "High"
    elif score >= 40:
        level = "Medium"
    else:
        level = "Low"

    return {
        "historical_volume_available": (
            historical_available
        ),
        "historical_volume_score": (
            80.0 if historical_available else None
        ),
        "score_method": method,
        "traffic_score": score,
        "traffic_level": level,
    }


@pytest.fixture
def fake_database():
    return MagicMock()


@pytest.fixture
def client(fake_database):
    def override_get_db():
        yield fake_database

    app.dependency_overrides[get_db] = (
        override_get_db
    )

    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.pop(
            get_db,
            None,
        )


def test_root_endpoint(client):
    response = client.get("/")

    assert response.status_code == 200
    assert response.json() == {
        "message": (
            "Advertising Location Intelligence API "
            "is running"
        )
    }


def test_health_endpoint(client):
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok"
    }


def test_locations_ranking(
    client,
    fake_database,
    monkeypatch,
):
    official_location = make_location(
        location_id=1,
        name="Official Count Location",
        vehicle_count_24h=16780,
    )

    context_location = make_location(
        location_id=2,
        name="Context Only Location",
        vehicle_count_24h=None,
    )

    fake_database.scalars.return_value.all.return_value = [
        official_location,
        context_location,
    ]

    monkeypatch.setattr(
        locations_routes,
        "get_latest_traffic",
        lambda database, location_id: None,
    )

    def fake_calculate_location_score(
        database,
        location,
        latest_traffic,
    ):
        if location.id == 1:
            return (
                make_spatial_data(),
                make_score_data(
                    score=82.0,
                    method="official_volume",
                    historical_available=True,
                ),
            )

        return (
            make_spatial_data(),
            make_score_data(
                score=73.0,
                method="context_only",
                historical_available=False,
            ),
        )

    monkeypatch.setattr(
        locations_routes,
        "calculate_location_score",
        fake_calculate_location_score,
    )

    response = client.get(
        "/api/locations/ranking"
    )

    assert response.status_code == 200

    data = response.json()

    assert data["total_ranked_locations"] == 1
    assert (
        data["total_context_only_locations"]
        == 1
    )

    assert (
        data["ranked_locations"][0]["rank"]
        == 1
    )

    assert (
        data["ranked_locations"][0]
        ["traffic_score"]
        == 82.0
    )


def test_location_summary_success(
    client,
    fake_database,
    monkeypatch,
):
    location = make_location(
        location_id=1,
        name="Riyadh Test Location",
    )

    fake_database.get.return_value = location

    monkeypatch.setattr(
        locations_routes,
        "get_latest_traffic",
        lambda database, location_id: None,
    )

    monkeypatch.setattr(
        locations_routes,
        "get_latest_osm_snapshot",
        lambda database, location_id: None,
    )

    monkeypatch.setattr(
        locations_routes,
        "calculate_location_score",
        lambda database, location, latest_traffic: (
            make_spatial_data(),
            make_score_data(score=73.0),
        ),
    )

    response = client.get(
        "/api/locations/1/summary"
    )

    assert response.status_code == 200

    data = response.json()

    assert data["location"]["id"] == 1
    assert (
        data["location"]["name"]
        == "Riyadh Test Location"
    )
    assert data["latest_traffic"] is None
    assert data["latest_osm_snapshot"] is None
    assert (
        data["traffic_score"]["traffic_score"]
        == 73.0
    )


def test_location_summary_not_found(
    client,
    fake_database,
):
    fake_database.get.return_value = None

    response = client.get(
        "/api/locations/999/summary"
    )

    assert response.status_code == 404
    assert response.json() == {
        "detail": "Location not found"
    }


def test_compare_locations_success(
    client,
    fake_database,
    monkeypatch,
):
    location_a = make_location(
        location_id=1,
        name="Location A",
    )

    location_b = make_location(
        location_id=2,
        name="Location B",
    )

    fake_database.get.side_effect = [
        location_a,
        location_b,
    ]

    monkeypatch.setattr(
        locations_routes,
        "get_latest_traffic",
        lambda database, location_id: None,
    )

    def fake_calculate_location_score(
        database,
        location,
        latest_traffic,
    ):
        if location.id == 1:
            return (
                make_spatial_data(
                    road_density=25.0,
                    intersections=50,
                    services=12,
                ),
                make_score_data(
                    score=73.0,
                    method="context_only",
                ),
            )

        return (
            make_spatial_data(
                road_density=18.0,
                intersections=30,
                services=8,
            ),
            make_score_data(
                score=61.0,
                method="context_only",
            ),
        )

    monkeypatch.setattr(
        locations_routes,
        "calculate_location_score",
        fake_calculate_location_score,
    )

    response = client.post(
        "/api/locations/compare",
        json={
            "location_a_id": 1,
            "location_b_id": 2,
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert (
        data["location_a"]["location_id"]
        == 1
    )
    assert (
        data["location_b"]["location_id"]
        == 2
    )
    assert data["score_difference"] == 12.0
    assert data["same_scoring_method"] is True

    assert data["recommended_location"] == {
        "location_id": 1,
        "location_name": "Location A",
    }


def test_compare_rejects_same_location(
    client,
):
    response = client.post(
        "/api/locations/compare",
        json={
            "location_a_id": 1,
            "location_b_id": 1,
        },
    )

    assert response.status_code == 400
    assert response.json() == {
        "detail": (
            "Please select two different locations"
        )
    }


def test_compare_location_not_found(
    client,
    fake_database,
):
    fake_database.get.return_value = None

    response = client.post(
        "/api/locations/compare",
        json={
            "location_a_id": 999,
            "location_b_id": 2,
        },
    )

    assert response.status_code == 404

    assert response.json() == {
        "detail": "Location 999 was not found"
    }
