import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  COMPARISON_PDF_COLORS,
  createComparisonPdf,
  createComparisonPdfWriter,
  runComparisonPdfWithDeadline,
} from "../utils/comparisonPdf";
import {
  formatCoordinate,
  formatNumber,
  getRoadTypeLabel,
  hasValue,
} from "../utils/analysis";
import {
  buildDashboardComparisons,
  getComparisonValue,
  getLocationFactorSummary,
} from "../utils/comparison";


function sourceStatusLabel(status, t) {
  const normalized = String(
    status ?? "unavailable",
  ).toLowerCase();

  if (normalized === "demo") {
    return t("report.statusDemo");
  }

  if (
    normalized === "available"
    || normalized === "configured"
    || normalized === "live"
  ) {
    return t("report.statusAvailable");
  }

  if (normalized === "unconfigured") {
    return t("report.statusUnconfigured");
  }

  return t("report.statusUnavailable");
}


function buildComparisonPdf({
  resultA,
  resultB,
  satellites,
  assistant,
  generatedAt,
  t,
  i18n,
}) {
  const isArabic =
    i18n.language.startsWith("ar");
  const language = isArabic
    ? "ar"
    : "en";
  const locale = isArabic
    ? "ar-SA"
    : "en-US";
  const unavailable =
    t("common.unavailable");
  const displayNumber = (
    value,
    digits = 0,
  ) => formatNumber(
    value,
    language,
    unavailable,
    digits,
  );
  const pdf = createComparisonPdf();
  const writer =
    createComparisonPdfWriter({
      pdf,
      isArabic,
      t,
    });
  const dashboard =
    buildDashboardComparisons(
      resultA,
      resultB,
    );
  const winner = (
    dashboard.overallWinner
    && dashboard.overallWinner !== "tie"
  )
    ? dashboard.overallWinner
      .toUpperCase()
    : null;
  const winnerLocation = winner
    ? t(
        `compare.location${
          winner.toLowerCase()
        }`,
      )
    : null;
  const isTie =
    dashboard.overallWinner === "tie";
  const isDemo = Boolean(
    resultA?.is_demo
    || resultB?.is_demo,
  );
  const radius =
    getComparisonValue(
      resultA,
      "analysisRadius",
    )
    ?? getComparisonValue(
      resultB,
      "analysisRadius",
    );
  const factorA =
    getLocationFactorSummary(resultA);
  const factorB =
    getLocationFactorSummary(resultB);
  const factorLabel = (factor) => (
    factor
      ? t(
          `dashboard.factors.${factor.key}`,
        )
      : unavailable
  );
  const factorValue = (factor) => (
    factor
      ? (
          `${factorLabel(factor)} - `
          + `${displayNumber(
            factor.score,
            1,
          )}/100`
        )
      : unavailable
  );
  const formattedDate =
    new Intl.DateTimeFormat(
      locale,
      {
        calendar: "gregory",
        dateStyle: "long",
        timeStyle: "short",
      },
    ).format(generatedAt);
  const pointA =
    resultA?.requested_point ?? {};
  const pointB =
    resultB?.requested_point ?? {};

  writer.addText(
    t("compare.pdfTitle"),
    {
      size: 18,
      color:
        COMPARISON_PDF_COLORS.accent,
      gap: 1,
    },
  );
  writer.addText(formattedDate, {
    size: 7.5,
    color:
      COMPARISON_PDF_COLORS.muted,
    gap: 3,
  });

  if (isDemo) {
    writer.addNotice(
      t("compare.pdfDemoNotice"),
      true,
    );
  }

  writer.addSection(
    t("compare.pdfLocations"),
  );
  writer.addMetrics([
    {
      label:
        `${t("compare.locationa")} - ${t("map.latitude")}`,
      value: formatCoordinate(
        pointA.latitude,
      ),
    },
    {
      label:
        `${t("compare.locationa")} - ${t("map.longitude")}`,
      value: formatCoordinate(
        pointA.longitude,
      ),
    },
    {
      label:
        `${t("compare.locationb")} - ${t("map.latitude")}`,
      value: formatCoordinate(
        pointB.latitude,
      ),
    },
    {
      label:
        `${t("compare.locationb")} - ${t("map.longitude")}`,
      value: formatCoordinate(
        pointB.longitude,
      ),
    },
    {
      label: t("map.analysisRadius"),
      value: hasValue(radius)
        ? (
            `${displayNumber(radius)} `
            + t("common.metersLong")
          )
        : unavailable,
    },
    {
      label: t("report.dataMode"),
      value: isDemo
        ? t("report.demoMode")
        : t("report.liveMode"),
    },
  ]);

  writer.addSection(
    t("compare.pdfDashboard"),
  );
  writer.addMetrics([
    {
      label:
        `${t("compare.locationa")} - ${t("map.score")}`,
      value:
        `${displayNumber(
          getComparisonValue(
            resultA,
            "score",
          ),
          1,
        )}/100`,
    },
    {
      label:
        `${t("compare.locationb")} - ${t("map.score")}`,
      value:
        `${displayNumber(
          getComparisonValue(
            resultB,
            "score",
          ),
          1,
        )}/100`,
    },
    {
      label: t(
        "compare.dashboardSummaryTitle",
      ),
      value: winner
        ? t(
            "compare.pdfWinnerLocation",
            {
              location: winnerLocation,
            },
          )
        : isTie
          ? t("compare.dashboardTie")
          : t(
              "compare.dashboardNoWinner",
            ),
    },
    {
      label:
        t("compare.scoreDifference"),
      value: hasValue(
        dashboard.scoreDifference,
      )
        ? (
            `${displayNumber(
              dashboard.scoreDifference,
              1,
            )} ${t("compare.points")}`
          )
        : unavailable,
    },
  ]);

  writer.addSection(
    t("compare.pdfMetricTable"),
  );
  writer.addTable({
    headers: [
      t("compare.metric"),
      t("compare.locationa"),
      t("compare.locationb"),
      t("compare.pdfWinnerAndDifference"),
    ],
    widths: [54, 42, 42, 44],
    rows: dashboard.rows.map((row) => {
      const roadTypeA =
        getRoadTypeLabel(
          getComparisonValue(
            resultA,
            "roadType",
          ),
          t,
        );
      const roadTypeB =
        getRoadTypeLabel(
          getComparisonValue(
            resultB,
            "roadType",
          ),
          t,
        );
      const value = (
        number,
        slot,
      ) => {
        if (!hasValue(number)) {
          return unavailable;
        }

        if (
          row.key === "score"
          || row.key === "roadTypeScore"
        ) {
          const prefix =
            row.key === "roadTypeScore"
              ? `${slot === "a"
                ? roadTypeA
                : roadTypeB} - `
              : "";

          return (
            prefix
            + `${displayNumber(
              number,
              1,
            )}/100`
          );
        }

        if (row.key === "density") {
          return (
            `${displayNumber(
              number,
              2,
            )} `
            + t(
              "common.kilometersPerSquareKm",
            )
          );
        }

        if (
          row.key
          === "congestionPercent"
        ) {
          return (
            displayNumber(number, 1)
            + t("common.percent")
          );
        }

        return displayNumber(
          number,
          row.digits,
        );
      };
      const difference = hasValue(
        row.difference,
      )
        ? displayNumber(
            row.difference,
            row.digits,
          )
        : unavailable;
      const winnerText =
        row.winner === "tie"
          ? t("compare.dashboardTie")
          : row.winner
            ? t(
                "compare.pdfWinnerLocation",
                {
                  location: t(
                    `compare.location${
                      row.winner
                    }`,
                  ),
                },
              )
            : t(
                "compare.dashboardNoWinner",
              );

      return [
        t(row.labelKey),
        value(row.valueA, "a"),
        value(row.valueB, "b"),
        (
          `${winnerText}\n`
          + `${t(
            "compare.dashboardDifference",
          )}: ${difference}`
        ),
      ];
    }),
  });

  writer.addSection(
    t("compare.pdfStrengthsWeaknesses"),
  );
  writer.addMetrics([
    {
      label:
        `${t("compare.locationa")} - ${t("compare.pdfStrongest")}`,
      value: factorValue(
        factorA.strongest,
      ),
    },
    {
      label:
        `${t("compare.locationb")} - ${t("compare.pdfStrongest")}`,
      value: factorValue(
        factorB.strongest,
      ),
    },
    {
      label:
        `${t("compare.locationa")} - ${t("compare.pdfWeakest")}`,
      value: factorValue(
        factorA.weakest,
      ),
    },
    {
      label:
        `${t("compare.locationb")} - ${t("compare.pdfWeakest")}`,
      value: factorValue(
        factorB.weakest,
      ),
    },
  ]);

  writer.addSection(
    t("compare.pdfSatellite"),
  );

  ["a", "b"].forEach((slot) => {
    const state = satellites?.[slot];
    const context = state?.data;
    const land = context?.land_context;
    const quality = context?.quality;
    const rawDate =
      context?.imagery?.acquisition_date;
    const parsedDate = rawDate
      ? new Date(rawDate)
      : null;
    const acquisitionDate = (
      parsedDate
      && !Number.isNaN(
        parsedDate.getTime(),
      )
    )
      ? new Intl.DateTimeFormat(
          locale,
          {
            calendar: "gregory",
            dateStyle: "medium",
          },
        ).format(parsedDate)
      : unavailable;
    const isAvailable = [
      "available",
      "demo",
    ].includes(state?.status);

    if (!isAvailable) {
      writer.addNotice(
        t(
          "compare.pdfSatelliteUnavailable",
          {
            location:
              slot.toUpperCase(),
          },
        ),
      );
      return;
    }

    writer.addText(
      t(
        "compare.satelliteLocationTitle",
        {
          location:
            slot.toUpperCase(),
        },
      ),
      {
        size: 10,
        color:
          COMPARISON_PDF_COLORS.accent,
        gap: 2,
      },
    );
    writer.addMetrics([
      {
        label: t("satellite.builtUp"),
        value:
          `${displayNumber(
            land?.built_percentage,
            1,
          )}${t("common.percent")}`,
      },
      {
        label: t("satellite.bareSoil"),
        value:
          `${displayNumber(
            land?.bare_percentage,
            1,
          )}${t("common.percent")}`,
      },
      {
        label: t("satellite.vegetation"),
        value:
          `${displayNumber(
            land?.vegetation_percentage,
            1,
          )}${t("common.percent")}`,
      },
      {
        label: t("satellite.water"),
        value:
          `${displayNumber(
            land?.water_percentage,
            1,
          )}${t("common.percent")}`,
      },
      {
        label:
          t("satellite.acquisitionDate"),
        value: acquisitionDate,
      },
      {
        label:
          t("satellite.confidence"),
        value:
          quality?.analysis_confidence
            ? t(
                `satellite.confidence${
                  quality
                    .analysis_confidence
                    .charAt(0)
                    .toUpperCase()
                  + quality
                    .analysis_confidence
                    .slice(1)
                }`,
              )
            : unavailable,
      },
    ]);
  });

  writer.addSection(
    t("compare.pdfAssistant"),
  );
  writer.addNotice(
    assistant?.answer
    || (
      winner
        ? t(
            "compare.pdfAssistantFallback",
            {
              location:
                winnerLocation,
              difference: displayNumber(
                dashboard.scoreDifference,
                1,
              ),
            },
          )
        : isTie
          ? t(
              "compare.pdfAssistantFallbackTie",
            )
          : t(
              "compare.pdfAssistantFallbackUnavailable",
            )
    ),
    isDemo,
  );

  writer.addSection(
    t("compare.pdfRecommendation"),
  );
  writer.addNotice(
    winner
      ? t(
          "compare.pdfRecommendationWinner",
          {
            location: winnerLocation,
            difference:
              displayNumber(
                dashboard
                  .scoreDifference,
                1,
              ),
          },
        )
      : isTie
        ? t(
            "compare.pdfRecommendationTie",
          )
        : t(
            "compare.pdfRecommendationUnavailable",
          ),
  );

  writer.addSection(
    t("compare.pdfSources"),
  );
  const sourceNames = Array.from(
    new Set([
      ...Object.keys(
        resultA?.source_status ?? {},
      ),
      ...Object.keys(
        resultB?.source_status ?? {},
      ),
      "satellite",
    ]),
  );
  writer.addTable({
    headers: [
      t("compare.pdfSource"),
      t("compare.locationa"),
      t("compare.locationb"),
    ],
    widths: [62, 60, 60],
    rows: sourceNames.map((source) => {
      const statusA = source === "satellite"
        ? satellites?.a?.status
        : resultA?.source_status?.[source];
      const statusB = source === "satellite"
        ? satellites?.b?.status
        : resultB?.source_status?.[source];

      return [
        source,
        sourceStatusLabel(statusA, t),
        sourceStatusLabel(statusB, t),
      ];
    }),
  });

  writer.addNotice(
    t("compare.pdfDisclaimer"),
  );
  writer.finish();

  return pdf;
}


