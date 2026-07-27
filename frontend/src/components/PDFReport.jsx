import {
  useEffect,
  useRef,
  useState,
} from "react";
import { jsPDF } from "jspdf";

import embeddedFontDataUrl
  from "../assets/fonts/DejaVuSans.ttf?inline";
import {
  formatCoordinate,
  formatNumber,
  getRoadName,
  getRoadTypeLabel,
  getSuitabilityCode,
  getTrafficFactorData,
  getTrafficLevelCode,
  hasValue,
} from "../utils/analysis";


const REPORT_TIMEOUT_MILLISECONDS = 15000;
const FONT_FILENAME = "DejaVuSans.ttf";
const FONT_FAMILY = "DejaVuSans";
const FONT_BASE64 = embeddedFontDataUrl.includes(",")
  ? embeddedFontDataUrl.split(",")[1]
  : embeddedFontDataUrl;
const PAGE = {
  width: 210,
  height: 297,
  margin: 14,
  contentWidth: 182,
  contentBottom: 277,
};
const COLORS = {
  background: [7, 24, 27],
  surface: [10, 42, 44],
  border: [31, 82, 80],
  accent: [45, 204, 191],
  text: [237, 246, 244],
  muted: [161, 186, 183],
  warning: [255, 180, 84],
};


function createConfiguredPdf() {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
    putOnlyUsedFonts: true,
  });

  pdf.addFileToVFS(
    FONT_FILENAME,
    FONT_BASE64,
  );
  pdf.addFont(
    FONT_FILENAME,
    FONT_FAMILY,
    "normal",
  );
  pdf.setFont(FONT_FAMILY, "normal");

  return pdf;
}


function statusLabel(status, t) {
  const normalized = String(
    status || "unavailable",
  ).toLowerCase();

  if (
    normalized === "available"
    || normalized === "configured"
    || normalized === "live"
  ) {
    return t("report.statusAvailable");
  }

  if (normalized === "demo") {
    return t("report.statusDemo");
  }

  if (normalized === "unconfigured") {
    return t("report.statusUnconfigured");
  }

  return t("report.statusUnavailable");
}


