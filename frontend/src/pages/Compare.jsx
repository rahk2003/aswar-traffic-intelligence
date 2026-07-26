import {
  useEffect,
  useMemo,
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
  ErrorState,
  LoadingState,
  LocationMarker,
  ScoreCard,
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
} from "../utils/analysis";


const RIYADH_CENTER = [
  24.7136,
  46.6753,
];
const LOCATION_COLORS = {
  a: "#19c7b5",
  b: "#ffb454",
};


function ComparisonMapClickHandler({
  onSelect,
}) {
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


function ComparisonMapController({
  pointA,
  pointB,
}) {
  const map = useMap();

  useEffect(() => {
    if (pointA && pointB) {
      map.fitBounds(
        [
          [
            pointA.latitude,
            pointA.longitude,
          ],
          [
            pointB.latitude,
            pointB.longitude,
          ],
        ],
        {
          padding: [45, 45],
          maxZoom: 14,
        },
      );
      return;
    }

    const point = pointA || pointB;

    if (point) {
      map.setView(
        [
          point.latitude,
          point.longitude,
        ],
        Math.max(map.getZoom(), 14),
      );
    }
  }, [
    map,
    pointA,
    pointB,
  ]);

  return null;
}


function LocationSelectionCard({
  slot,
  point,
  isActive,
  isDisabled,
  t,
  onChoose,
  onClear,
  onCoordinates,
}) {
  const label = t(`compare.location${slot}`);

  return (
    <article
      className={
        "comparison-location-card"
        + (isActive ? " is-active" : "")
      }
    >
      <div className="location-card-heading">
        <span
          className={`location-chip location-chip--${slot}`}
        >
          {slot.toUpperCase()}
        </span>

        <div>
          <span>{label}</span>
          <small>
            {point
              ? t("compare.pointSelected")
              : isActive
                ? t("compare.selectOnMap")
                : t("compare.waitingSelection")}
          </small>
        </div>
      </div>

      {point ? (
        <dl className="point-coordinates">
          <div>
            <dt>{t("map.latitude")}</dt>
            <dd dir="ltr">
              {formatCoordinate(point.latitude)}
            </dd>
          </div>

          <div>
            <dt>{t("map.longitude")}</dt>
            <dd dir="ltr">
              {formatCoordinate(point.longitude)}
            </dd>
          </div>
        </dl>
      ) : (
        <div className="point-empty">
          <span aria-hidden="true">⌖</span>
          <p>{t("compare.clickMapHint")}</p>
        </div>
      )}

      <div className="location-card-actions">
        <button
          type="button"
          className="button button-secondary button-small"
          onClick={() => onChoose(slot)}
          disabled={isDisabled}
        >
          {point
            ? t("compare.replace")
            : t("compare.select")}
        </button>

        {point && (
          <button
            type="button"
            className="text-button"
            onClick={() => onClear(slot)}
            disabled={isDisabled}
          >
            {t("compare.clearPoint")}
          </button>
        )}
      </div>

      <div className="coordinate-divider coordinate-divider--compact">
        <span>{t("coordinates.or")}</span>
      </div>

      <CoordinateInput
        key={
          point
            ? `${point.latitude}-${point.longitude}`
            : "empty"
        }
        point={point}
        onSubmit={(coordinates) =>
          onCoordinates(slot, coordinates)
        }
        disabled={isDisabled}
        compact
        idPrefix={`compare-${slot}`}
        t={t}
      />
    </article>
  );
}


function AnalysisPreview({
  slot,
  point,
  result,
  isLoading,
  error,
  t,
  i18n,
  onRetry,
}) {
  const unavailable = t("common.unavailable");
  const score = result?.traffic_score;
  const resultRadius =
    result?.spatial_analysis?.radius_meters
    ?? result?.requested_point?.radius_meters;
  const levelCode = getTrafficLevelCode(score);

  const displayNumber = (
    value,
    digits = 0,
  ) => formatNumber(
    value,
    i18n.language,
    unavailable,
    digits,
  );

  return (
    <article className="comparison-analysis-card">
      <div className="comparison-analysis-heading">
        <span
          className={`location-chip location-chip--${slot}`}
        >
          {slot.toUpperCase()}
        </span>

        <div>
          <h3>{t(`compare.location${slot}`)}</h3>
          <p dir="ltr">
            {formatCoordinate(point.latitude)}
            {", "}
            {formatCoordinate(point.longitude)}
          </p>
        </div>
      </div>

      {isLoading && (
        <LoadingState
          compact
          title={t("compare.analyzingLocation")}
          description={
            t("compare.analyzingLocationDescription")
          }
        />
      )}

      {!isLoading && error && (
        <ErrorState
          title={t("errors.title")}
          message={error}
          actionLabel={t("errors.retry")}
          onAction={onRetry}
        />
      )}

      {!isLoading && !error && result && (
        <>
          <ScoreCard
            compact
            label={t("map.score")}
            value={displayNumber(
              score?.traffic_score,
              2,
            )}
            suffix={t("map.outOf100")}
            progressValue={
              score?.traffic_score
            }
            level={t(
              `levels.${levelCode}`,
              {
                defaultValue:
                  score?.traffic_level
                  || t("levels.unknown"),
              },
            )}
          />

          <span className="analysis-radius-used">
            {hasValue(resultRadius)
              ? t(
                  "map.radiusCurrent",
                  {
                    radius:
                      displayNumber(resultRadius),
                  },
                )
              : unavailable}
          </span>
        </>
      )}
    </article>
  );
}


function getMetricValue(result, key) {
  const spatial = result?.spatial_analysis;
  const traffic = result?.live_traffic;
  const score = result?.traffic_score;

  const values = {
    score: score?.traffic_score,
    level: score?.traffic_level,
    density:
      spatial?.road_density_km_per_km2,
    intersections:
      spatial?.intersection_count,
    services:
      spatial?.nearby_services_count,
    signals:
      spatial?.traffic_signals_count,
    currentSpeed:
      traffic?.current_speed_kmph,
    freeFlowSpeed:
      traffic?.free_flow_speed_kmph,
    congestion:
      traffic?.congestion_index,
    roadType:
      spatial?.nearest_road_type,
    roadTypeScore:
      spatial?.road_type_score,
    roadName:
      spatial?.nearest_road_name,
    analysisRadius:
      spatial?.radius_meters
      ?? result?.requested_point?.radius_meters,
  };

  return values[key];
}


function buildRecommendation(
  resultA,
  resultB,
  t,
) {
  const rawScoreA =
    getMetricValue(resultA, "score");
  const rawScoreB =
    getMetricValue(resultB, "score");
  const scoreA = hasValue(rawScoreA)
    ? Number(rawScoreA)
    : Number.NaN;
  const scoreB = hasValue(rawScoreB)
    ? Number(rawScoreB)
    : Number.NaN;

  if (
    !Number.isFinite(scoreA)
    || !Number.isFinite(scoreB)
  ) {
    return {
      status: "insufficient",
      winner: null,
      difference: null,
      reasons: [],
    };
  }

  const difference = Math.abs(
    scoreA - scoreB,
  );

  if (difference <= 3) {
    return {
      status: "close",
      winner: null,
      difference,
      reasons: [],
    };
  }

  const winner = scoreA > scoreB ? "a" : "b";
  const winnerResult =
    winner === "a" ? resultA : resultB;
  const otherResult =
    winner === "a" ? resultB : resultA;

  const candidates = [
    {
      key: "score",
      label: t("compare.reasons.score"),
    },
    {
      key: "density",
      label: t("compare.reasons.density"),
    },
    {
      key: "services",
      label: t("compare.reasons.services"),
    },
    {
      key: "congestion",
      label: t("compare.reasons.congestion"),
    },
    {
      key: "intersections",
      label: t("compare.reasons.intersections"),
    },
    {
      key: "roadTypeScore",
      label: t("compare.reasons.roadType"),
    },
    {
      key: "signals",
      label: t("compare.reasons.signals"),
    },
  ]
    .map((candidate, index) => {
      const winnerValue = Number(
        hasValue(
          getMetricValue(
            winnerResult,
            candidate.key,
          ),
        )
          ? getMetricValue(
              winnerResult,
              candidate.key,
            )
          : Number.NaN,
      );
      const otherValue = Number(
        hasValue(
          getMetricValue(
            otherResult,
            candidate.key,
          ),
        )
          ? getMetricValue(
              otherResult,
              candidate.key,
            )
          : Number.NaN,
      );

      if (
        !Number.isFinite(winnerValue)
        || !Number.isFinite(otherValue)
        || winnerValue <= otherValue
      ) {
        return null;
      }

      const relativeDifference =
        (winnerValue - otherValue)
        / Math.max(
          Math.abs(winnerValue),
          Math.abs(otherValue),
          1,
        );

      return {
        ...candidate,
        strength:
          candidate.key === "score"
            ? 2
            : relativeDifference,
        order: index,
      };
    })
    .filter(Boolean)
    .sort(
      (first, second) =>
        second.strength - first.strength
        || first.order - second.order,
    )
    .slice(0, 3)
    .map((reason) => reason.label);

  return {
    status: "winner",
    winner,
    difference,
    reasons: candidates,
  };
}


function RecommendationCard({
  recommendation,
  t,
  displayNumber,
}) {
  const isWinner =
    recommendation.status === "winner";

  let title = t(
    "compare.recommendationInsufficient",
  );
  let explanation = t(
    "compare.insufficientExplanation",
  );

  if (recommendation.status === "close") {
    title = t("compare.recommendationClose");
    explanation = t("compare.closeExplanation");
  }

  if (isWinner) {
    title = t(
      recommendation.winner === "a"
        ? "compare.recommendationA"
        : "compare.recommendationB",
    );
    explanation = t(
      "compare.winnerExplanation",
      {
        location: t(
          `compare.location${recommendation.winner}`,
        ),
      },
    );
  }

  return (
    <section
      className={
        "recommendation-card"
        + (
          recommendation.status === "close"
            ? " recommendation-card--close"
            : ""
        )
      }
    >
      <div className="recommendation-kicker">
        <span aria-hidden="true">
          {isWinner ? "✓" : "≈"}
        </span>
        {t("compare.recommendationTitle")}
      </div>

      <div className="recommendation-layout">
        <div>
          <h2>{title}</h2>
          <p>{explanation}</p>
        </div>

        <div className="score-difference">
          <span>{t("compare.scoreDifference")}</span>
          <strong>
            {recommendation.difference === null
              ? "—"
              : displayNumber(
                  recommendation.difference,
                  2,
                )}
          </strong>
          <small>{t("compare.points")}</small>
        </div>
      </div>

      {isWinner
        && recommendation.reasons.length > 0 && (
          <div className="recommendation-reasons">
            <strong>
              {t("compare.strongestReasons")}
            </strong>

            <ul>
              {recommendation.reasons.map(
                (reason) => (
                  <li key={reason}>{reason}</li>
                ),
              )}
            </ul>
          </div>
        )}

      <p className="recommendation-note">
        {t("compare.estimateNote")}
      </p>
    </section>
  );
}


function ComparisonTable({
  resultA,
  resultB,
  t,
  i18n,
}) {
  const isArabic =
    i18n.language.startsWith("ar");
  const unavailable = t("common.unavailable");

  const displayNumber = (
    value,
    digits = 0,
  ) => formatNumber(
    value,
    i18n.language,
    unavailable,
    digits,
  );

  const formatSpeed = (value) =>
    hasValue(value)
      ? `${displayNumber(value, 1)} ${
          t("common.kilometersPerHour")
        }`
      : unavailable;

  const rows = [
    {
      label: t("map.score"),
      valueKey: "score",
      compareKey: "score",
      formatter: (value) =>
        displayNumber(value, 2),
    },
    {
      label: t("compare.trafficLevel"),
      valueKey: "level",
      compareKey: "score",
      formatter: (value, result) => {
        const levelCode =
          getTrafficLevelCode(
            result?.traffic_score,
          );

        return t(
          `levels.${levelCode}`,
          {
            defaultValue:
              value || t("levels.unknown"),
          },
        );
      },
    },
    {
      label: t("map.analysisRadius"),
      valueKey: "analysisRadius",
      compareKey: null,
      formatter: (value) =>
        hasValue(value)
          ? `${displayNumber(value)} ${
              t("common.metersLong")
            }`
          : unavailable,
    },
    {
      label: t("map.roadDensity"),
      valueKey: "density",
      compareKey: "density",
      formatter: (value) =>
        hasValue(value)
          ? `${displayNumber(value, 2)} ${
              t(
                "common.kilometersPerSquareKm",
              )
            }`
          : unavailable,
    },
    {
      label: t("map.intersections"),
      valueKey: "intersections",
      compareKey: "intersections",
      formatter: (value) =>
        displayNumber(value),
    },
    {
      label: t("map.nearbyServices"),
      valueKey: "services",
      compareKey: "services",
      formatter: (value) =>
        displayNumber(value),
    },
    {
      label: t("map.trafficSignals"),
      valueKey: "signals",
      compareKey: "signals",
      formatter: (value) =>
        displayNumber(value),
    },
    {
      label: t("map.currentSpeed"),
      valueKey: "currentSpeed",
      compareKey: null,
      formatter: formatSpeed,
    },
    {
      label: t("map.freeFlowSpeed"),
      valueKey: "freeFlowSpeed",
      compareKey: null,
      formatter: formatSpeed,
    },
    {
      label: t("map.congestion"),
      valueKey: "congestion",
      compareKey: "congestion",
      formatter: (value) =>
        hasValue(value)
          ? `${displayNumber(
              value * 100,
              1,
            )}${t("common.percent")}`
          : unavailable,
    },
    {
      label: t("map.roadType"),
      valueKey: "roadType",
      compareKey: "roadTypeScore",
      formatter: (value) =>
        getRoadTypeLabel(value, t),
    },
    {
      label: t("map.roadName"),
      valueKey: "roadName",
      compareKey: null,
      formatter: (_value, result) =>
        getRoadName(
          result?.spatial_analysis,
          isArabic,
        ) || unavailable,
    },
  ];

  return (
    <section className="comparison-table-card">
      <div className="section-heading compact-heading">
        <span className="eyebrow">
          {t("compare.detailsEyebrow")}
        </span>
        <h2>{t("compare.detailsTitle")}</h2>
      </div>

      <div className="table-scroll">
        <table className="comparison-table">
          <thead>
            <tr>
              <th>{t("compare.metric")}</th>
              <th>
                <span className="location-chip location-chip--a">
                  A
                </span>
                {t("compare.locationa")}
              </th>
              <th>
                <span className="location-chip location-chip--b">
                  B
                </span>
                {t("compare.locationb")}
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => {
              const valueA = getMetricValue(
                resultA,
                row.valueKey,
              );
              const valueB = getMetricValue(
                resultB,
                row.valueKey,
              );
              const compareA = row.compareKey
                && hasValue(
                  getMetricValue(
                    resultA,
                    row.compareKey,
                  ),
                )
                ? Number(
                    getMetricValue(
                      resultA,
                      row.compareKey,
                    ),
                  )
                : null;
              const compareB = row.compareKey
                && hasValue(
                  getMetricValue(
                    resultB,
                    row.compareKey,
                  ),
                )
                ? Number(
                    getMetricValue(
                      resultB,
                      row.compareKey,
                    ),
                  )
                : null;
              const canCompare =
                row.compareKey
                && Number.isFinite(compareA)
                && Number.isFinite(compareB)
                && compareA !== compareB;

              return (
                <tr key={row.valueKey}>
                  <th scope="row">{row.label}</th>
                  <td
                    className={
                      canCompare
                      && compareA > compareB
                        ? "is-better"
                        : ""
                    }
                  >
                    {row.formatter(
                      valueA,
                      resultA,
                    )}
                  </td>
                  <td
                    className={
                      canCompare
                      && compareB > compareA
                        ? "is-better"
                        : ""
                    }
                  >
                    {row.formatter(
                      valueB,
                      resultB,
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="table-note">
        {t("compare.speedNote")}
      </p>
    </section>
  );
}


function Compare() {
  const { t, i18n } = useTranslation();
  const [points, setPoints] = useState({
    a: null,
    b: null,
  });
  const [activeSlot, setActiveSlot] =
    useState("a");
  const [radius, setRadius] = useState(500);
  const [results, setResults] = useState({
    a: null,
    b: null,
  });
  const [loading, setLoading] = useState({
    a: false,
    b: false,
  });
  const [errors, setErrors] = useState({
    a: "",
    b: "",
  });

  const isAnalyzing =
    loading.a || loading.b;
  const bothSelected =
    Boolean(points.a && points.b);
  const bothResults =
    Boolean(results.a && results.b);
  const unavailable = t("common.unavailable");

  const displayNumber = (
    value,
    digits = 0,
  ) => formatNumber(
    value,
    i18n.language,
    unavailable,
    digits,
  );


  function assignPoint(slot, point) {
    if (isAnalyzing) {
      return;
    }

    setPoints((current) => ({
      ...current,
      [slot]: point,
    }));
    setResults((current) => ({
      ...current,
      [slot]: null,
    }));
    setErrors((current) => ({
      ...current,
      [slot]: "",
    }));

    if (slot === "a" && !points.b) {
      setActiveSlot("b");
    } else if (slot === "b" && !points.a) {
      setActiveSlot("a");
    } else {
      setActiveSlot(null);
    }
  }


  function selectPoint(point) {
    if (!activeSlot) {
      return;
    }

    assignPoint(activeSlot, point);
  }


  function selectCoordinates(slot, point) {
    assignPoint(slot, point);
  }


  function chooseSlot(slot) {
    if (!isAnalyzing) {
      setActiveSlot(slot);
    }
  }


  function clearPoint(slot) {
    if (isAnalyzing) {
      return;
    }

    setPoints((current) => ({
      ...current,
      [slot]: null,
    }));
    setResults((current) => ({
      ...current,
      [slot]: null,
    }));
    setErrors((current) => ({
      ...current,
      [slot]: "",
    }));
    setActiveSlot(slot);
  }


  function handleRadiusChange(event) {
    if (isAnalyzing) {
      return;
    }

    setRadius(Number(event.target.value));
    setResults({
      a: null,
      b: null,
    });
    setErrors({
      a: "",
      b: "",
    });
  }


  async function analyzeSlot(slot) {
    const point = points[slot];

    if (!point) {
      return null;
    }

    setLoading((current) => ({
      ...current,
      [slot]: true,
    }));
    setErrors((current) => ({
      ...current,
      [slot]: "",
    }));
    setResults((current) => ({
      ...current,
      [slot]: null,
    }));

    try {
      const analysis = await analyzePoint({
        latitude: point.latitude,
        longitude: point.longitude,
        radiusMeters: radius,
      });

      setResults((current) => ({
        ...current,
        [slot]: analysis,
      }));

      return analysis;
    } catch (error) {
      setErrors((current) => ({
        ...current,
        [slot]: getErrorMessage(error, t),
      }));

      return null;
    } finally {
      setLoading((current) => ({
        ...current,
        [slot]: false,
      }));
    }
  }


  async function handleCompare() {
    if (!bothSelected || isAnalyzing) {
      return;
    }

    await Promise.all([
      analyzeSlot("a"),
      analyzeSlot("b"),
    ]);
  }


  const recommendation = useMemo(
    () => bothResults
      ? buildRecommendation(
          results.a,
          results.b,
          t,
        )
      : null,
    [
      bothResults,
      results.a,
      results.b,
      t,
    ],
  );


  return (
    <main className="page-container compare-page">
      <section className="page-title">
        <span className="eyebrow">
          {t("compare.eyebrow")}
        </span>
        <h1>{t("compare.title")}</h1>
        <p>{t("compare.description")}</p>
      </section>

      <section className="comparison-workspace">
        <div className="comparison-map-panel">
          <div className="comparison-map-header">
            <div>
              <strong>{t("compare.mapTitle")}</strong>
              <span>
                {activeSlot
                  ? t(
                      "compare.selectingLocation",
                      {
                        location:
                          activeSlot.toUpperCase(),
                      },
                    )
                  : t("compare.selectionComplete")}
              </span>
            </div>

            <label className="radius-control comparison-radius-control">
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
                    radius:
                      displayNumber(radius),
                  },
                )}
              </span>
            </label>
          </div>

          <div
            className="comparison-map"
            role="region"
            aria-label={t("compare.mapLabel")}
          >
            <MapContainer
              center={RIYADH_CENTER}
              zoom={12}
              scrollWheelZoom
              className="leaflet-map"
            >
              <TileLayer
                attribution={
                  "&copy; OpenStreetMap contributors"
                }
                url={
                  "https://{s}."
                  + "tile.openstreetmap.org/"
                  + "{z}/{x}/{y}.png"
                }
              />

              <ComparisonMapClickHandler
                onSelect={selectPoint}
              />

              <ComparisonMapController
                pointA={points.a}
                pointB={points.b}
              />

              <LocationMarker
                point={points.a}
                radius={radius}
                color={LOCATION_COLORS.a}
                label="A"
              />

              <LocationMarker
                point={points.b}
                radius={radius}
                color={LOCATION_COLORS.b}
                label="B"
              />
            </MapContainer>
          </div>
        </div>

        <aside className="comparison-sidebar">
          <LocationSelectionCard
            slot="a"
            point={points.a}
            isActive={activeSlot === "a"}
            isDisabled={isAnalyzing}
            t={t}
            onChoose={chooseSlot}
            onClear={clearPoint}
            onCoordinates={selectCoordinates}
          />

          <LocationSelectionCard
            slot="b"
            point={points.b}
            isActive={activeSlot === "b"}
            isDisabled={isAnalyzing}
            t={t}
            onChoose={chooseSlot}
            onClear={clearPoint}
            onCoordinates={selectCoordinates}
          />

          <button
            type="button"
            className={
              "button button-primary "
              + "compare-submit"
            }
            disabled={
              !bothSelected || isAnalyzing
            }
            onClick={handleCompare}
          >
            {isAnalyzing
              ? t("compare.analyzing")
              : t("compare.submit")}
          </button>

          {!bothSelected && (
            <p className="selection-note">
              {t("compare.selectBoth")}
            </p>
          )}
        </aside>
      </section>

      {(isAnalyzing
        || results.a
        || results.b
        || errors.a
        || errors.b) && (
          <section className="comparison-analysis-grid">
            {points.a && (
              <AnalysisPreview
                slot="a"
                point={points.a}
                result={results.a}
                isLoading={loading.a}
                error={errors.a}
                t={t}
                i18n={i18n}
                onRetry={() =>
                  analyzeSlot("a")
                }
              />
            )}

            {points.b && (
              <AnalysisPreview
                slot="b"
                point={points.b}
                result={results.b}
                isLoading={loading.b}
                error={errors.b}
                t={t}
                i18n={i18n}
                onRetry={() =>
                  analyzeSlot("b")
                }
              />
            )}
          </section>
        )}

      {bothResults && recommendation && (
        <div className="comparison-results">
          <RecommendationCard
            recommendation={recommendation}
            t={t}
            displayNumber={displayNumber}
          />

          <ComparisonTable
            resultA={results.a}
            resultB={results.b}
            t={t}
            i18n={i18n}
          />
        </div>
      )}
    </main>
  );
}


export default Compare;
