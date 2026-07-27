import {
  getTrafficFactorData,
  hasValue,
} from "./analysis";


export const COMPARISON_DASHBOARD_METRICS = [
  {
    key: "score",
    labelKey: "map.score",
    maximum: 100,
    digits: 1,
  },
  {
    key: "roadTypeScore",
    labelKey: "compare.dashboardRoadType",
    maximum: 100,
    digits: 1,
  },
  {
    key: "density",
    labelKey: "map.roadDensity",
    digits: 2,
  },
  {
    key: "intersections",
    labelKey: "map.intersections",
    digits: 0,
  },
  {
    key: "services",
    labelKey: "map.nearbyServices",
    digits: 0,
  },
  {
    key: "congestionPercent",
    labelKey: "map.congestion",
    maximum: 100,
    digits: 1,
  },
];


export function getComparisonValue(
  result,
  key,
) {
  const spatial = result?.spatial_analysis;
  const traffic = result?.live_traffic;
  const score = result?.traffic_score;

  const values = {
    score: score?.traffic_score,
    roadType:
      spatial?.nearest_road_type,
    roadTypeScore:
      spatial?.road_type_score
      ?? score?.road_type_score,
    density:
      spatial?.road_density_km_per_km2,
    intersections:
      spatial?.intersection_count,
    services:
      spatial?.nearby_services_count,
    congestion:
      traffic?.congestion_index,
    congestionPercent:
      hasValue(traffic?.congestion_index)
        ? Number(
            traffic.congestion_index,
          ) * 100
        : null,
    analysisRadius:
      spatial?.radius_meters
      ?? result?.requested_point
        ?.radius_meters,
  };

  return values[key];
}


export function toComparisonNumber(value) {
  if (!hasValue(value)) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}


export function compareMetricValues(
  valueA,
  valueB,
) {
  const numberA =
    toComparisonNumber(valueA);
  const numberB =
    toComparisonNumber(valueB);

  if (
    numberA === null
    || numberB === null
  ) {
    return {
      winner: null,
      difference: null,
      valueA: numberA,
      valueB: numberB,
    };
  }

  const difference = Math.abs(
    numberA - numberB,
  );

  return {
    winner:
      difference < 0.000001
        ? "tie"
        : numberA > numberB
          ? "a"
          : "b",
    difference,
    valueA: numberA,
    valueB: numberB,
  };
}


export function buildDashboardComparisons(
  resultA,
  resultB,
) {
  const rows =
    COMPARISON_DASHBOARD_METRICS.map(
      (metric) => {
        const comparison =
          compareMetricValues(
            getComparisonValue(
              resultA,
              metric.key,
            ),
            getComparisonValue(
              resultB,
              metric.key,
            ),
          );
        const largestValue = Math.max(
          comparison.valueA ?? 0,
          comparison.valueB ?? 0,
          1,
        );

        return {
          ...metric,
          ...comparison,
          chartMaximum:
            metric.maximum
            ?? largestValue,
        };
      },
    );

  const scoreComparison = rows.find(
    (row) => row.key === "score",
  );

  return {
    rows,
    overallWinner:
      scoreComparison?.winner ?? null,
    scoreDifference:
      scoreComparison?.difference ?? null,
  };
}


export function getLocationFactorSummary(
  result,
) {
  const factors = getTrafficFactorData(
    result?.traffic_score,
  ).sort(
    (first, second) =>
      second.score - first.score,
  );

  return {
    strongest: factors[0] ?? null,
    weakest:
      factors.length > 0
        ? factors.at(-1)
        : null,
  };
}
