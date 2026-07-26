from __future__ import annotations

import asyncio
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from math import isfinite
from time import monotonic
from typing import Any, Callable
from urllib.parse import urlencode

import httpx
from pyproj import Geod

from app.config import (
    DynamicWorldSettings,
    SatelliteSettings,
)
from app.services.dynamic_world_service import (
    DynamicWorldService,
    DynamicWorldServiceError,
)


COLLECTION = "sentinel-2-l2a"
DATASET_LABEL = "Sentinel-2 Level-2A"
DYNAMIC_WORLD_DATASET_LABEL = (
    "GOOGLE/DYNAMICWORLD/V1"
)
RESOLUTION_METERS = 10
CIRCLE_POINTS = 64
RETRY_ATTEMPTS = 2
RETRY_STATUS_CODES = {
    429,
    500,
    502,
    503,
    504,
}

EXCLUDED_SCL_CLASSES = (
    0,
    3,
    8,
    9,
    10,
    11,
)


TRUE_COLOR_EVALSCRIPT = """
//VERSION=3
function setup() {
  return {
    input: ["B02", "B03", "B04", "dataMask", "SCL"],
    output: { bands: 4 }
  };
}

function clamp(value) {
  return Math.max(0, Math.min(1, value));
}

function naturalColor(value, blackPoint, whitePoint) {
  const stretched = clamp(
    (value - blackPoint)
      / (whitePoint - blackPoint)
  );

  return Math.pow(stretched, 0.88);
}

function evaluatePixel(sample) {
  const excluded = [0, 3, 8, 9, 10, 11];
  const valid = sample.dataMask === 1
    && !excluded.includes(sample.SCL);

  if (!valid) {
    return [0, 0, 0, 0];
  }

  return [
    naturalColor(sample.B04, 0.02, 0.34),
    naturalColor(sample.B03, 0.02, 0.34),
    naturalColor(sample.B02, 0.015, 0.30),
    1
  ];
}
""".strip()


STATISTICAL_EVALSCRIPT = f"""
//VERSION=3
function setup() {{
  return {{
    input: [
      "B02", "B04", "B08", "B11",
      "SCL", "dataMask"
    ],
    output: [
      {{
        id: "indices",
        bands: 3,
        sampleType: "FLOAT32"
      }},
      {{
        id: "dataMask",
        bands: 1
      }}
    ]
  }};
}}

function safeRatio(numerator, denominator) {{
  return Math.abs(denominator) < 0.000001
    ? 0
    : numerator / denominator;
}}

function evaluatePixel(sample) {{
  const excluded = [{", ".join(
      str(value)
      for value in EXCLUDED_SCL_CLASSES
  )}];
  const valid = sample.dataMask === 1
    && !excluded.includes(sample.SCL);

  if (!valid) {{
    return {{
      indices: [0, 0, 0],
      dataMask: [0]
    }};
  }}

  const ndvi = safeRatio(
    sample.B08 - sample.B04,
    sample.B08 + sample.B04
  );
  const ndbi = safeRatio(
    sample.B11 - sample.B08,
    sample.B11 + sample.B08
  );
  const bsi = safeRatio(
    (sample.B11 + sample.B04)
      - (sample.B08 + sample.B02),
    (sample.B11 + sample.B04)
      + (sample.B08 + sample.B02)
  );

  return {{
    indices: [
      ndvi,
      ndbi,
      bsi
    ],
    dataMask: [1]
  }};
}}
""".strip()


class SatelliteServiceError(RuntimeError):
    """Sanitized Copernicus service error."""


class SatelliteNotConfiguredError(
    SatelliteServiceError
):
    pass


class SatelliteNoImageryError(
    SatelliteServiceError
):
    pass


@dataclass(frozen=True)
class SceneMetadata:
    acquisition_date: datetime
    cloud_cover_percentage: float
    scene_id: str | None
    search_period_days: int


@dataclass
class CacheEntry:
    value: Any
    expires_at: float


