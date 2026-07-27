import {
  DemoBadge,
} from "./AnalysisComponents";
import {
  formatNumber,
  getRoadTypeLabel,
  hasValue,
} from "../utils/analysis";
import {
  buildDashboardComparisons,
  getComparisonValue,
} from "../utils/comparison";


function LocationScorePanel({
  slot,
  result,
  t,
  displayNumber,
}) {
  const score = getComparisonValue(
    result,
    "score",
  );
  const scoreWidth = hasValue(score)
    ? Math.max(
        0,
        Math.min(Number(score), 100),
      )
    : 0;

  return (
    <article
      className={
        "comparison-dashboard-score "
        + `comparison-dashboard-score--${slot}`
      }
    >
      <div className="comparison-dashboard-score-heading">
        <span
          className={
            "location-chip "
            + `location-chip--${slot}`
          }
        >
          {slot.toUpperCase()}
        </span>
        <div>
          <strong>
            {t(`compare.location${slot}`)}
          </strong>
          <span>
            {result?.is_demo
              ? t("compare.dashboardDemoData")
              : t("compare.dashboardLiveData")}
          </span>
        </div>
        {result?.is_demo && (
          <DemoBadge t={t} />
        )}
      </div>

      <div className="comparison-dashboard-score-value">
        <strong>
          {displayNumber(score, 1)}
        </strong>
        <span>{t("map.outOf100")}</span>
      </div>

      <div
        className="comparison-dashboard-track"
        role="progressbar"
        aria-label={`${t(`compare.location${slot}`)} ${t("map.score")}`}
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={
          hasValue(score)
            ? Number(score)
            : 0
        }
      >
        <span
          style={{
            width: `${scoreWidth}%`,
          }}
        />
      </div>
    </article>
  );
}


function formatDashboardValue({
  row,
  slot,
  result,
  t,
  displayNumber,
  unavailable,
}) {
  const value = slot === "a"
    ? row.valueA
    : row.valueB;

  if (!hasValue(value)) {
    return unavailable;
  }

  if (row.key === "roadTypeScore") {
    return (
      `${getRoadTypeLabel(
        getComparisonValue(
          result,
          "roadType",
        ),
        t,
      )} · `
      + `${displayNumber(value, 1)}/100`
    );
  }

  if (row.key === "density") {
    return (
      `${displayNumber(value, 2)} `
      + t(
        "common.kilometersPerSquareKm",
      )
    );
  }

  if (
    row.key === "score"
    || row.key === "roadTypeScore"
  ) {
    return `${displayNumber(value, 1)}/100`;
  }

  if (row.key === "congestionPercent") {
    return (
      displayNumber(value, 1)
      + t("common.percent")
    );
  }

  return displayNumber(
    value,
    row.digits,
  );
}


function formatDifference({
  row,
  t,
  displayNumber,
  unavailable,
}) {
  if (!hasValue(row.difference)) {
    return unavailable;
  }

  const number = displayNumber(
    row.difference,
    row.digits,
  );

  if (row.key === "density") {
    return (
      `${number} `
      + t(
        "common.kilometersPerSquareKm",
      )
    );
  }

  if (row.key === "congestionPercent") {
    return number + t("common.percent");
  }

  if (
    row.key === "score"
    || row.key === "roadTypeScore"
  ) {
    return `${number} ${t("compare.points")}`;
  }

  return number;
}


function MetricComparisonCard({
  row,
  resultA,
  resultB,
  t,
  displayNumber,
  unavailable,
}) {
  const widthA = row.valueA === null
    ? 0
    : Math.min(
        100,
        Math.max(
          0,
          (
            row.valueA
            / row.chartMaximum
          ) * 100,
        ),
      );
  const widthB = row.valueB === null
    ? 0
    : Math.min(
        100,
        Math.max(
          0,
          (
            row.valueB
            / row.chartMaximum
          ) * 100,
        ),
      );
  const winnerLabel = row.winner === "tie"
    ? t("compare.dashboardTie")
    : row.winner
      ? t(
          "compare.dashboardWinnerLocation",
          {
            location:
              row.winner.toUpperCase(),
          },
        )
      : t("compare.dashboardNoWinner");

  return (
    <article className="comparison-dashboard-metric">
      <div className="comparison-dashboard-metric-heading">
        <strong>{t(row.labelKey)}</strong>
        <span
          className={
            row.winner === "a"
              ? "winner-a"
              : row.winner === "b"
                ? "winner-b"
                : ""
          }
        >
          {winnerLabel}
        </span>
      </div>

      <div className="comparison-dashboard-bars">
        <div>
          <span className="comparison-dashboard-bar-label">
            <b>A</b>
            {formatDashboardValue({
              row,
              slot: "a",
              result: resultA,
              t,
              displayNumber,
              unavailable,
            })}
          </span>
          <span className="comparison-dashboard-bar comparison-dashboard-bar--a">
            <i
              style={{
                width: `${widthA}%`,
              }}
            />
          </span>
        </div>

        <div>
          <span className="comparison-dashboard-bar-label">
            <b>B</b>
            {formatDashboardValue({
              row,
              slot: "b",
              result: resultB,
              t,
              displayNumber,
              unavailable,
            })}
          </span>
          <span className="comparison-dashboard-bar comparison-dashboard-bar--b">
            <i
              style={{
                width: `${widthB}%`,
              }}
            />
          </span>
        </div>
      </div>

      <div className="comparison-dashboard-difference">
        <span>
          {t("compare.dashboardDifference")}
        </span>
        <strong>
          {formatDifference({
            row,
            t,
            displayNumber,
            unavailable,
          })}
        </strong>
      </div>
    </article>
  );
}


