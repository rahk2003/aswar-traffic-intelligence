# Aswar Traffic Intelligence

Aswar Traffic Intelligence is a bilingual geospatial platform for evaluating and comparing outdoor advertising locations using traffic conditions, road density, nearby services, and satellite-based land-cover context.

## Overview

The platform combines interactive map selection, road-network analysis, nearby-service discovery, live traffic context, and satellite-derived land-cover information to support outdoor advertising site evaluation. Users can analyze a location, compare two locations with the same selected radius, review the factors behind the calculated Traffic Score, ask the AI assistant to explain the results, and export a PDF report.

The user interface supports both Arabic and English. The FastAPI backend performs the analysis and keeps Traffic Score calculation separate from satellite interpretation and AI-generated explanations.

> Satellite imagery and AI explanations provide contextual insights only. They do not modify the Traffic Score or its calculation weights.

## Key Features

- Interactive map-based location selection, including direct coordinate entry.
- User-selectable analysis radius: 250, 500, 750, 1,000, or 2,000 meters.
- Traffic Score calculation.
- Road density and intersection analysis.
- Nearby services analysis.
- Live traffic context from TomTom.
- Location comparison using the same selected radius for both points.
- Satellite context from Google Dynamic World and Copernicus Sentinel-2.
- Bilingual Arabic and English interface.
- AI-generated explanations based on the current analysis result.
- PDF report generation.

## Technology Stack

- **Frontend:** React, Vite, and Leaflet.
- **Backend:** Python and FastAPI.
- **Database:** PostgreSQL with PostGIS.
- **Road and place data:** OpenStreetMap through the Overpass API.
- **Live traffic data:** TomTom Traffic API.
- **Primary land-cover classification:** Google Dynamic World through Google Earth Engine.
- **Satellite imagery:** Copernicus Sentinel-2.
- **Supporting satellite indicators:** NDVI, NDBI, and BSI.
- **AI explanations:** A deterministic local explanation layer with optional Ollama integration.

## Project Structure

```text
aswar-traffic-intelligence/
├── backend/
│   ├── app/
│   │   ├── routes/
│   │   └── services/
│   ├── scripts/
│   ├── tests/
│   ├── .env.example
│   └── requirements.txt
├── frontend/
│   ├── public/
│   ├── src/
│   ├── .env.example
│   └── package.json
└── README.md
```

## Prerequisites

- Python 3.11 or later.
- Node.js and npm.
- PostgreSQL with the PostGIS extension.
- A TomTom API key for live traffic context.
- Optional Copernicus credentials for Sentinel-2 imagery.
- Optional Google Cloud and Google Earth Engine credentials for Dynamic World analysis.
- Optional Ollama access for model-generated assistant responses.

## Local Setup

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

Review `backend/.env` and provide the services and credentials required for the features you intend to use. Never commit real API keys or service-account credentials.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend uses `http://127.0.0.1:8000` as the default API base URL. To use another backend address, copy `frontend/.env.example` to `frontend/.env` and set `VITE_API_BASE_URL`.

## Environment Variables

Copy the example files before starting local development:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Backend variables:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL and PostGIS connection string. |
| `TOMTOM_API_KEY` | TomTom API key used for live traffic context. |
| `OLLAMA_BASE_URL` | Optional Ollama server URL. |
| `OLLAMA_MODEL` | Optional Ollama model name. |
| `OLLAMA_TIMEOUT_SECONDS` | Ollama request timeout. |
| `OVERPASS_REQUEST_TIMEOUT_SECONDS` | Overall OpenStreetMap Overpass request timeout. |
| `OVERPASS_CONNECT_TIMEOUT_SECONDS` | Overpass connection timeout. |
| `OVERPASS_QUERY_TIMEOUT_SECONDS` | Timeout passed to Overpass queries. |
| `TOMTOM_REQUEST_TIMEOUT_SECONDS` | TomTom request timeout. |
| `COPERNICUS_CLIENT_ID` | Copernicus OAuth client identifier. |
| `COPERNICUS_CLIENT_SECRET` | Copernicus OAuth client secret. |
| `COPERNICUS_TOKEN_URL` | Copernicus authentication endpoint. |
| `COPERNICUS_CATALOG_URL` | Copernicus catalogue endpoint. |
| `COPERNICUS_PROCESS_URL` | Copernicus image-processing endpoint. |
| `COPERNICUS_STATISTICAL_URL` | Copernicus statistical endpoint. |
| `SATELLITE_MAX_CLOUD_COVER` | Maximum preferred Sentinel-2 cloud-cover percentage. |
| `SATELLITE_SEARCH_DAYS` | Initial Sentinel-2 search window in days. |
| `SATELLITE_CACHE_TTL_SECONDS` | Satellite result cache lifetime. |
| `SATELLITE_REQUEST_TIMEOUT_SECONDS` | Copernicus request timeout. |
| `GOOGLE_CLOUD_PROJECT` | Google Cloud project enabled for Earth Engine. |
| `GOOGLE_APPLICATION_CREDENTIALS` | Absolute path to a backend-only service-account JSON file. |
| `DYNAMIC_WORLD_DATASET` | Earth Engine Dynamic World dataset identifier. |
| `DYNAMIC_WORLD_SEARCH_DAYS` | Dynamic World image search window. |
| `DYNAMIC_WORLD_MAX_PIXELS` | Maximum number of pixels allowed during regional reduction. |
| `DYNAMIC_WORLD_REQUEST_TIMEOUT_SECONDS` | Dynamic World request timeout. |

Frontend variable:

| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | Base URL used by the frontend to call the FastAPI backend. |

Use placeholders in shared examples and documentation. Real credentials must remain in local, Git-ignored files and must never be sent to the browser.

