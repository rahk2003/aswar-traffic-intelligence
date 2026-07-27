import pytest


@pytest.fixture(autouse=True)
def default_tests_to_live_mode(
    monkeypatch,
):
    monkeypatch.setenv(
        "DEMO_MODE",
        "false",
    )
