import {
  lazy,
  Suspense,
  useEffect,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import {
  MapContainer,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

import {
  CoordinateInput,
  DataWarnings,
  ErrorState,
  LoadingState,
  LocationMarker,
  MetricCard,
  ScoreCard,
  ServicesBreakdown,
} from "../components/AnalysisComponents";
import { analyzePoint } from "../services/api";
import {
  ANALYSIS_RADIUS_OPTIONS,
  formatCoordinate,
  formatNumber,
  getErrorMessage,
  getRoadName,
  getRoadTypeLabel,
  getTrafficLevelCode,
  hasValue,
  mergeServiceCategories,
} from "../utils/analysis";


const RIYADH_CENTER = [
  24.7136,
  46.6753,
];
const AnalysisDashboard = lazy(
  () => import(
    "../components/DashboardComponents"
  ),
);


function MapClickHandler({ onSelect }) {
  useMapEvents({
    click(event) {
      onSelect({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
      });
    },
  });

  return null;
}


function SelectedPointMapController({ point }) {
  const map = useMap();

  useEffect(() => {
    if (!point) {
      return;
    }

    map.setView(
      [
        point.latitude,
        point.longitude,
      ],
      Math.max(map.getZoom(), 14),
    );
  }, [
    map,
    point,
  ]);

  return null;
}


function MapAnalysisOverlay({
  point,
  radius,
  roadName,
  t,
  formatValue,
}) {
  if (!point) {
    return null;
  }

  return (
    <aside
      className="map-analysis-overlay"
      aria-label={t("dashboard.mapSummary")}
    >
      <strong>{t("dashboard.mapSummary")}</strong>

      <span dir="ltr">
        {formatCoordinate(point.latitude)}
        {", "}
        {formatCoordinate(point.longitude)}
      </span>

      <span>
        {t(
          "map.radiusCurrent",
          {
            radius: formatValue(radius),
          },
        )}
      </span>

      <span>
        {t("dashboard.nearestRoad")}
        {": "}
        {roadName || t("common.unavailable")}
      </span>
    </aside>
  );
}


function MapPage() {
  const { t, i18n } = useTranslation();
  const [selectedPoint, setSelectedPoint] =
    useState(null);
  const [radius, setRadius] = useState(500);
  const [result, setResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] =
    useState(false);
  const [errorMessage, setErrorMessage] =
    useState("");
  const [servicesExpanded, setServicesExpanded] =
    useState(false);

  const isArabic =
    i18n.language.startsWith("ar");
  const unavailable = t("common.unavailable");


  function displayNumber(
    value,
    maximumFractionDigits = 0,
  ) {
    return formatNumber(
      value,
      i18n.language,
      unavailable,
      maximumFractionDigits,
    );
  }


  function handlePointSelection(point) {
    setSelectedPoint(point);
    setResult(null);
    setErrorMessage("");
    setServicesExpanded(false);
  }


  function handleRadiusChange(event) {
    setRadius(Number(event.target.value));
    setResult(null);
    setErrorMessage("");
    setServicesExpanded(false);
  }


  function handleClear() {
    if (isAnalyzing) {
      return;
    }

    setSelectedPoint(null);
    setResult(null);
    setErrorMessage("");
    setServicesExpanded(false);
  }


  async function handleAnalyze() {
    if (!selectedPoint || isAnalyzing) {
      return;
    }

    try {
      setIsAnalyzing(true);
      setErrorMessage("");
      setResult(null);
      setServicesExpanded(false);

      const analysis = await analyzePoint({
        latitude: selectedPoint.latitude,
        longitude: selectedPoint.longitude,
        radiusMeters: radius,
      });

      setResult(analysis);
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, t),
      );
    } finally {
      setIsAnalyzing(false);
    }
  }


  const spatial = result?.spatial_analysis;
  const traffic = result?.live_traffic;
  const score = result?.traffic_score;
  const resultRadius =
    spatial?.radius_meters
    ?? result?.requested_point?.radius_meters
    ?? radius;
  const serviceCategories =
    mergeServiceCategories(spatial);
  const roadName =
    getRoadName(spatial, isArabic);
  const roadTypeLabel = getRoadTypeLabel(
    spatial?.nearest_road_type,
    t,
  );
  const levelCode =
    getTrafficLevelCode(score);
  const levelLabel = t(
    `levels.${levelCode}`,
    {
      defaultValue:
        score?.traffic_level
        || t("levels.unknown"),
    },
  );

  const loadingSteps = [
    t("map.loadingRoads"),
    t("map.loadingServices"),
    t("map.loadingTraffic"),
    t("map.loadingScore"),
  ];


  return (
    <main className="map-page">
      <section className="map-page-header">
        <div>
          <span className="eyebrow">
            {t("map.eyebrow")}
          </span>

          <h1>{t("map.title")}</h1>
          <p>{t("map.description")}</p>
        </div>

        <label className="radius-control">
          <span className="radius-control-copy">
            <strong>{t("map.radius")}</strong>
            <small>
              {t("map.radiusDescription")}
            </small>
          </span>

          <select
            value={radius}
            onChange={handleRadiusChange}
            disabled={isAnalyzing}
            aria-label={t("map.radius")}
          >
            {ANALYSIS_RADIUS_OPTIONS.map(
              (radiusOption) => (
                <option
                  value={radiusOption}
                  key={radiusOption}
                >
                  {displayNumber(radiusOption)}
                  {" "}
                  {t("common.metersLong")}
                </option>
              ),
            )}
          </select>

          <span className="radius-current">
            {t(
              "map.radiusCurrent",
              {
                radius: displayNumber(radius),
              },
            )}
          </span>
        </label>
      </section>

      <section className="analysis-layout">
        <div
          className="map-card"
          role="region"
          aria-label={t("map.mapLabel")}
        >
          <MapContainer
            center={RIYADH_CENTER}
            zoom={12}
            scrollWheelZoom
            className="leaflet-map"
          >
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url={
                "https://{s}.tile.openstreetmap.org/"
                + "{z}/{x}/{y}.png"
              }
            />

            <MapClickHandler
              onSelect={handlePointSelection}
            />

            <SelectedPointMapController
              point={selectedPoint}
            />

            <LocationMarker
              point={selectedPoint}
              radius={radius}
            />
          </MapContainer>

          {result && (
            <MapAnalysisOverlay
              point={selectedPoint}
              radius={resultRadius}
              roadName={
                roadName || roadTypeLabel
              }
              t={t}
              formatValue={(value) =>
                displayNumber(value)
              }
            />
          )}

          <div className="map-instruction">
            <span aria-hidden="true">⌖</span>
            {t("map.mapInstruction")}
          </div>
        </div>

        <aside className="analysis-panel">
          {!selectedPoint && (
            <div className="empty-state empty-state--coordinates">
              <div
                className="location-symbol"
                aria-hidden="true"
              >
                ⌖
              </div>

              <h2>{t("map.selectTitle")}</h2>
              <p>{t("map.selectDescription")}</p>

              <div className="coordinate-divider">
                <span>{t("coordinates.or")}</span>
              </div>

              <CoordinateInput
                point={selectedPoint}
                onSubmit={handlePointSelection}
                disabled={isAnalyzing}
                idPrefix="analysis-location"
                t={t}
              />
            </div>
          )}

          {selectedPoint
            && !result
            && !isAnalyzing && (
              <>
                <div className="selected-location-header">
                  <div>
                    <span className="status-dot" />
                    {t("map.selectedLocation")}
                  </div>

                  <button
                    type="button"
                    className="text-button"
                    onClick={handleClear}
                  >
                    {t("map.clear")}
                  </button>
                </div>

                <div className="coordinates-card">
                  <div>
                    <span>{t("map.latitude")}</span>
                    <strong dir="ltr">
                      {formatCoordinate(
                        selectedPoint.latitude,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>{t("map.longitude")}</span>
                    <strong dir="ltr">
                      {formatCoordinate(
                        selectedPoint.longitude,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>{t("map.radius")}</span>
                    <strong>
                      {displayNumber(radius)}
                      {" "}
                      {t("common.meters")}
                    </strong>
                  </div>
                </div>

                <div className="analysis-description">
                  <h2>{t("map.readyTitle")}</h2>
                  <p>{t("map.readyDescription")}</p>
                </div>

                {errorMessage && (
                  <ErrorState
                    title={t("errors.title")}
                    message={errorMessage}
                  />
                )}

                <button
                  type="button"
                  className={
                    "button button-primary "
                    + "analyze-button"
                  }
                  onClick={handleAnalyze}
                >
                  {errorMessage
                    ? t("errors.retry")
                    : t("map.analyze")}
                </button>
              </>
            )}

          {selectedPoint && isAnalyzing && (
            <LoadingState
              title={t("map.loadingTitle")}
              description={
                t("map.loadingDescription")
              }
              steps={loadingSteps}
            />
          )}

          {selectedPoint && result && (
            <div className="analysis-results">
              <div className="result-heading">
                <div>
                  <span className="eyebrow">
                    {t("map.resultsEyebrow")}
                  </span>
                  <h2>{t("map.resultsTitle")}</h2>
                </div>

                <button
                  type="button"
                  className="text-button"
                  onClick={handleClear}
                >
                  {t("map.newLocation")}
                </button>
              </div>

              <DataWarnings
                warnings={result.data_warnings}
                t={t}
              />

              <ScoreCard
                label={t("map.score")}
                value={displayNumber(
                  score?.traffic_score,
                  2,
                )}
                suffix={t("map.outOf100")}
                level={levelLabel}
                progressValue={
                  score?.traffic_score
                }
              />

              <div className="metrics-heading">
                <h3>{t("map.analysisDetails")}</h3>

                <span
                  className="info-tooltip"
                  tabIndex="0"
                  aria-label={t("map.estimatesTooltip")}
                  data-tooltip={
                    t("map.estimatesTooltip")
                  }
                >
                  i
                </span>
              </div>

              <div className="result-grid">
                <MetricCard
                  label={t("map.roadDensity")}
                  value={
                    `${displayNumber(
                      spatial
                        ?.road_density_km_per_km2,
                      2,
                    )} ${
                      t(
                        "common.kilometersPerSquareKm",
                      )
                    }`
                  }
                />

                <MetricCard
                  label={t("map.intersections")}
                  value={displayNumber(
                    spatial?.intersection_count,
                  )}
                />

                <MetricCard
                  label={t("map.nearbyServices")}
                  value={displayNumber(
                    spatial?.nearby_services_count,
                  )}
                  interactive
                  expanded={servicesExpanded}
                  onToggle={() =>
                    setServicesExpanded(
                      (expanded) => !expanded,
                    )
                  }
                />

                <MetricCard
                  label={t("map.trafficSignals")}
                  value={displayNumber(
                    spatial?.traffic_signals_count,
                  )}
                />

                <MetricCard
                  label={t("map.currentSpeed")}
                  value={
                    hasValue(
                      traffic?.current_speed_kmph,
                    )
                      ? `${displayNumber(
                          traffic.current_speed_kmph,
                          1,
                        )} ${
                          t(
                            "common.kilometersPerHour",
                          )
                        }`
                      : unavailable
                  }
                />

                <MetricCard
                  label={t("map.freeFlowSpeed")}
                  value={
                    hasValue(
                      traffic
                        ?.free_flow_speed_kmph,
                    )
                      ? `${displayNumber(
                          traffic
                            .free_flow_speed_kmph,
                          1,
                        )} ${
                          t(
                            "common.kilometersPerHour",
                          )
                        }`
                      : unavailable
                  }
                />

                <MetricCard
                  label={t("map.congestion")}
                  value={
                    hasValue(
                      traffic?.congestion_index,
                    )
                      ? `${displayNumber(
                          traffic.congestion_index
                            * 100,
                          1,
                        )}${t("common.percent")}`
                      : unavailable
                  }
                />

                <MetricCard
                  label={t("map.roadType")}
                  value={roadTypeLabel}
                />

                <MetricCard
                  label={t("map.roadName")}
                  value={roadName || unavailable}
                />

                <MetricCard
                  label={t("map.roadDistance")}
                  value={
                    hasValue(
                      spatial
                        ?.nearest_road_distance_meters,
                    )
                      ? `${displayNumber(
                          spatial
                            .nearest_road_distance_meters,
                          1,
                        )} ${
                          t("common.meters")
                        }`
                      : unavailable
                  }
                />

                <MetricCard
                  label={t("map.analysisRadius")}
                  value={
                    `${displayNumber(resultRadius)} ${
                      t("common.meters")
                    }`
                  }
                />
              </div>

              {servicesExpanded && (
                <ServicesBreakdown
                  categories={serviceCategories}
                  total={
                    spatial
                      ?.nearby_services_count
                    ?? 0
                  }
                  radius={resultRadius}
                  t={t}
                  formatCount={(value) =>
                    displayNumber(value)
                  }
                />
              )}

              <div className="data-sources-card">
                <strong>{t("map.dataSources")}</strong>
                <span>{t("map.osmSource")}</span>
                <span>{t("map.tomtomSource")}</span>
              </div>

              {(
                score?.score_method
                || score?.scoring_mode
              ) === "context_only" && (
                <p className="context-note">
                  {t("map.contextNote")}
                </p>
              )}

              <button
                type="button"
                className={
                  "button button-secondary "
                  + "analyze-button"
                }
                onClick={handleClear}
              >
                {t("map.newLocation")}
              </button>
            </div>
          )}
        </aside>
      </section>

      {selectedPoint && result && (
        <Suspense
          fallback={
            <div
              className="dashboard-loading"
              role="status"
            >
              {t("dashboard.loading")}
            </div>
          }
        >
          <AnalysisDashboard
            result={result}
            t={t}
            i18n={i18n}
          />
        </Suspense>
      )}
    </main>
  );
}


export default MapPage;