## Traffic Analysis

The point-analysis workflow accepts map selection or manually entered coordinates. Before running the analysis, the user selects a radius of 250, 500, 750, 1,000, or 2,000 meters. The initial suggested value is 500 meters, but it is not hardcoded as the required radius. The exact selection is sent to the backend as `radius_meters`.

The backend evaluates the road network and nearby services inside the selected area, including road categories, road density, intersections, and relevant nearby places. TomTom supplies the current traffic context when configured. The resulting Traffic Score is calculated on the backend from the available traffic and spatial factors.

The comparison workflow applies the same user-selected radius to both locations and reports that radius with the comparison result. If the radius changes, the previous result is no longer representative of the selected area and must be recalculated.

Where stored official 24-hour measurements are available, the platform can display them as recorded observations. Analysis of an arbitrary map point does not imply that an official vehicle count exists for that point.

External-source failures are handled explicitly:

- If either OpenStreetMap or TomTom is unavailable, the API can return a partial result with `data_warnings`. A Traffic Score is not produced when its required inputs are incomplete.
- If both traffic-analysis sources are unavailable, the API returns a meaningful `502` response instead of presenting an unsupported result.

## Satellite Context Analysis

Google Dynamic World is the primary land-cover classifier. The backend accesses `GOOGLE/DYNAMICWORLD/V1` through Google Earth Engine and calculates the mean of the probability bands inside the selected circular area with `reduceRegion` at a 10-meter scale.

The probabilities are combined into five display categories whose total should remain close to 100 percent:

- **Built:** `built`.
- **Bare ground:** `bare`.
- **Vegetation:** `trees` + `grass` + `flooded_vegetation` + `crops` + `shrub_and_scrub`.
- **Water:** `water`.
- **Other:** `snow_and_ice`.

Classification confidence is reported separately from the land-cover percentages. It is based on the mean highest class probability and the valid-pixel coverage. Low-confidence pixels are not removed through a fixed probability threshold and are not automatically converted into an unknown class.

Copernicus Sentinel-2 imagery remains the visual satellite preview. The backend initially searches for the newest suitable image with no more than 20 percent cloud cover within the previous 90 days, then expands the search to 180 and 365 days when necessary. The preview is a 512 by 512 true-color image using bands B02, B03, and B04. It is delivered through a backend proxy so authentication details are never exposed to the frontend.

NDVI, NDBI, and BSI are supporting indicators only. They do not replace Dynamic World classification. Sentinel-2 processing uses `dataMask` and the Scene Classification Layer to exclude no-data pixels, cloud shadows, clouds, cirrus, and snow or ice where appropriate.

Example backend configuration:

```env
COPERNICUS_CLIENT_ID=your-client-id
COPERNICUS_CLIENT_SECRET=your-client-secret

GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account.json
```

The credentials are used by the backend only. Satellite responses are cached for six hours by default. If Dynamic World or Copernicus is not configured or is temporarily unavailable, the satellite endpoint returns a structured availability status while the main traffic analysis remains usable.

Satellite results describe land-cover context. They do not represent vehicle counts and do not modify the Traffic Score or its weights.

## AI Assistant

The assistant explains the current analysis result in plain language. It can describe why a location received its score, identify strong and weak factors, discuss site suitability, suggest ways to improve evaluation confidence, and interpret the satellite context shown for the selected area.

Assistant responses are grounded in the current result supplied to `/api/assistant/explain`. The assistant does not recalculate the Traffic Score, change its weights, or modify stored analysis data. A deterministic local explanation remains available when optional Ollama configuration is absent or the model service cannot be reached.

## API Endpoints

```text
GET  /
GET  /api/health
GET  /api/locations/ranking
POST /api/locations/compare
POST /api/locations/analyze-point
GET  /api/locations/{location_id}/summary
POST /api/assistant/explain
GET  /api/satellite/context
GET  /api/satellite/preview
```

## Testing

Run the backend test suite:

```bash
cd backend
python -m pytest -q
```

Run frontend validation:

```bash
cd frontend
npm run lint
npm run build
```

Run real-source and performance validation when the required services and credentials are available:

```bash
cd backend
python -m scripts.validate_multiple_locations --radius 500
python -m scripts.measure_performance --iterations 25
python -m scripts.measure_satellite --radius 500
```

The automated backend tests mock external services where appropriate. Real-source validation scripts depend on network access and correctly configured environment variables.

## Data Sources

- **OpenStreetMap:** Road-network geometry, intersections, and nearby places accessed through the Overpass API.
- **TomTom:** Current traffic flow and congestion context.
- **Google Dynamic World:** Deep-learning land-cover probabilities derived from Sentinel-2 imagery and accessed through Google Earth Engine.
- **Copernicus Sentinel-2:** True-color satellite imagery and supporting spectral bands.
- **PostgreSQL and PostGIS:** Stored locations, spatial data, and available recorded measurements.

OpenStreetMap, TomTom, Google Earth Engine, Dynamic World, Copernicus, and Sentinel-2 data must be used in accordance with their respective terms, licensing requirements, and attribution rules.

## Important Notes

> Satellite imagery and AI explanations provide contextual insights only. They do not modify the Traffic Score or its calculation weights.

- The Traffic Score is an analytical decision-support result, not a guarantee of advertising performance or an official traffic count.
- Satellite classification, confidence, and imagery dates must be presented with the returned source metadata and limitations.
- The PDF report reflects the analysis currently displayed in the frontend and does not create a separate scoring method.
- Partial results must be clearly labeled whenever an external data source is unavailable.
- API keys and service-account files must stay on the backend and must never be committed to Git.
