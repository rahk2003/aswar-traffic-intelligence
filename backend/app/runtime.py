import os
from dataclasses import dataclass
from pathlib import Path
from typing import Literal


DemoSetting = Literal["auto", "true", "false"]
RuntimeMode = Literal["demo", "live"]


def get_demo_setting() -> DemoSetting:
    value = os.getenv(
        "DEMO_MODE",
        "auto",
    ).strip().lower()

    if value not in {
        "auto",
        "true",
        "false",
    }:
        return "auto"

    return value


def _configured(value: str | None) -> bool:
    return bool(
        value
        and value.strip()
    )


def get_service_statuses() -> dict[str, str]:
    credentials_path = os.getenv(
        "GOOGLE_APPLICATION_CREDENTIALS",
        "",
    ).strip()
    earth_engine_configured = bool(
        _configured(
            os.getenv("GOOGLE_CLOUD_PROJECT")
        )
        and credentials_path
        and Path(
            credentials_path
        ).expanduser().is_file()
    )
    copernicus_configured = bool(
        _configured(
            os.getenv("COPERNICUS_CLIENT_ID")
        )
        and _configured(
            os.getenv(
                "COPERNICUS_CLIENT_SECRET"
            )
        )
    )

    return {
        "database": (
            "configured"
            if _configured(
                os.getenv("DATABASE_URL")
            )
            else "unconfigured"
        ),
        "tomtom": (
            "configured"
            if _configured(
                os.getenv("TOMTOM_API_KEY")
            )
            else "unconfigured"
        ),
        "earth_engine": (
            "configured"
            if earth_engine_configured
            else "unconfigured"
        ),
        "copernicus": (
            "configured"
            if copernicus_configured
            else "unconfigured"
        ),
        "openstreetmap": "available",
        "ollama": (
            "configured"
            if _configured(
                os.getenv("OLLAMA_BASE_URL")
            )
            else "unconfigured"
        ),
    }


@dataclass(frozen=True)
class RuntimeStatus:
    requested_mode: DemoSetting
    mode: RuntimeMode
    services: dict[str, str]
    demo_reason: str | None

    @property
    def is_demo(self) -> bool:
        return self.mode == "demo"


def get_runtime_status() -> RuntimeStatus:
    requested_mode = get_demo_setting()
    services = get_service_statuses()
    required_services = (
        "database",
        "tomtom",
        "earth_engine",
        "copernicus",
    )
    missing_services = [
        service
        for service in required_services
        if services[service]
        != "configured"
    ]

    if requested_mode == "true":
        return RuntimeStatus(
            requested_mode=requested_mode,
            mode="demo",
            services=services,
            demo_reason="forced",
        )

    if (
        requested_mode == "auto"
        and missing_services
    ):
        return RuntimeStatus(
            requested_mode=requested_mode,
            mode="demo",
            services=services,
            demo_reason=(
                "missing_services:"
                + ",".join(missing_services)
            ),
        )

    return RuntimeStatus(
        requested_mode=requested_mode,
        mode="live",
        services=services,
        demo_reason=None,
    )


def is_demo_mode() -> bool:
    return get_runtime_status().is_demo
