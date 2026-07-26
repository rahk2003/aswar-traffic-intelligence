import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def _integer_setting(
    name: str,
    default: int,
    minimum: int,
    maximum: int,
) -> int:
    try:
        value = int(
            os.getenv(name, str(default))
        )
    except (TypeError, ValueError):
        value = default

    return max(
        minimum,
        min(value, maximum),
    )


def _float_setting(
    name: str,
    default: float,
    minimum: float,
    maximum: float,
) -> float:
    try:
        value = float(
            os.getenv(name, str(default))
        )
    except (TypeError, ValueError):
        value = default

    return max(
        minimum,
        min(value, maximum),
    )


@dataclass(frozen=True)
class SatelliteSettings:
    """Environment-backed Copernicus settings."""

    client_id: str
    client_secret: str
    token_url: str
    catalog_url: str
    process_url: str
    statistical_url: str
    max_cloud_cover: float
    search_days: int
    cache_ttl_seconds: int
    request_timeout_seconds: float

    @property
    def is_configured(self) -> bool:
        return bool(
            self.client_id
            and self.client_secret
        )

    @classmethod
    def from_environment(
        cls,
    ) -> "SatelliteSettings":
        return cls(
            client_id=os.getenv(
                "COPERNICUS_CLIENT_ID",
                "",
            ).strip(),
            client_secret=os.getenv(
                "COPERNICUS_CLIENT_SECRET",
                "",
            ).strip(),
            token_url=os.getenv(
                "COPERNICUS_TOKEN_URL",
                (
                    "https://identity.dataspace."
                    "copernicus.eu/auth/realms/"
                    "CDSE/protocol/openid-connect/"
                    "token"
                ),
            ).strip(),
            catalog_url=os.getenv(
                "COPERNICUS_CATALOG_URL",
                (
                    "https://sh.dataspace."
                    "copernicus.eu/catalog/v1/search"
                ),
            ).strip(),
            process_url=os.getenv(
                "COPERNICUS_PROCESS_URL",
                (
                    "https://sh.dataspace."
                    "copernicus.eu/process/v1"
                ),
            ).strip(),
            statistical_url=os.getenv(
                "COPERNICUS_STATISTICAL_URL",
                (
                    "https://sh.dataspace."
                    "copernicus.eu/statistics/v1"
                ),
            ).strip(),
            max_cloud_cover=_float_setting(
                "SATELLITE_MAX_CLOUD_COVER",
                20.0,
                0.0,
                100.0,
            ),
            search_days=_integer_setting(
                "SATELLITE_SEARCH_DAYS",
                90,
                1,
                365,
            ),
            cache_ttl_seconds=_integer_setting(
                "SATELLITE_CACHE_TTL_SECONDS",
                21600,
                60,
                86400,
            ),
            request_timeout_seconds=_float_setting(
                "SATELLITE_REQUEST_TIMEOUT_SECONDS",
                30.0,
                1.0,
                60.0,
            ),
        )


@dataclass(frozen=True)
class DynamicWorldSettings:
    """Environment-backed Google Earth Engine settings."""

    project_id: str
    credentials_path: str
    dataset: str
    search_days: int
    max_pixels: int

    @property
    def is_configured(self) -> bool:
        return bool(
            self.project_id
            and self.credentials_path
            and Path(
                self.credentials_path
            ).is_file()
        )

    @classmethod
    def from_environment(
        cls,
    ) -> "DynamicWorldSettings":
        credentials_path = os.getenv(
            "GOOGLE_APPLICATION_CREDENTIALS",
            "",
        ).strip()

        if credentials_path:
            credentials_path = str(
                Path(
                    credentials_path
                ).expanduser()
            )

        return cls(
            project_id=os.getenv(
                "GOOGLE_CLOUD_PROJECT",
                "",
            ).strip(),
            credentials_path=credentials_path,
            dataset=os.getenv(
                "DYNAMIC_WORLD_DATASET",
                "GOOGLE/DYNAMICWORLD/V1",
            ).strip(),
            search_days=_integer_setting(
                "DYNAMIC_WORLD_SEARCH_DAYS",
                30,
                1,
                365,
            ),
            max_pixels=_integer_setting(
                "DYNAMIC_WORLD_MAX_PIXELS",
                5_000_000,
                100_000,
                100_000_000,
            ),
        )
