import { jsPDF } from "jspdf";

import embeddedFontDataUrl
  from "../assets/fonts/DejaVuSans.ttf?inline";


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

export const COMPARISON_PDF_COLORS = {
  background: [7, 24, 27],
  surface: [10, 42, 44],
  border: [31, 82, 80],
  accent: [45, 204, 191],
  text: [237, 246, 244],
  muted: [161, 186, 183],
};


export function createComparisonPdf() {
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


export function createComparisonPdfWriter({
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
      ...COMPARISON_PDF_COLORS.background,
    );
    pdf.rect(
      0,
      0,
      PAGE.width,
      PAGE.height,
      "F",
    );
    pdf.setDrawColor(
      ...COMPARISON_PDF_COLORS.border,
    );
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
    pdf.setR2L(false);
    pdf.setFont(FONT_FAMILY, "normal");
    pdf.setFontSize(7.5);
    setColor(
      COMPARISON_PDF_COLORS.muted,
    );
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
      color =
        COMPARISON_PDF_COLORS.text,
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
    pdf.setFillColor(
      ...COMPARISON_PDF_COLORS.accent,
    );
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
      color:
        COMPARISON_PDF_COLORS.text,
      maxWidth:
        PAGE.contentWidth - 7,
      x: isArabic
        ? markerX - 5
        : markerX + 5,
      gap: 3,
    });
  }

  function addNotice(
    text,
    highlighted = false,
  ) {
    pdf.setFontSize(8.5);
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
      ...COMPARISON_PDF_COLORS.surface,
    );
    pdf.setDrawColor(
      ...(
        highlighted
          ? COMPARISON_PDF_COLORS.accent
          : COMPARISON_PDF_COLORS.border
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
    setColor(
      highlighted
        ? COMPARISON_PDF_COLORS.accent
        : COMPARISON_PDF_COLORS.muted,
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
      const height = 21;

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
          ...COMPARISON_PDF_COLORS.surface,
        );
        pdf.setDrawColor(
          ...COMPARISON_PDF_COLORS.border,
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
        setColor(
          COMPARISON_PDF_COLORS.muted,
        );
        pdf.text(
          String(metric.label),
          cellTextX,
          y + 4,
          {
            align: defaultAlign,
            baseline: "top",
            maxWidth:
              columnWidth - 10,
          },
        );
        pdf.setFontSize(8.5);
        setColor(
          COMPARISON_PDF_COLORS.text,
        );
        const valueLines =
          pdf.splitTextToSize(
            String(metric.value),
            columnWidth - 10,
          ).slice(0, 2);

        pdf.text(
          valueLines,
          cellTextX,
          y + 11,
          {
            align: defaultAlign,
            baseline: "top",
          },
        );
      });

      y += height + gap;
    }
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
      const fillColor = isHeader
        ? COMPARISON_PDF_COLORS.surface
        : shaded
          ? [9, 35, 37]
          : COMPARISON_PDF_COLORS
            .background;
      const textColor =
        isHeader
          ? COMPARISON_PDF_COLORS.accent
          : COMPARISON_PDF_COLORS.text;

      layout.cells.forEach((cell) => {
        pdf.setFillColor(...fillColor);
        pdf.setDrawColor(
          ...COMPARISON_PDF_COLORS.border,
        );
        pdf.rect(
          x,
          y,
          cell.width,
          layout.height,
          "FD",
        );
        setColor(textColor);
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
      pdf.setFont(
        FONT_FAMILY,
        "normal",
      );
      pdf.setFontSize(7);
      setColor(
        COMPARISON_PDF_COLORS.muted,
      );
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
    addSection,
    addTable,
    addText,
    finish,
  };
}


export function runComparisonPdfWithDeadline(
  task,
) {
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