export default function ComparisonDashboard({
  resultA,
  resultB,
  t,
  i18n,
}) {
  const unavailable =
    t("common.unavailable");
  const dashboard =
    buildDashboardComparisons(
      resultA,
      resultB,
    );
  const displayNumber = (
    value,
    digits = 0,
  ) => formatNumber(
    value,
    i18n.language,
    unavailable,
    digits,
  );
  const supportingRows = dashboard.rows
    .filter(
      (row) =>
        row.key !== "score"
        && row.winner
          === dashboard.overallWinner,
    )
    .sort(
      (first, second) => {
        const firstRelative = (
          first.difference ?? 0
        ) / Math.max(
          first.valueA ?? 0,
          first.valueB ?? 0,
          1,
        );
        const secondRelative = (
          second.difference ?? 0
        ) / Math.max(
          second.valueA ?? 0,
          second.valueB ?? 0,
          1,
        );

        return secondRelative
          - firstRelative;
      },
    )
    .slice(0, 3);
  const summaryKey =
    dashboard.overallWinner === "tie"
      ? "compare.dashboardSummaryTie"
      : dashboard.overallWinner
        ? "compare.dashboardSummaryWinner"
        : "compare.dashboardSummaryUnavailable";

  return (
    <section
      className="comparison-dashboard"
      aria-labelledby="comparison-dashboard-title"
    >
      <div className="comparison-dashboard-header">
        <div>
          <span className="eyebrow">
            {t("compare.dashboardEyebrow")}
          </span>
          <h2 id="comparison-dashboard-title">
            {t("compare.dashboardTitle")}
          </h2>
          <p>
            {t(
              "compare.dashboardDescription",
            )}
          </p>
        </div>

        <div className="comparison-dashboard-mode">
          <span>
            {t("compare.dashboardDataStatus")}
          </span>
          <strong>
            {(
              resultA?.is_demo
              || resultB?.is_demo
            )
              ? t("compare.dashboardDemoData")
              : t("compare.dashboardLiveData")}
          </strong>
        </div>
      </div>

      <div className="comparison-dashboard-scores">
        <LocationScorePanel
          slot="a"
          result={resultA}
          t={t}
          displayNumber={displayNumber}
        />
        <LocationScorePanel
          slot="b"
          result={resultB}
          t={t}
          displayNumber={displayNumber}
        />
      </div>

      <div className="comparison-dashboard-metrics">
        {dashboard.rows.map((row) => (
          <MetricComparisonCard
            key={row.key}
            row={row}
            resultA={resultA}
            resultB={resultB}
            t={t}
            displayNumber={displayNumber}
            unavailable={unavailable}
          />
        ))}
      </div>

      <div className="comparison-dashboard-summary">
        <span aria-hidden="true">
          {dashboard.overallWinner === "tie"
            ? "≈"
            : "✓"}
        </span>
        <div>
          <strong>
            {t(
              "compare.dashboardSummaryTitle",
            )}
          </strong>
          <p>
            {t(
              summaryKey,
              {
                location:
                  dashboard.overallWinner
                  && dashboard
                    .overallWinner !== "tie"
                    ? dashboard
                      .overallWinner
                      .toUpperCase()
                    : "",
                difference: hasValue(
                  dashboard.scoreDifference,
                )
                  ? displayNumber(
                      dashboard
                        .scoreDifference,
                      1,
                    )
                  : unavailable,
                reasons:
                  supportingRows.length > 0
                    ? supportingRows
                      .map(
                        (row) =>
                          t(row.labelKey),
                      )
                      .join(
                        t(
                          "compare.dashboardReasonSeparator",
                        ),
                      )
                    : t(
                        "compare.dashboardScoreReason",
                      ),
              },
            )}
          </p>
        </div>
      </div>
    </section>
  );
}