function createReportWriter({
  pdf,
  isArabic,
  t,
}) {
  let y = 29;
  const textX = isArabic
    ? PAGE.width - PAGE.margin
    : PAGE.margin;
  const defaultAlign = isArabic
    ? "right"
    : "left";


  function setColor(color) {
    pdf.setTextColor(...color);
  }


  function preparePage() {
    pdf.setFillColor(
      ...COLORS.background,
    );
    pdf.rect(
      0,
      0,
      PAGE.width,
      PAGE.height,
      "F",
    );
    pdf.setDrawColor(...COLORS.border);
    pdf.line(
      PAGE.margin,
      22,
      PAGE.width - PAGE.margin,
      22,
    );
    pdf.line(
      PAGE.margin,
      283,
      PAGE.width - PAGE.margin,
      283,
    );
    // jsPDF already applies its Arabic shaping and bidi engine to Arabic
    // strings. Enabling R2L here reverses the shaped result a second time.
    pdf.setR2L(false);
    pdf.setFont(FONT_FAMILY, "normal");
    pdf.setFontSize(7.5);
    setColor(COLORS.muted);
    pdf.text(
      t("report.projectName"),
      textX,
      15,
      {
        align: defaultAlign,
      },
    );
    y = 29;
  }


  function addPage() {
    pdf.addPage();
    preparePage();
  }


  function ensureSpace(height) {
    if (
      y + height
      > PAGE.contentBottom
    ) {
      addPage();
    }
  }


  function splitLines(
    value,
    maxWidth = PAGE.contentWidth,
  ) {
    return pdf.splitTextToSize(
      String(value ?? ""),
      maxWidth,
    );
  }


  function addText(
    value,
    {
      size = 9,
      color = COLORS.text,
      maxWidth = PAGE.contentWidth,
      gap = 2,
      lineHeight = 1.35,
      align = defaultAlign,
      x = textX,
    } = {},
  ) {
    pdf.setR2L(false);
    pdf.setFontSize(size);
    setColor(color);

    const lines = splitLines(
      value,
      maxWidth,
    );
    const lineHeightMm =
      size * 0.3528 * lineHeight;

    lines.forEach((line) => {
      ensureSpace(lineHeightMm + gap);
      pdf.text(
        line,
        x,
        y,
        {
          align,
          baseline: "top",
        },
      );
      y += lineHeightMm;
    });

    y += gap;
  }


  function addSection(title) {
    ensureSpace(14);
    y += 2;
    pdf.setFillColor(...COLORS.accent);
    const markerX = isArabic
      ? PAGE.width - PAGE.margin - 2
      : PAGE.margin;
    pdf.roundedRect(
      markerX,
      y,
      2,
      8,
      1,
      1,
      "F",
    );
    addText(title, {
      size: 13,
      color: COLORS.text,
      maxWidth:
        PAGE.contentWidth - 7,
      x: isArabic
        ? markerX - 5
        : markerX + 5,
      gap: 3,
    });
  }


  function addNotice(text, demo = false) {
    const lines = splitLines(
      text,
      PAGE.contentWidth - 12,
    );
    const height = Math.max(
      16,
      lines.length * 4.2 + 8,
    );

    ensureSpace(height + 4);
    pdf.setFillColor(
      ...COLORS.surface,
    );
    pdf.setDrawColor(
      ...(
        demo
          ? COLORS.accent
          : COLORS.border
      ),
    );
    pdf.roundedRect(
      PAGE.margin,
      y,
      PAGE.contentWidth,
      height,
      3,
      3,
      "FD",
    );
    pdf.setFontSize(8.5);
    setColor(
      demo
        ? COLORS.accent
        : COLORS.muted,
    );
    pdf.text(
      lines,
      isArabic
        ? PAGE.width - PAGE.margin - 6
        : PAGE.margin + 6,
      y + 5,
      {
        align: defaultAlign,
        baseline: "top",
      },
    );
    y += height + 4;
  }


  function addMetrics(metrics) {
    const gap = 4;
    const columnWidth = (
      PAGE.contentWidth - gap
    ) / 2;

    for (
      let index = 0;
      index < metrics.length;
      index += 2
    ) {
      const row = metrics.slice(
        index,
        index + 2,
      );
      const height = 19;

      ensureSpace(height + gap);

      row.forEach((metric, offset) => {
        const visualOffset = isArabic
          ? 1 - offset
          : offset;
        const x = (
          PAGE.margin
          + visualOffset
          * (columnWidth + gap)
        );
        const cellTextX = isArabic
          ? x + columnWidth - 5
          : x + 5;

        pdf.setFillColor(
          ...COLORS.surface,
        );
        pdf.setDrawColor(
          ...COLORS.border,
        );
        pdf.roundedRect(
          x,
          y,
          columnWidth,
          height,
          2.5,
          2.5,
          "FD",
        );
        pdf.setFontSize(7);
        setColor(COLORS.muted);
        pdf.text(
          String(metric.label),
          cellTextX,
          y + 4,
          {
            align: defaultAlign,
            baseline: "top",
            maxWidth: columnWidth - 10,
          },
        );
        pdf.setFontSize(9);
        setColor(COLORS.text);
        const valueLines = pdf
          .splitTextToSize(
            String(metric.value),
            columnWidth - 10,
          )
          .slice(0, 2);
        pdf.text(
          valueLines,
          cellTextX,
          y + 10,
          {
            align: defaultAlign,
            baseline: "top",
          },
        );
      });

      y += height + gap;
    }
  }


  function addScore({
    score,
    level,
    suitability,
    isDemo,
  }) {
    ensureSpace(36);
    pdf.setFillColor(...COLORS.surface);
    pdf.setDrawColor(
      ...(
        isDemo
          ? COLORS.warning
          : COLORS.accent
      ),
    );
    pdf.roundedRect(
      PAGE.margin,
      y,
      PAGE.contentWidth,
      32,
      4,
      4,
      "FD",
    );

    const scoreX = isArabic
      ? PAGE.width - PAGE.margin - 8
      : PAGE.margin + 8;
    const contextX = isArabic
      ? PAGE.margin + 8
      : PAGE.width - PAGE.margin - 8;

    pdf.setFontSize(25);
    setColor(COLORS.accent);
    pdf.text(
      String(score),
      scoreX,
      y + 8,
      {
        align: defaultAlign,
        baseline: "top",
      },
    );
    pdf.setFontSize(7);
    setColor(COLORS.muted);
    pdf.text(
      t("map.outOf100"),
      scoreX,
      y + 22,
      {
        align: defaultAlign,
        baseline: "top",
      },
    );
    pdf.setFontSize(10);
    setColor(COLORS.text);
    pdf.text(
      String(level),
      contextX,
      y + 8,
      {
        align: isArabic
          ? "left"
          : "right",
        baseline: "top",
        maxWidth: 75,
      },
    );
    pdf.setFontSize(7.5);
    setColor(COLORS.muted);
    pdf.text(
      String(suitability),
      contextX,
      y + 18,
      {
        align: isArabic
          ? "left"
          : "right",
        baseline: "top",
        maxWidth: 75,
      },
    );
    y += 36;
  }


  function addTable({
    headers,
    rows,
    widths,
  }) {
    const padding = 3;
    const sourceWidths = widths
      ?? headers.map(
        () => PAGE.contentWidth
          / headers.length,
      );

    function prepareCells(
      values,
      fontSize,
    ) {
      pdf.setFontSize(fontSize);

      const logicalValues = values.map(
        (value) => String(value ?? ""),
      );
      const visualValues = isArabic
        ? [...logicalValues].reverse()
        : logicalValues;
      const visualWidths = isArabic
        ? [...sourceWidths].reverse()
        : sourceWidths;
      const cells = visualValues.map(
        (value, index) => ({
          lines: pdf.splitTextToSize(
            value,
            visualWidths[index]
              - padding * 2,
          ),
          width: visualWidths[index],
        }),
      );
      const lineHeight =
        fontSize * 0.3528 * 1.25;
      const height = Math.max(
        9,
        ...cells.map(
          (cell) =>
            cell.lines.length
              * lineHeight
              + padding * 2,
        ),
      );

      return {
        cells,
        height,
        lineHeight,
      };
    }

    function drawRow(
      values,
      {
        isHeader = false,
        shaded = false,
      } = {},
    ) {
      const fontSize = isHeader
        ? 7.4
        : 7.1;
      const layout = prepareCells(
        values,
        fontSize,
      );
      let x = PAGE.margin;

      pdf.setFillColor(
        ...(
          isHeader
            ? COLORS.surface
            : shaded
              ? [9, 35, 37]
              : COLORS.background
        ),
      );
      pdf.setDrawColor(...COLORS.border);
      setColor(
        isHeader
          ? COLORS.accent
          : COLORS.text,
      );

      layout.cells.forEach((cell) => {
        pdf.rect(
          x,
          y,
          cell.width,
          layout.height,
          "FD",
        );
        pdf.text(
          cell.lines,
          isArabic
            ? x + cell.width - padding
            : x + padding,
          y + padding,
          {
            align: defaultAlign,
            baseline: "top",
          },
        );
        x += cell.width;
      });

      y += layout.height;
    }

    const headerLayout = prepareCells(
      headers,
      7.4,
    );

    ensureSpace(headerLayout.height + 9);
    drawRow(headers, {
      isHeader: true,
    });

    rows.forEach((row, index) => {
      const rowLayout = prepareCells(
        row,
        7.1,
      );

      if (
        y + rowLayout.height
        > PAGE.contentBottom
      ) {
        addPage();
        drawRow(headers, {
          isHeader: true,
        });
      }

      drawRow(row, {
        shaded: index % 2 === 1,
      });
    });

    y += 4;
  }


  function finish() {
    const totalPages =
      pdf.getNumberOfPages();

    for (
      let page = 1;
      page <= totalPages;
      page += 1
    ) {
      pdf.setPage(page);
      pdf.setR2L(false);
      pdf.setFont(FONT_FAMILY, "normal");
      pdf.setFontSize(7);
      setColor(COLORS.muted);
      pdf.text(
        t(
          "report.pageNumber",
          {
            page,
            total: totalPages,
          },
        ),
        textX,
        288,
        {
          align: defaultAlign,
        },
      );
      pdf.text(
        t("report.footer"),
        isArabic
          ? PAGE.margin
          : PAGE.width - PAGE.margin,
        288,
        {
          align: isArabic
            ? "left"
            : "right",
        },
      );
    }
  }


  preparePage();

  return {
    addMetrics,
    addNotice,
    addScore,
    addSection,
    addTable,
    addText,
    finish,
  };
}