class SatelliteService:
    """Copernicus search, statistics, and preview client."""

    def __init__(
        self,
        settings: SatelliteSettings,
        *,
        transport: httpx.AsyncBaseTransport
        | None = None,
        dynamic_world_service:
            DynamicWorldService | None = None,
        now_factory: Callable[
            [],
            datetime,
        ] | None = None,
    ) -> None:
        self.settings = settings
        self._transport = transport
        self._dynamic_world_service = (
            dynamic_world_service
            or DynamicWorldService(
                DynamicWorldSettings
                .from_environment()
            )
        )
        self._now_factory = (
            now_factory
            or (
                lambda: datetime.now(
                    timezone.utc
                )
            )
        )
        self._token: str | None = None
        self._token_expires_at = 0.0
        self._scene_cache: dict[
            tuple[float, float, int],
            CacheEntry,
        ] = {}
        self._context_cache: dict[
            tuple[float, float, int, str],
            CacheEntry,
        ] = {}
        self._context_index: dict[
            tuple[float, float, int],
            tuple[float, float, int, str],
        ] = {}
        self._preview_cache: dict[
            tuple[float, float, int, str],
            CacheEntry,
        ] = {}
        self._locks: dict[
            tuple[float, float, int],
            asyncio.Lock,
        ] = {}

    @staticmethod
    def analysis_polygon(
        latitude: float,
        longitude: float,
        radius_meters: int,
    ) -> dict[str, Any]:
        """Create a 64-point WGS84 circular polygon."""

        geod = Geod(ellps="WGS84")
        coordinates: list[
            list[float]
        ] = []

        for index in range(CIRCLE_POINTS):
            bearing = (
                360.0
                * index
                / CIRCLE_POINTS
            )
            point_longitude, point_latitude, _ = (
                geod.fwd(
                    longitude,
                    latitude,
                    bearing,
                    radius_meters,
                )
            )
            normalized_longitude = (
                (
                    point_longitude
                    + 180.0
                )
                % 360.0
                - 180.0
            )
            coordinates.append(
                [
                    round(
                        normalized_longitude,
                        8,
                    ),
                    round(
                        point_latitude,
                        8,
                    ),
                ]
            )

        coordinates.append(
            coordinates[0]
        )

        return {
            "type": "Polygon",
            "coordinates": [coordinates],
        }

    def _client(self) -> httpx.AsyncClient:
        timeout_seconds = (
            self.settings
            .request_timeout_seconds
        )

        return httpx.AsyncClient(
            timeout=httpx.Timeout(
                timeout_seconds,
                connect=min(
                    timeout_seconds,
                    10.0,
                ),
            ),
            transport=self._transport,
            follow_redirects=True,
        )

    @staticmethod
    def _base_cache_key(
        latitude: float,
        longitude: float,
        radius_meters: int,
    ) -> tuple[float, float, int]:
        return (
            round(latitude, 5),
            round(longitude, 5),
            int(radius_meters),
        )

    @staticmethod
    def _scene_cache_key(
        base_key: tuple[
            float,
            float,
            int,
        ],
        scene: SceneMetadata,
    ) -> tuple[float, float, int, str]:
        return (
            *base_key,
            scene.acquisition_date.isoformat(),
        )

    def _cached_value(
        self,
        cache: dict[Any, CacheEntry],
        key: Any,
    ) -> Any | None:
        entry = cache.get(key)

        if entry is None:
            return None

        if entry.expires_at <= monotonic():
            cache.pop(key, None)
            return None

        return entry.value

    def _store_cache(
        self,
        cache: dict[Any, CacheEntry],
        key: Any,
        value: Any,
    ) -> None:
        cache[key] = CacheEntry(
            value=value,
            expires_at=(
                monotonic()
                + self.settings
                .cache_ttl_seconds
            ),
        )

    async def _request(
        self,
        client: httpx.AsyncClient,
        method: str,
        url: str,
        **kwargs: Any,
    ) -> httpx.Response:
        last_error: Exception | None = None

        for attempt in range(RETRY_ATTEMPTS):
            try:
                response = await client.request(
                    method,
                    url,
                    **kwargs,
                )

                if (
                    response.status_code
                    in RETRY_STATUS_CODES
                    and (
                        attempt
                        < RETRY_ATTEMPTS - 1
                    )
                ):
                    await asyncio.sleep(
                        0.15 * (attempt + 1)
                    )
                    continue

                response.raise_for_status()
                return response
            except (
                httpx.TimeoutException,
                httpx.TransportError,
                httpx.HTTPStatusError,
            ) as error:
                last_error = error

                if (
                    attempt
                    < RETRY_ATTEMPTS - 1
                    and (
                        not isinstance(
                            error,
                            httpx.HTTPStatusError,
                        )
                        or (
                            error.response.status_code
                            in RETRY_STATUS_CODES
                        )
                    )
                ):
                    await asyncio.sleep(
                        0.15 * (attempt + 1)
                    )
                    continue

                break

        raise SatelliteServiceError(
            "Copernicus request failed."
        ) from None

    async def _access_token(
        self,
        client: httpx.AsyncClient,
    ) -> str:
        if (
            self._token
            and monotonic()
            < self._token_expires_at
        ):
            return self._token

        response = await self._request(
            client,
            "POST",
            self.settings.token_url,
            data={
                "grant_type":
                    "client_credentials",
                "client_id":
                    self.settings.client_id,
                "client_secret":
                    self.settings.client_secret,
            },
            headers={
                "Accept": "application/json",
            },
        )
        payload = response.json()
        access_token = payload.get(
            "access_token"
        )

        if not isinstance(
            access_token,
            str,
        ) or not access_token:
            raise SatelliteServiceError(
                "Copernicus authentication failed."
            )

        try:
            expires_in = float(
                payload.get(
                    "expires_in",
                    300,
                )
            )
        except (TypeError, ValueError):
            expires_in = 300.0

        self._token = access_token
        self._token_expires_at = (
            monotonic()
            + max(
                30.0,
                expires_in - 60.0,
            )
        )

        return access_token

    async def _find_scene(
        self,
        client: httpx.AsyncClient,
        token: str,
        latitude: float,
        longitude: float,
        radius_meters: int,
    ) -> SceneMetadata | None:
        base_key = self._base_cache_key(
            latitude,
            longitude,
            radius_meters,
        )
        cached_scene = self._cached_value(
            self._scene_cache,
            base_key,
        )

        if cached_scene is not None:
            return cached_scene

        polygon = self.analysis_polygon(
            latitude,
            longitude,
            radius_meters,
        )
        now = self._now_factory()
        search_windows = []

        for search_days in (
            self.settings.search_days,
            180,
            365,
        ):
            if (
                search_days
                not in search_windows
            ):
                search_windows.append(
                    search_days
                )

        for search_days in search_windows:
            start = (
                now
                - timedelta(
                    days=search_days,
                )
            )
            response = await self._request(
                client,
                "POST",
                self.settings.catalog_url,
                headers={
                    "Authorization":
                        f"Bearer {token}",
                    "Accept":
                        "application/geo+json",
                },
                json={
                    "collections": [
                        COLLECTION
                    ],
                    "intersects": polygon,
                    "datetime": (
                        f"{_iso_z(start)}/"
                        f"{_iso_z(now)}"
                    ),
                    "filter": (
                        "eo:cloud_cover <= "
                        f"{self.settings.max_cloud_cover}"
                    ),
                    "filter-lang": "cql2-text",
                    "limit": 100,
                },
            )
            payload = response.json()
            features = payload.get(
                "features",
                [],
            )

            scene = _select_scene(
                features,
                search_days,
                self.settings
                .max_cloud_cover,
            )

            if scene is not None:
                self._store_cache(
                    self._scene_cache,
                    base_key,
                    scene,
                )
                return scene

        return None

    async def _statistics(
        self,
        client: httpx.AsyncClient,
        token: str,
        polygon: dict[str, Any],
        scene: SceneMetadata,
    ) -> dict[str, Any]:
        time_range = _scene_time_range(
            scene.acquisition_date
        )
        response = await self._request(
            client,
            "POST",
            self.settings.statistical_url,
            headers={
                "Authorization":
                    f"Bearer {token}",
                "Accept": "application/json",
            },
            json={
                "input": {
                    "bounds": {
                        "geometry": polygon,
                        "properties": {
                            "crs": (
                                "http://www.opengis.net/"
                                "def/crs/OGC/1.3/"
                                "CRS84"
                            )
                        },
                    },
                    "data": [
                        {
                            "type": COLLECTION,
                            "dataFilter": {
                                "timeRange":
                                    time_range,
                                "mosaickingOrder":
                                    "leastCC",
                                "maxCloudCoverage":
                                    self.settings
                                    .max_cloud_cover,
                            },
                        }
                    ],
                },
                "aggregation": {
                    "timeRange": time_range,
                    "aggregationInterval": {
                        "of": "P1D",
                    },
                    "resx": (
                        RESOLUTION_METERS
                    ),
                    "resy": (
                        RESOLUTION_METERS
                    ),
                    "evalscript":
                        STATISTICAL_EVALSCRIPT,
                },
            },
        )

        return _parse_statistics(
            response.json()
        )

    async def get_context(
        self,
        latitude: float,
        longitude: float,
        radius_meters: int,
    ) -> dict[str, Any]:
        """Return a safe context status and analysis."""

        if not self.settings.is_configured:
            return {
                "status": "not_configured",
                "message": (
                    "Satellite analysis is "
                    "not configured."
                ),
            }

        if (
            not self._dynamic_world_service
            .is_configured
        ):
            return {
                "status": "not_configured",
                "message": (
                    "Dynamic World analysis is "
                    "not configured."
                ),
            }

        base_key = self._base_cache_key(
            latitude,
            longitude,
            radius_meters,
        )
        indexed_key = (
            self._context_index.get(
                base_key
            )
        )

        if indexed_key is not None:
            cached_context = (
                self._cached_value(
                    self._context_cache,
                    indexed_key,
                )
            )

            if cached_context is not None:
                return cached_context

        lock = self._locks.setdefault(
            base_key,
            asyncio.Lock(),
        )

        async with lock:
            indexed_key = (
                self._context_index.get(
                    base_key
                )
            )

            if indexed_key is not None:
                cached_context = (
                    self._cached_value(
                        self._context_cache,
                        indexed_key,
                    )
                )

                if cached_context is not None:
                    return cached_context

            try:
                async with self._client() as client:
                    token = await self._access_token(
                        client
                    )
                    scene = await self._find_scene(
                        client,
                        token,
                        latitude,
                        longitude,
                        radius_meters,
                    )

                    if scene is None:
                        return {
                            "status":
                                "no_imagery",
                            "message": (
                                "No suitable "
                                "low-cloud imagery "
                                "was found."
                            ),
                        }

                    scene_key = (
                        self._scene_cache_key(
                            base_key,
                            scene,
                        )
                    )
                    cached_context = (
                        self._cached_value(
                            self._context_cache,
                            scene_key,
                        )
                    )

                    if cached_context is not None:
                        self._context_index[
                            base_key
                        ] = scene_key
                        return cached_context

                    polygon = (
                        self.analysis_polygon(
                            latitude,
                            longitude,
                            radius_meters,
                        )
                    )
                    (
                        statistics,
                        dynamic_world,
                    ) = await asyncio.gather(
                        self._statistics(
                            client,
                            token,
                            polygon,
                            scene,
                        ),
                        self._dynamic_world_service
                        .get_probabilities(
                            latitude=latitude,
                            longitude=longitude,
                            radius_meters=(
                                radius_meters
                            ),
                            reference_date=(
                                scene
                                .acquisition_date
                            ),
                        ),
                    )
                    response = (
                        self._build_context(
                            latitude,
                            longitude,
                            radius_meters,
                            scene,
                            statistics,
                            dynamic_world,
                        )
                    )
                    self._store_cache(
                        self._context_cache,
                        scene_key,
                        response,
                    )
                    self._context_index[
                        base_key
                    ] = scene_key
                    return response
            except (
                SatelliteServiceError,
                DynamicWorldServiceError,
            ):
                return {
                    "status":
                        "temporarily_unavailable",
                    "message": (
                        "Satellite data is "
                        "temporarily unavailable."
                    ),
                }
            except (
                KeyError,
                TypeError,
                ValueError,
            ):
                return {
                    "status":
                        "temporarily_unavailable",
                    "message": (
                        "Satellite data is "
                        "temporarily unavailable."
                    ),
                }

    def _build_context(
        self,
        latitude: float,
        longitude: float,
        radius_meters: int,
        scene: SceneMetadata,
        statistics: dict[str, Any],
        dynamic_world: dict[str, Any],
    ) -> dict[str, Any]:
        valid_percentage = dynamic_world[
            "valid_pixel_percentage"
        ]
        probabilities = dynamic_world[
            "probabilities"
        ]

        query = urlencode(
            {
                "latitude": latitude,
                "longitude": longitude,
                "radius_meters":
                    radius_meters,
            }
        )

        return {
            "status": "available",
            "requested_point": {
                "latitude": latitude,
                "longitude": longitude,
                "radius_meters":
                    radius_meters,
            },
            "imagery": {
                "acquisition_date":
                    _iso_z(
                        scene.acquisition_date
                    ),
                "cloud_cover_percentage":
                    round(
                        scene
                        .cloud_cover_percentage,
                        2,
                    ),
                "resolution_meters":
                    RESOLUTION_METERS,
                "collection": COLLECTION,
                "scene_id": scene.scene_id,
                "search_period_days":
                    scene.search_period_days,
                "preview_url": (
                    "/api/satellite/preview?"
                    f"{query}"
                ),
            },
            "land_context": {
                "built_percentage":
                    probabilities["built"],
                "bare_percentage":
                    probabilities["bare"],
                "vegetation_percentage":
                    probabilities["vegetation"],
                "water_percentage":
                    probabilities["water"],
                "other_percentage":
                    probabilities["other"],
                "probability_sum_percentage":
                    dynamic_world[
                        "probability_sum_percentage"
                    ],
                "valid_pixel_percentage":
                    valid_percentage,
                "masked_pixel_percentage":
                    dynamic_world[
                        "masked_pixel_percentage"
                    ],
            },
            "spectral_indices": {
                "mean_ndvi":
                    statistics["mean_ndvi"],
                "mean_ndbi":
                    statistics["mean_ndbi"],
                "mean_bsi":
                    statistics["mean_bsi"],
            },
            "quality": {
                "analysis_confidence":
                    dynamic_world[
                        "analysis_confidence"
                    ],
                "mean_top_probability_percentage":
                    dynamic_world[
                        "mean_top_probability_percentage"
                    ],
                "classification_acquisition_date":
                    dynamic_world[
                        "acquisition_date"
                    ],
                "matched_preview_date":
                    dynamic_world[
                        "matched_reference_date"
                    ],
                "model_image_count":
                    dynamic_world["image_count"],
                "limitations":
                    dynamic_world["limitations"],
            },
            "source": {
                "provider":
                    "Google Earth Engine",
                "dataset":
                    DYNAMIC_WORLD_DATASET_LABEL,
                "supporting_provider": (
                    "Copernicus Data Space "
                    "Ecosystem"
                ),
                "supporting_dataset":
                    DATASET_LABEL,
            },
            "is_estimated": True,
        }

    async def get_preview(
        self,
        latitude: float,
        longitude: float,
        radius_meters: int,
    ) -> bytes:
        """Return a cached server-side PNG preview."""

        if not self.settings.is_configured:
            raise SatelliteNotConfiguredError(
                "Satellite analysis is not configured."
            )

        base_key = self._base_cache_key(
            latitude,
            longitude,
            radius_meters,
        )

        try:
            async with self._client() as client:
                token = await self._access_token(
                    client
                )
                scene = await self._find_scene(
                    client,
                    token,
                    latitude,
                    longitude,
                    radius_meters,
                )

                if scene is None:
                    raise SatelliteNoImageryError(
                        "No suitable imagery was found."
                    )

                scene_key = (
                    self._scene_cache_key(
                        base_key,
                        scene,
                    )
                )
                cached_preview = (
                    self._cached_value(
                        self._preview_cache,
                        scene_key,
                    )
                )

                if cached_preview is not None:
                    return cached_preview

                polygon = self.analysis_polygon(
                    latitude,
                    longitude,
                    radius_meters,
                )
                response = await self._request(
                    client,
                    "POST",
                    self.settings.process_url,
                    headers={
                        "Authorization":
                            f"Bearer {token}",
                        "Accept": "image/png",
                    },
                    json={
                        "input": {
                            "bounds": {
                                "geometry": polygon,
                                "properties": {
                                    "crs": (
                                        "http://www."
                                        "opengis.net/"
                                        "def/crs/OGC/"
                                        "1.3/CRS84"
                                    )
                                },
                            },
                            "data": [
                                {
                                    "type":
                                        COLLECTION,
                                    "dataFilter": {
                                        "timeRange":
                                            _scene_time_range(
                                                scene
                                                .acquisition_date
                                            ),
                                        "mosaickingOrder":
                                            "leastCC",
                                        "maxCloudCoverage":
                                            self.settings
                                            .max_cloud_cover,
                                    },
                                    "processing": {
                                        "upsampling":
                                            "BICUBIC",
                                    },
                                }
                            ],
                        },
                        "output": {
                            "width": 512,
                            "height": 512,
                            "responses": [
                                {
                                    "identifier":
                                        "default",
                                    "format": {
                                        "type":
                                            "image/png"
                                    },
                                }
                            ],
                        },
                        "evalscript":
                            TRUE_COLOR_EVALSCRIPT,
                    },
                )
                preview = response.content

                if not preview:
                    raise SatelliteServiceError(
                        "Copernicus preview was empty."
                    )

                self._store_cache(
                    self._preview_cache,
                    scene_key,
                    preview,
                )
                return preview
        except (
            SatelliteNotConfiguredError,
            SatelliteNoImageryError,
        ):
            raise
        except SatelliteServiceError:
            raise
        except (
            KeyError,
            TypeError,
            ValueError,
        ):
            raise SatelliteServiceError(
                "Satellite preview is unavailable."
            ) from None


