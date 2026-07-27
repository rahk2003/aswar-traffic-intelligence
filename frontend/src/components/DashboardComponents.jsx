import {
  useState,
} from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import AIAssistant from "./AIAssistant";
import PDFReportButton from "./PDFReport";
import { DemoBadge } from "./AnalysisComponents";
import SatelliteContextCard from "./SatelliteContextCard";
import {
  buildEstimatedTrafficActivity,
  formatNumber,
  getDominantSatelliteClass,
  getRoadName,
  getRoadTypeLabel,
  getSuitabilityCode,
  getTrafficFactorData,
  getTrafficLevelCode,
  hasValue,
} from "../utils/analysis";


function ActivityTooltip({
  active,
  payload,
  label,
  t,
  formatValue,
}) {
  if (
    !active
    || !payload
    || payload.length === 0
  ) {
    return null;
  }

  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      <span>
        {t("dashboard.activityIndex")}
        {": "}
        {formatValue(payload[0].value)}
        {t("common.percent")}
      </span>
      <small>{t("dashboard.estimatedData")}</small>
    </div>
  );
}


function FactorTooltip({
  active,
  payload,
  label,
  t,
  formatValue,
}) {
  if (
    !active
    || !payload
    || payload.length === 0
  ) {
    return null;
  }

  const factor = payload[0].payload;

  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      <span>
        {t("dashboard.factorScore")}
        {": "}
        {formatValue(factor.score)}
        {t("common.percent")}
      </span>

      <small>
        {hasValue(factor.weight)
          ? t(
              "dashboard.factorWeight",
              {
                weight:
                  formatValue(factor.weight),
              },
            )
          : t("dashboard.weightUnavailable")}
      </small>
    </div>
  );
}


function ChartEmptyState({ t }) {
  return (
    <div className="dashboard-chart-empty">
      <span aria-hidden="true">—</span>
      <p>{t("dashboard.chartUnavailable")}</p>
    </div>
  );
}