function buildLocationReportPdf({
  result,
  satelliteContext,
  assistantExplanation,
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
  const point = result?.requested_point;
  const spatial = result?.spatial_analysis;
  const traffic = result?.live_traffic;
  const score = result?.traffic_score;
  const sourceStatuses =
    result?.source_status || {};
  const factors = getTrafficFactorData(
    score,
  );
  const sortedFactors = [...factors].sort(
    (first, second) =>
      second.score - first.score,
  );
  const strongest = sortedFactors[0];
  const weakest = sortedFactors.at(-1);
  const displayNumber = (
    value,
    digits = 0,
  ) => formatNumber(
    value,
    language,
    unavailable,
    digits,
  );
  const withUnit = (
    value,
    unit,
    digits = 0,
  ) => (
    hasValue(value)
      ? `${displayNumber(
          value,
          digits,
        )} ${unit}`
      : unavailable
  );
  const levelCode =
    getTrafficLevelCode(score);
  const suitabilityCode =
    getSuitabilityCode(
      score?.traffic_score,
    );
  const levelLabel = t(
    `levels.${levelCode}`,
    {
      defaultValue:
        score?.traffic_level
        || t("levels.unknown"),
    },
  );
  const defaultExplanation = (
    strongest && weakest
      ? t(
          "report.defaultExplanation",
          {
            score: displayNumber(
              score?.traffic_score,
              2,
            ),
            strongest: t(
              `dashboard.factors.${
                strongest.key
              }`,
            ),
            strongestScore:
              displayNumber(
                strongest.score,
                1,
              ),
            weakest: t(
              `dashboard.factors.${
                weakest.key
              }`,
            ),
            weakestScore:
              displayNumber(
                weakest.score,
                1,
              ),
          },
        )
      : t(
          "report.defaultExplanationUnavailable",
        )
  );
  const pdf = createConfiguredPdf();

  const writer = createReportWriter({
    pdf,
    isArabic,
    t,
  });
  const formattedDate =
    new Intl.DateTimeFormat(
      locale,
      {
        calendar: "gregory",
        dateStyle: "long",
        timeStyle: "short",
      },
    ).format(generatedAt);

  writer.addText(t("report.title"), {
    size: 18,
    color: COLORS.accent,
    gap: 1,
  });
  writer.addText(formattedDate, {
    size: 7.5,
    color: COLORS.muted,
    gap: 3,
  });

  if (result?.is_demo) {
    writer.addNotice(
      t("report.demoDataNotice"),
      true,
    );
  }

  writer.addScore({
    score: displayNumber(
      score?.traffic_score,
      2,
    ),
    level: levelLabel,
    suitability: t(
      `dashboard.suitability.${suitabilityCode}`,
    ),
    isDemo: Boolean(result?.is_demo),
  });

  writer.addSection(
    t("report.locationDetails"),
  );
  writer.addMetrics([
    {
      label: t("map.latitude"),
      value: formatCoordinate(
        point?.latitude,
      ),
    },
    {
      label: t("map.longitude"),
      value: formatCoordinate(
        point?.longitude,
      ),
    },
    {
      label: t("map.analysisRadius"),
      value: withUnit(
        spatial?.radius_meters
        ?? point?.radius_meters,
        t("common.metersLong"),
      ),
    },
    {
      label: t("map.roadName"),
      value: getRoadName(
        spatial,
        isArabic,
      ) || unavailable,
    },
    {
      label: t("map.roadType"),
      value: getRoadTypeLabel(
        spatial?.nearest_road_type,
        t,
      ),
    },
    {
      label: t("report.dataMode"),
      value: result?.is_demo
        ? t("report.demoMode")
        : t("report.liveMode"),
    },
  ]);

  writer.addSection(
    t("map.analysisDetails"),
  );
  writer.addMetrics([
    {
      label: t("map.roadDensity"),
      value: withUnit(
        spatial?.road_density_km_per_km2,
        t(
          "common.kilometersPerSquareKm",
        ),
        2,
      ),
    },
    {
      label: t("map.intersections"),
      value: displayNumber(
        spatial?.intersection_count,
      ),
    },
    {
      label: t("map.nearbyServices"),
      value: displayNumber(
        spatial?.nearby_services_count,
      ),
    },
    {
      label: t("map.trafficSignals"),
      value: displayNumber(
        spatial?.traffic_signals_count,
      ),
    },
    {
      label: t("map.currentSpeed"),
      value: withUnit(
        traffic?.current_speed_kmph,
        t("common.kilometersPerHour"),
        1,
      ),
    },
    {
      label: t("map.freeFlowSpeed"),
      value: withUnit(
        traffic?.free_flow_speed_kmph,
        t("common.kilometersPerHour"),
        1,
      ),
    },
    {
      label: t("map.congestion"),
      value: hasValue(
        traffic?.congestion_index,
      )
        ? (
            displayNumber(
              traffic.congestion_index
                * 100,
              1,
            )
            + t("common.percent")
          )
        : unavailable,
    },
    {
      label: t("map.roadDistance"),
      value: withUnit(
        spatial
          ?.nearest_road_distance_meters,
        t("common.metersLong"),
        1,
      ),
    },
  ]);

  writer.addSection(
    t("dashboard.influencingFactors"),
  );
  writer.addMetrics(
    factors.map((factor) => ({
      label: t(
        `dashboard.factors.${factor.key}`,
      ),
      value: (
        `${displayNumber(
          factor.score,
          1,
        )}/100`
        + (
          hasValue(factor.weight)
            ? ` • ${displayNumber(
                factor.weight,
                1,
              )}${t("common.percent")}`
            : ""
        )
      ),
    })),
  );

  writer.addSection(
    t("report.satelliteTitle"),
  );

  const hasSatellite = [
    "available",
    "demo",
  ].includes(
    satelliteContext?.status,
  );

  if (hasSatellite) {
    const land =
      satelliteContext?.land_context;
    const quality =
      satelliteContext?.quality;
    const imagery =
      satelliteContext?.imagery;
    const rawDate =
      imagery?.acquisition_date;
    const parsedDate = rawDate
      ? new Date(rawDate)
      : null;
    const satelliteDate = (
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

    if (satelliteContext?.is_demo) {
      writer.addNotice(
        t("satellite.demoNotice"),
        true,
      );
    }

    writer.addMetrics([
      {
        label: t("satellite.builtUp"),
        value: (
          displayNumber(
            land?.built_percentage,
            1,
          )
          + t("common.percent")
        ),
      },
      {
        label: t("satellite.bareSoil"),
        value: (
          displayNumber(
            land?.bare_percentage,
            1,
          )
          + t("common.percent")
        ),
      },
      {
        label: t("satellite.vegetation"),
        value: (
          displayNumber(
            land?.vegetation_percentage,
            1,
          )
          + t("common.percent")
        ),
      },
      {
        label: t("satellite.water"),
        value: (
          displayNumber(
            land?.water_percentage,
            1,
          )
          + t("common.percent")
        ),
      },
      {
        label: t("satellite.other"),
        value: (
          displayNumber(
            land?.other_percentage,
            1,
          )
          + t("common.percent")
        ),
      },
      {
        label: t(
          "satellite.acquisitionDate",
        ),
        value: satelliteDate,
      },
      {
        label: t("satellite.confidence"),
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
      {
        label: t(
          "satellite.probabilityTotal",
        ),
        value: (
          displayNumber(
            land
              ?.probability_sum_percentage,
            1,
          )
          + t("common.percent")
        ),
      },
    ]);
  } else {
    writer.addNotice(
      t("report.satelliteUnavailable"),
    );
  }

  writer.addSection(
    t("report.assistantExplanation"),
  );
  writer.addNotice(
    assistantExplanation
    || defaultExplanation,
    Boolean(result?.is_demo),
  );

  writer.addSection(
    t("report.dataSources"),
  );
  writer.addMetrics(
    Object.entries(
      sourceStatuses,
    ).map(([source, status]) => ({
      label: source,
      value: statusLabel(status, t),
    })),
  );

  writer.addSection(
    t("report.methodology"),
  );
  writer.addText(
    t("report.methodologyText"),
    {
      size: 8.5,
      color: COLORS.muted,
      lineHeight: 1.45,
    },
  );
  writer.addNotice(
    t("satellite.trafficScoreNote"),
  );
  writer.finish();

  return pdf;
}


function runWithDeadline(task) {
  let timeoutId;

  const deadline = new Promise(
    (_resolve, reject) => {
      timeoutId = window.setTimeout(
        () => reject(
          new Error("REPORT_TIMEOUT"),
        ),
        REPORT_TIMEOUT_MILLISECONDS,
      );
    },
  );

  return Promise.race([
    Promise.resolve().then(task),
    deadline,
  ]).finally(() => {
    window.clearTimeout(timeoutId);
  });
}


export default function PDFReportButton({
  result,
  satelliteContext,
  assistantExplanation,
  t,
  i18n,
}) {
  const downloadUrlRef = useRef(null);
  const [isGenerating, setIsGenerating] =
    useState(false);
  const [progressStage, setProgressStage] =
    useState("");
  const [errorMessage, setErrorMessage] =
    useState("");
  const [showSuccess, setShowSuccess] =
    useState(false);
  const [lastDurationMilliseconds,
    setLastDurationMilliseconds] =
      useState(null);
  const [generatedFile, setGeneratedFile] =
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
    if (isGenerating || !result) {
      return;
    }

    const reportTime = new Date();
    const startedAt = performance.now();

    setIsGenerating(true);
    setProgressStage("preparing");
    setErrorMessage("");
    setShowSuccess(false);
    setLastDurationMilliseconds(null);
    setGeneratedFile(null);

    if (downloadUrlRef.current) {
      window.URL.revokeObjectURL(
        downloadUrlRef.current,
      );
      downloadUrlRef.current = null;
    }

    try {
      const pdfBlob =
        await runWithDeadline(
          async () => {
            setProgressStage(
              "generating",
            );

            const pdf =
              buildLocationReportPdf({
                result,
                satelliteContext,
                assistantExplanation,
                generatedAt: reportTime,
                t,
                i18n,
              });

            setProgressStage(
              "downloading",
            );

            return pdf.output("blob");
          },
        );

      if (
        !pdfBlob
        || pdfBlob.size < 1000
      ) {
        throw new Error(
          "REPORT_FILE_INVALID",
        );
      }

      const datePart =
        reportTime
          .toISOString()
          .slice(0, 10);
      const filename = (
        "aswar-location-report-"
        + `${datePart}.pdf`
      );
      const objectUrl =
        window.URL.createObjectURL(
          pdfBlob,
        );
      const downloadLink =
        document.createElement("a");

      downloadUrlRef.current =
        objectUrl;
      setGeneratedFile({
        url: objectUrl,
        filename,
        size: pdfBlob.size,
      });
      downloadLink.href = objectUrl;
      downloadLink.download = filename;
      downloadLink.style.display =
        "none";
      document.body.appendChild(
        downloadLink,
      );
      downloadLink.click();
      downloadLink.remove();

      setLastDurationMilliseconds(
        Math.round(
          performance.now() - startedAt,
        ),
      );
      setShowSuccess(true);
    } catch (error) {
      setErrorMessage(
        error?.message === "REPORT_TIMEOUT"
          ? t("report.timeout")
          : t("report.error"),
      );
    } finally {
      setIsGenerating(false);
      setProgressStage("");
    }
  }


  return (
    <div
      className="pdf-report-action"
      data-report-duration-ms={
        lastDurationMilliseconds
        ?? ""
      }
      data-report-file-size={
        generatedFile?.size
        ?? ""
      }
      data-report-stage={progressStage}
    >
      <button
        type="button"
        className={
          "button button-secondary "
          + "pdf-download-button"
        }
        onClick={handleDownload}
        disabled={isGenerating}
      >
        <span aria-hidden="true">↓</span>
        {isGenerating
          ? t(
              `report.progress.${progressStage}`,
            )
          : t("report.download")}
      </button>

      {isGenerating && (
        <p
          className="pdf-report-progress"
          role="status"
        >
          {t(
            `report.progress.${progressStage}`,
          )}
        </p>
      )}

      {errorMessage && (
        <p role="alert">
          {errorMessage}
          {" "}
          <button
            type="button"
            onClick={handleDownload}
          >
            {t("report.retry")}
          </button>
        </p>
      )}

      {showSuccess && (
        <div className="pdf-report-success">
          <p role="status">
            {t("report.success")}
          </p>

          {generatedFile && (
            <a
              href={generatedFile.url}
              download={
                generatedFile.filename
              }
            >
              {t("report.downloadAgain")}
            </a>
          )}
        </div>
      )}
    </div>
  );
}