export default function ComparisonPDFReport({
  resultA,
  resultB,
  satellites,
  assistant,
  t,
  i18n,
}) {
  const downloadUrlRef = useRef(null);
  const [isGenerating, setIsGenerating] =
    useState(false);
  const [errorMessage, setErrorMessage] =
    useState("");
  const [showSuccess, setShowSuccess] =
    useState(false);
  const [lastDuration, setLastDuration] =
    useState(null);
  const [lastFileSize, setLastFileSize] =
    useState(null);
  const [lastPageCount, setLastPageCount] =
    useState(null);

  useEffect(
    () => () => {
      if (downloadUrlRef.current) {
        window.URL.revokeObjectURL(
          downloadUrlRef.current,
        );
      }
    },
    [],
  );

  async function handleDownload() {
    if (
      isGenerating
      || !resultA
      || !resultB
    ) {
      return;
    }

    const generatedAt = new Date();
    const startedAt = performance.now();

    setIsGenerating(true);
    setErrorMessage("");
    setShowSuccess(false);
    setLastDuration(null);
    setLastFileSize(null);
    setLastPageCount(null);

    if (downloadUrlRef.current) {
      window.URL.revokeObjectURL(
        downloadUrlRef.current,
      );
      downloadUrlRef.current = null;
    }

    try {
      const generated =
        await runComparisonPdfWithDeadline(
          () => {
            const pdf =
              buildComparisonPdf({
                resultA,
                resultB,
                satellites,
                assistant,
                generatedAt,
                t,
                i18n,
              });

            return {
              blob: pdf.output("blob"),
              pages:
                pdf.getNumberOfPages(),
            };
          },
        );

      if (
        !generated.blob
        || generated.blob.size < 1000
      ) {
        throw new Error(
          "REPORT_FILE_INVALID",
        );
      }

      const filename = (
        "aswar-location-comparison-report-"
        + `${generatedAt
          .toISOString()
          .slice(0, 10)}.pdf`
      );
      const objectUrl =
        window.URL.createObjectURL(
          generated.blob,
        );
      const link =
        document.createElement("a");

      downloadUrlRef.current =
        objectUrl;
      link.href = objectUrl;
      link.download = filename;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      link.remove();

      setLastDuration(
        Math.round(
          performance.now() - startedAt,
        ),
      );
      setLastFileSize(
        generated.blob.size,
      );
      setLastPageCount(
        generated.pages,
      );
      setShowSuccess(true);
    } catch (error) {
      setErrorMessage(
        error?.message === "REPORT_TIMEOUT"
          ? t("compare.pdfTimeout")
          : t("compare.pdfError"),
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div
      className="comparison-pdf-action"
      data-comparison-report-duration-ms={
        lastDuration ?? ""
      }
      data-comparison-report-file-size={
        lastFileSize ?? ""
      }
      data-comparison-report-page-count={
        lastPageCount ?? ""
      }
    >
      <button
        type="button"
        className="button button-primary"
        onClick={handleDownload}
        disabled={isGenerating}
      >
        <span aria-hidden="true">↓</span>
        {isGenerating
          ? t("compare.pdfGenerating")
          : t("compare.pdfButton")}
      </button>

      {showSuccess && (
        <span role="status">
          {t("compare.pdfSuccess")}
        </span>
      )}

      {errorMessage && (
        <span role="alert">
          {errorMessage}
        </span>
      )}
    </div>
  );
}