export function TrafficActivityChart({
  trafficScore,
  congestionIndex,
  historicalVolumeAvailable,
  t,
  i18n,
}) {
  const unavailable = t("common.unavailable");
  const formatValue = (value) =>
    formatNumber(
      value,
      i18n.language,
      unavailable,
      0,
    );
  const data = buildEstimatedTrafficActivity(
    trafficScore,
    congestionIndex,
  ).map((item) => ({
    ...item,
    label: t(
      `dashboard.times.${item.timeKey}`,
    ),
  }));

  return (
    <article className="dashboard-chart-card">
      <div className="dashboard-card-heading">
        <div>
          <span className="dashboard-card-kicker">
            {t("dashboard.estimatedData")}
          </span>
          <h3>{t("dashboard.trafficActivity")}</h3>
        </div>

        <span
          className="dashboard-chart-unit"
          aria-label={t("dashboard.activityScale")}
        >
          0–100
        </span>
      </div>

      {data.length > 0 ? (
        <div
          className="dashboard-chart-body"
          role="img"
          aria-label={t(
            "dashboard.trafficActivityChartLabel",
          )}
        >
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <AreaChart
              data={data}
              margin={{
                top: 14,
                right: 8,
                bottom: 0,
                left: -18,
              }}
              accessibilityLayer
            >
              <CartesianGrid
                stroke="rgba(139, 180, 181, 0.13)"
                strokeDasharray="4 6"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{
                  fill: "#88a2a4",
                  fontSize: 10,
                }}
                interval={0}
              />
              <YAxis
                domain={[0, 100]}
                axisLine={false}
                tickLine={false}
                tick={{
                  fill: "#688789",
                  fontSize: 9,
                }}
                ticks={[0, 25, 50, 75, 100]}
              />
              <Tooltip
                cursor={{
                  stroke: "rgba(56, 224, 204, 0.28)",
                }}
                content={(
                  tooltipProps,
                ) => (
                  <ActivityTooltip
                    {...tooltipProps}
                    t={t}
                    formatValue={formatValue}
                  />
                )}
              />
              <Area
                type="monotone"
                dataKey="activity"
                stroke="#38e0cc"
                strokeWidth={3}
                fill="#20c7b5"
                fillOpacity={0.13}
                activeDot={{
                  r: 5,
                  fill: "#38e0cc",
                  stroke: "#07181b",
                  strokeWidth: 3,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <ChartEmptyState t={t} />
      )}

      <p className="dashboard-chart-note">
        {t(
          historicalVolumeAvailable
            ? (
                "dashboard."
                + "trafficActivityNoteWithHistorical"
              )
            : "dashboard.trafficActivityNote",
        )}
      </p>
    </article>
  );
}


export function TrafficFactorsChart({
  score,
  t,
  i18n,
}) {
  const unavailable = t("common.unavailable");
  const formatValue = (value) =>
    formatNumber(
      value,
      i18n.language,
      unavailable,
      1,
    );
  const data = getTrafficFactorData(
    score,
  ).map((factor) => ({
    ...factor,
    label: t(
      `dashboard.factors.${factor.key}`,
    ),
  }));

  return (
    <article className="dashboard-chart-card">
      <div className="dashboard-card-heading">
        <div>
          <span className="dashboard-card-kicker">
            {t("dashboard.backendFactors")}
          </span>
          <h3>{t("dashboard.influencingFactors")}</h3>
        </div>

        <span
          className="dashboard-chart-unit"
          aria-label={t("dashboard.factorScale")}
        >
          /100
        </span>
      </div>

      {data.length > 0 ? (
        <div
          className={
            "dashboard-chart-body "
            + "dashboard-chart-body--factors"
          }
          role="img"
          aria-label={t(
            "dashboard.trafficFactorsChartLabel",
          )}
        >
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <BarChart
              data={data}
              layout="vertical"
              margin={{
                top: 8,
                right: 14,
                bottom: 0,
                left: 8,
              }}
              accessibilityLayer
            >
              <CartesianGrid
                stroke="rgba(139, 180, 181, 0.13)"
                strokeDasharray="4 6"
                horizontal={false}
              />
              <XAxis
                type="number"
                domain={[0, 100]}
                axisLine={false}
                tickLine={false}
                tick={{
                  fill: "#688789",
                  fontSize: 9,
                }}
                ticks={[0, 25, 50, 75, 100]}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={145}
                axisLine={false}
                tickLine={false}
                tick={{
                  fill: "#a8babc",
                  fontSize: 10,
                }}
              />
              <Tooltip
                cursor={{
                  fill: "rgba(56, 224, 204, 0.05)",
                }}
                content={(
                  tooltipProps,
                ) => (
                  <FactorTooltip
                    {...tooltipProps}
                    t={t}
                    formatValue={formatValue}
                  />
                )}
              />
              <Bar
                dataKey="score"
                fill="#20c7b5"
                radius={[0, 7, 7, 0]}
                maxBarSize={22}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <ChartEmptyState t={t} />
      )}

      <p className="dashboard-chart-note">
        {t("dashboard.factorsNote")}
      </p>
    </article>
  );
}


function selectSummaryFactors(
  factors,
  suitabilityCode,
) {
  if (factors.length <= 3) {
    return factors;
  }

  const ascending = [...factors].sort(
    (first, second) =>
      first.score - second.score,
  );
  const descending = [...ascending].reverse();

  if (
    suitabilityCode === "strong"
    || suitabilityCode === "promising"
  ) {
    return descending.slice(0, 3);
  }

  if (suitabilityCode === "limited") {
    return ascending.slice(0, 3);
  }

  return [
    descending[0],
    descending[1],
    ascending[0],
  ];
}


function getFactorTone(score) {
  if (score >= 65) {
    return "strong";
  }

  if (score >= 35) {
    return "moderate";
  }

  return "weak";
}


export function LocationSummary({
  result,
  satelliteContext,
  t,
  i18n,
}) {
  const spatial = result?.spatial_analysis;
  const traffic = result?.live_traffic;
  const score = result?.traffic_score;
  const unavailable = t("common.unavailable");
  const isArabic =
    i18n.language.startsWith("ar");
  const trafficScore =
    score?.traffic_score;
  const suitabilityCode =
    getSuitabilityCode(trafficScore);
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
  const roadName =
    getRoadName(spatial, isArabic);
  const roadType = getRoadTypeLabel(
    spatial?.nearest_road_type,
    t,
  );
  const hasRoadType =
    Boolean(spatial?.nearest_road_type);
  const hasLiveTraffic =
    hasValue(traffic?.current_speed_kmph)
    || hasValue(traffic?.free_flow_speed_kmph)
    || hasValue(traffic?.congestion_index);
  const formatValue = (
    value,
    digits = 0,
  ) => formatNumber(
    value,
    i18n.language,
    unavailable,
    digits,
  );
  const summaryFactors = selectSummaryFactors(
    getTrafficFactorData(score),
    suitabilityCode,
  );
  const dominantSatelliteClass =
    getDominantSatelliteClass(
      satelliteContext,
    );

  return (
    <article className="location-summary-card">
      <div className="location-summary-heading">
        <div>
          <span className="dashboard-card-kicker">
            {t("dashboard.locationSummary")}
          </span>
          <h3>{t("dashboard.summaryTitle")}</h3>
        </div>

        <span
          className={
            "suitability-badge "
            + `suitability-badge--${suitabilityCode}`
          }
        >
          {t(
            `dashboard.suitability.${suitabilityCode}`,
          )}
        </span>
      </div>

      <p className="summary-lead">
        {hasValue(trafficScore)
          ? t(
              "dashboard.summaryIntro",
              {
                score:
                  formatValue(trafficScore, 2),
                level: levelLabel,
              },
            )
          : t("dashboard.summaryUnavailable")}
      </p>

      <p>
        {t(
          `dashboard.assessment.${suitabilityCode}`,
        )}
      </p>

      {summaryFactors.length > 0 && (
        <div className="summary-reasons">
          <strong>
            {t("dashboard.whyThisAssessment")}
          </strong>

          <ul>
            {summaryFactors.map((factor) => (
              <li key={factor.key}>
                {t(
                  "dashboard.factorReason",
                  {
                    factor: t(
                      `dashboard.factors.${factor.key}`,
                    ),
                    level: t(
                      `dashboard.factorTones.${
                        getFactorTone(
                          factor.score,
                        )
                      }`,
                    ),
                  },
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="summary-context-grid">
        <div>
          <span>{t("dashboard.nearestRoad")}</span>
          <strong>
            {roadName
              || (
                hasRoadType
                  ? roadType
                  : unavailable
              )}
          </strong>
          {roadName && hasRoadType && (
            <small>{roadType}</small>
          )}
        </div>

        <div>
          <span>{t("dashboard.liveTrafficReading")}</span>
          <strong>
            {hasLiveTraffic
              ? (
                  hasValue(
                    traffic?.congestion_index,
                  )
                    ? t(
                        "dashboard.congestionReading",
                        {
                          congestion:
                            formatValue(
                              traffic
                                .congestion_index
                                * 100,
                              1,
                            ),
                        },
                      )
                    : t("dashboard.available")
                )
              : unavailable}
          </strong>
        </div>
      </div>

      {dominantSatelliteClass && (
        <p className="summary-satellite-context">
          {t(
            `satellite.summaryAdditions.${dominantSatelliteClass}`,
          )}
        </p>
      )}

      <p className="summary-disclaimer">
        {t("dashboard.summaryDisclaimer")}
      </p>
    </article>
  );
}


export default function AnalysisDashboard({
  result,
  t,
  i18n,
}) {
  const [
    assistantExplanation,
    setAssistantExplanation,
  ] = useState(null);
  const [
    satelliteContext,
    setSatelliteContext,
  ] = useState(null);
  const point = result?.requested_point;
  const spatial = result?.spatial_analysis;
  const traffic = result?.live_traffic;
  const score = result?.traffic_score;
  const currentLanguage =
    i18n.language.startsWith("ar")
      ? "ar"
      : "en";

  return (
    <section
      id="analysis-dashboard"
      className="analysis-dashboard"
      aria-labelledby="analysis-dashboard-title"
    >
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">
            {t("dashboard.eyebrow")}
          </span>
          <h2 id="analysis-dashboard-title">
            {t("dashboard.title")}
          </h2>
          {result?.is_demo && (
            <DemoBadge t={t} />
          )}
        </div>

        <div className="dashboard-heading-actions">
          <p>{t("dashboard.description")}</p>

          <PDFReportButton
            result={result}
            satelliteContext={
              satelliteContext
            }
            assistantExplanation={
              assistantExplanation?.language
                === currentLanguage
                ? assistantExplanation.text
                : ""
            }
            t={t}
            i18n={i18n}
          />
        </div>
      </div>

      {result?.is_demo && (
        <div
          className="dashboard-demo-notice"
          role="note"
        >
          <DemoBadge t={t} />
          <span>{t("dashboard.demoNotice")}</span>
        </div>
      )}

      <div className="dashboard-chart-grid">
        <TrafficActivityChart
          trafficScore={score?.traffic_score}
          congestionIndex={
            traffic?.congestion_index
          }
          historicalVolumeAvailable={
            Boolean(
              score
                ?.historical_volume_available,
            )
          }
          t={t}
          i18n={i18n}
        />

        <TrafficFactorsChart
          score={score}
          t={t}
          i18n={i18n}
        />
      </div>

      <SatelliteContextCard
        key={[
          point?.latitude,
          point?.longitude,
          spatial?.radius_meters
            ?? point?.radius_meters,
        ].join(":")}
        latitude={point?.latitude}
        longitude={point?.longitude}
        radiusMeters={
          spatial?.radius_meters
          ?? point?.radius_meters
        }
        onContextChange={
          setSatelliteContext
        }
        t={t}
        i18n={i18n}
      />

      <LocationSummary
        result={result}
        satelliteContext={
          satelliteContext
        }
        t={t}
        i18n={i18n}
      />

      <AIAssistant
        key={currentLanguage}
        result={result}
        satelliteContext={
          satelliteContext
        }
        t={t}
        i18n={i18n}
        onAnswerChange={
          setAssistantExplanation
        }
      />
    </section>
  );
}