def _iso_z(value: datetime) -> str:
    aware_value = (
        value.replace(
            tzinfo=timezone.utc
        )
        if value.tzinfo is None
        else value.astimezone(
            timezone.utc
        )
    )

    return (
        aware_value
        .isoformat()
        .replace("+00:00", "Z")
    )


def _scene_time_range(
    acquisition_date: datetime,
) -> dict[str, str]:
    utc_date = (
        acquisition_date
        .astimezone(timezone.utc)
    )
    start = utc_date.replace(
        hour=0,
        minute=0,
        second=0,
        microsecond=0,
    )
    end = start + timedelta(days=1)

    return {
        "from": _iso_z(start),
        "to": _iso_z(end),
    }


def _finite_number(
    value: Any,
    default: float = 0.0,
) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return default

    return parsed if isfinite(parsed) else default


def _parse_datetime(
    value: Any,
) -> datetime | None:
    if not isinstance(value, str):
        return None

    try:
        parsed = datetime.fromisoformat(
            value.replace(
                "Z",
                "+00:00",
            )
        )
    except ValueError:
        return None

    if parsed.tzinfo is None:
        return parsed.replace(
            tzinfo=timezone.utc
        )

    return parsed.astimezone(
        timezone.utc
    )


def _select_scene(
    features: Any,
    search_period_days: int,
    max_cloud_cover: float,
) -> SceneMetadata | None:
    if not isinstance(features, list):
        return None

    scenes = []

    for feature in features:
        if not isinstance(feature, dict):
            continue

        properties = feature.get(
            "properties",
            {},
        )

        if not isinstance(properties, dict):
            continue

        acquisition_date = _parse_datetime(
            properties.get("datetime")
        )
        cloud_cover = _finite_number(
            properties.get(
                "eo:cloud_cover"
            ),
            default=-1.0,
        )

        if (
            acquisition_date is None
            or cloud_cover < 0
            or cloud_cover
            > max_cloud_cover
        ):
            continue

        scene_id = feature.get("id")
        scenes.append(
            SceneMetadata(
                acquisition_date=
                    acquisition_date,
                cloud_cover_percentage=
                    cloud_cover,
                scene_id=(
                    str(scene_id)
                    if scene_id is not None
                    else None
                ),
                search_period_days=
                    search_period_days,
            )
        )

    if not scenes:
        return None

    return max(
        scenes,
        key=lambda scene:
            scene.acquisition_date,
    )


def _band_stats(
    bands: dict[str, Any],
    index: int,
) -> dict[str, Any]:
    band = bands.get(
        f"B{index}",
        {},
    )

    if not isinstance(band, dict):
        return {}

    stats = band.get("stats", {})

    return (
        stats
        if isinstance(stats, dict)
        else {}
    )


def _parse_statistics(
    payload: dict[str, Any],
) -> dict[str, Any]:
    data = payload.get("data", [])

    if not isinstance(data, list):
        raise SatelliteServiceError(
            "Satellite statistics are invalid."
        )

    interval = next(
        (
            item
            for item in data
            if isinstance(item, dict)
            and item.get("outputs")
        ),
        None,
    )

    if interval is None:
        raise SatelliteServiceError(
            "Satellite statistics are unavailable."
        )

    outputs = interval.get("outputs", {})
    indices = outputs.get("indices", {})
    bands = indices.get("bands", {})

    if not isinstance(bands, dict):
        raise SatelliteServiceError(
            "Satellite statistics are invalid."
        )

    first_stats = _band_stats(
        bands,
        0,
    )
    sample_count = _finite_number(
        first_stats.get("sampleCount")
    )
    no_data_count = _finite_number(
        first_stats.get("noDataCount")
    )

    if sample_count <= 0:
        raise SatelliteServiceError(
            "Satellite statistics contain no pixels."
        )

    valid_count = max(
        0.0,
        sample_count - no_data_count,
    )
    valid_percentage = (
        valid_count
        / sample_count
        * 100.0
    )

    return {
        "mean_ndvi": round(
            max(
                -1.0,
                min(
                    _finite_number(
                        _band_stats(
                            bands,
                            0,
                        ).get("mean")
                    ),
                    1.0,
                ),
            ),
            4,
        ),
        "mean_ndbi": round(
            max(
                -1.0,
                min(
                    _finite_number(
                        _band_stats(
                            bands,
                            1,
                        ).get("mean")
                    ),
                    1.0,
                ),
            ),
            4,
        ),
        "mean_bsi": round(
            max(
                -1.0,
                min(
                    _finite_number(
                        _band_stats(
                            bands,
                            2,
                        ).get("mean")
                    ),
                    1.0,
                ),
            ),
            4,
        ),
        "valid_pixel_percentage": round(
            valid_percentage,
            2,
        ),
        "masked_pixel_percentage": round(
            100.0 - valid_percentage,
            2,
        ),
    }
