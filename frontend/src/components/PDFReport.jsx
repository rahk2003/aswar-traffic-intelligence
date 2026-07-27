import {
  useRef,
  useState,
} from "react";

import {
  buildEstimatedTrafficActivity,
  formatCoordinate,
  formatNumber,
  getDominantSatelliteClass,
  getRoadName,
  getRoadTypeLabel,
  getSuitabilityCode,
  getTrafficFactorData,
  getTrafficLevelCode,
  hasValue,
} from "../utils/analysis";


function ReportHeader({
  t,
  page,
  totalPages,
}) {
  return (
    <header className="pdf-report-header">
      <div>
        <span>{t("report.projectName")}</span>
        <strong>{t("report.title")}</strong>
      </div>

      <span>
        {t(
          "report.pageNumber",
          {
            page,
            total: totalPages,
          },
        )}
      </span>
    </header>
  );
}


function ReportFooter({ t }) {
  return (
    <footer className="pdf-report-footer">
      {t("report.footer")}
    </footer>
  );
}


function ReportMetric({
  label,
  value,
}) {
  return (
    <div className="pdf-report-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}


export function ReportTemplate({
  result,
  satelliteContext,
  assistantExplanation,
  generatedAt,
  t,
  i18n,
}) {
  const isArabic =
    i18n.language.startsWith("ar");
  const language =
    isArabic ? "ar" : "en";
  const locale =
    isArabic ? "ar-SA" : "en-US";
  const unavailable =
    t("common.unavailable");
  const point = result?.requested_point;
  const spatial = result?.spatial_analysis;
  const traffic = result?.live_traffic;
  const score = result?.traffic_score;
  const radius =
    spatial?.radius_meters
    ?? point?.radius_meters;
  const trafficScore =
    score?.traffic_score;
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
  const suitabilityCode =
    getSuitabilityCode(trafficScore);
  const roadName =
    getRoadName(spatial, isArabic);
  const roadType = getRoadTypeLabel(
    spatial?.nearest_road_type,
    t,
  );
  const factors = getTrafficFactorData(
    score,
  );
  const hasSatelliteContext = (
    satelliteContext?.status
    === "available"
  );
  const totalPages = (
    hasSatelliteContext ? 4 : 3
  );
  const activity =
    buildEstimatedTrafficActivity(
      trafficScore,
      traffic?.congestion_index,
    );
  const sortedFactors = [...factors].sort(
    (first, second) =>
      second.score - first.score,
  );
  const strongest =
    sortedFactors[0];
  const weakest =
    sortedFactors[
      sortedFactors.length - 1
    ];
  const formattedDate =
    new Intl.DateTimeFormat(
      locale,
      {
        calendar: "gregory",
        dateStyle: "long",
        timeStyle: "short",
      },
    ).format(generatedAt);
  const satelliteDate = (() => {
    const rawDate =
      satelliteContext?.imagery
        ?.acquisition_date;

    if (!rawDate) {
      return unavailable;
    }

    const parsedDate = new Date(rawDate);

    return Number.isNaN(
      parsedDate.getTime(),
    )
      ? unavailable
      : new Intl.DateTimeFormat(
          locale,
          {
            calendar: "gregory",
            dateStyle: "medium",
          },
        ).format(parsedDate);
  })();
  const displayNumber = (
    value,
    digits = 0,
  ) => formatNumber(
    value,
    language,
    unavailable,
    digits,
  );
  const formatWithUnit = (
    value,
    unit,
    digits = 0,
  ) => (
    hasValue(value)
      ? `${displayNumber(value, digits)} ${unit}`
      : unavailable
  );
  const defaultExplanation = (
    strongest && weakest
      ? t(
          "report.defaultExplanation",
          {
            score:
              displayNumber(
                trafficScore,
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
  const metrics = [
    {
      label: t("map.roadDensity"),
      value: formatWithUnit(
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
      value: formatWithUnit(
        traffic?.current_speed_kmph,
        t("common.kilometersPerHour"),
        1,
      ),
    },
    {
      label: t("map.freeFlowSpeed"),
      value: formatWithUnit(
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
        ? `${
            displayNumber(
              traffic.congestion_index
                * 100,
              1,
            )
          }${t("common.percent")}`
        : unavailable,
    },
    {
      label: t("map.roadDistance"),
      value: formatWithUnit(
        spatial
          ?.nearest_road_distance_meters,
        t("common.meters"),
        1,
      ),
    },
  ];

  return (
    <div
      className="pdf-report-document"
      dir={isArabic ? "rtl" : "ltr"}
      lang={language}
    >
      <section className="pdf-report-page">
        <ReportHeader
          t={t}
          page={1}
          totalPages={totalPages}
        />

        <div className="pdf-report-content">
          <div className="pdf-report-intro">
            <span>{t("report.generated")}</span>
            <strong>{formattedDate}</strong>
          </div>

          <div className="pdf-report-score">
            <div>
              <span>{t("map.score")}</span>
              <strong>
                {displayNumber(
                  trafficScore,
                  2,
                )}
              </strong>
              <small>
                {t("map.outOf100")}
              </small>
            </div>

            <div>
              <span>{t("report.level")}</span>
              <strong>{levelLabel}</strong>
              <small>
                {t(
                  `dashboard.suitability.${suitabilityCode}`,
                )}
              </small>
            </div>
          </div>

          <h2>{t("report.locationDetails")}</h2>

          <div className="pdf-report-location-grid">
            <ReportMetric
              label={t("map.latitude")}
              value={
                formatCoordinate(
                  point?.latitude,
                )
              }
            />
            <ReportMetric
              label={t("map.longitude")}
              value={
                formatCoordinate(
                  point?.longitude,
                )
              }
            />
            <ReportMetric
              label={t("map.analysisRadius")}
              value={formatWithUnit(
                radius,
                t("common.metersLong"),
              )}
            />
            <ReportMetric
              label={t("map.roadType")}
              value={roadType}
            />
            <ReportMetric
              label={t("map.roadName")}
              value={
                roadName || unavailable
              }
            />
          </div>

          <h2>{t("map.analysisDetails")}</h2>

          <div className="pdf-report-metrics-grid">
            {metrics.map((metric) => (
              <ReportMetric
                key={metric.label}
                {...metric}
              />
            ))}
          </div>
        </div>

        <ReportFooter t={t} />
      </section>

      <section className="pdf-report-page">
        <ReportHeader
          t={t}
          page={2}
          totalPages={totalPages}
        />

        <div className="pdf-report-content">
          <h2>
            {t("dashboard.trafficActivity")}
          </h2>
          <p className="pdf-report-note">
            {t(
              score
                ?.historical_volume_available
                ? (
                    "dashboard."
                    + "trafficActivityNoteWithHistorical"
                  )
                : (
                    "dashboard."
                    + "trafficActivityNote"
                  ),
            )}
          </p>

          <div
            className="pdf-activity-chart"
            role="img"
            aria-label={t(
              "dashboard.trafficActivityChartLabel",
            )}
          >
            {activity.map((item) => (
              <div key={item.timeKey}>
                <span className="pdf-activity-value">
                  {displayNumber(
                    item.activity,
                  )}
                </span>
                <span
                  className="pdf-activity-bar"
                  style={{
                    height:
                      `${Math.max(
                        item.activity,
                        4,
                      ) * 2.2}px`,
                  }}
                />
                <strong>
                  {t(
                    `dashboard.times.${item.timeKey}`,
                  )}
                </strong>
              </div>
            ))}
          </div>

          <h2>
            {t(
              "dashboard.influencingFactors",
            )}
          </h2>
          <p className="pdf-report-note">
            {t("report.factorNote")}
          </p>

          <div className="pdf-factor-list">
            {factors.length > 0
              ? factors.map((factor) => (
                  <div key={factor.key}>
                    <div>
                      <strong>
                        {t(
                          `dashboard.factors.${
                            factor.key
                          }`,
                        )}
                      </strong>
                      <span>
                        {t(
                          "report.factorValues",
                          {
                            score:
                              displayNumber(
                                factor.score,
                                1,
                              ),
                            weight:
                              hasValue(
                                factor.weight,
                              )
                                ? (
                                    displayNumber(
                                      factor.weight,
                                      1,
                                    )
                                    + t(
                                      "common.percent",
                                    )
                                  )
                                : unavailable,
                          },
                        )}
                      </span>
                    </div>

                    <span className="pdf-factor-track">
                      <span
                        style={{
                          width:
                            `${factor.score}%`,
                        }}
                      />
                    </span>
                  </div>
                ))
              : (
                  <p>
                    {t(
                      "dashboard.chartUnavailable",
                    )}
                  </p>
                )}
          </div>
        </div>

        <ReportFooter t={t} />
      </section>

      <section className="pdf-report-page">
        <ReportHeader
          t={t}
          page={3}
          totalPages={totalPages}
        />

        <div className="pdf-report-content">
          <h2>{t("report.finalSummary")}</h2>

          <div className="pdf-report-summary">
            <strong>
              {hasValue(trafficScore)
                ? t(
                    "dashboard.summaryIntro",
                    {
                      score:
                        displayNumber(
                          trafficScore,
                          2,
                        ),
                      level: levelLabel,
                    },
                  )
                : t(
                    "dashboard.summaryUnavailable",
                  )}
            </strong>
            <p>
              {t(
                `dashboard.assessment.${suitabilityCode}`,
              )}
            </p>
          </div>

          <h2>
            {t("report.assistantExplanation")}
          </h2>

          <div className="pdf-report-explanation">
            <span aria-hidden="true">AI</span>
            <p>
              {assistantExplanation
                || defaultExplanation}
            </p>
          </div>

          <h2>{t("map.dataSources")}</h2>

          <div className="pdf-report-source-list">
            <p>{t("map.osmSource")}</p>
            <p>{t("map.tomtomSource")}</p>
          </div>

          <h2>{t("report.methodology")}</h2>

          <p className="pdf-report-paragraph">
            {t("report.methodologyText")}
          </p>

          <div className="pdf-report-disclaimer">
            <strong>
              {t("report.disclaimerTitle")}
            </strong>
            <p>
              {t(
                "dashboard.summaryDisclaimer",
              )}
            </p>
          </div>
        </div>

        <ReportFooter t={t} />
      </section>

      {hasSatelliteContext && (
        <section className="pdf-report-page">
          <ReportHeader
            t={t}
            page={4}
            totalPages={totalPages}
          />

          <div className="pdf-report-content">
            <h2>{t("report.satelliteTitle")}</h2>
            <p className="pdf-report-note">
              {t("report.satelliteEstimated")}
            </p>

            <div className="pdf-satellite-layout">
              <div className="pdf-satellite-preview">
                {satelliteContext.preview_src
                  ? (
                      <img
                        src={
                          satelliteContext
                            .preview_src
                        }
                        alt={t(
                          "satellite.imageAlt",
                        )}
                        crossOrigin="anonymous"
                      />
                    )
                  : (
                      <span>
                        {t(
                          "satellite.imageUnavailable",
                        )}
                      </span>
                    )}
              </div>

              <div className="pdf-satellite-land-list">
                {[
                  [
                    "builtUp",
                    "built_percentage",
                  ],
                  [
                    "bareSoil",
                    "bare_percentage",
                  ],
                  [
                    "vegetation",
                    "vegetation_percentage",
                  ],
                  [
                    "water",
                    "water_percentage",
                  ],
                  [
                    "other",
                    "other_percentage",
                  ],
                ].map(([key, dataKey]) => {
                  const value =
                    satelliteContext
                      .land_context
                      ?.[dataKey];

                  return (
                    <div key={key}>
                      <span>
                        {t(`satellite.${key}`)}
                      </span>
                      <strong>
                        {hasValue(value)
                          ? (
                              displayNumber(
                                value,
                                1,
                              )
                              + t(
                                "common.percent",
                              )
                            )
                          : unavailable}
                      </strong>
                      <i>
                        <i
                          style={{
                            width: `${
                              Math.max(
                                0,
                                Math.min(
                                  Number(value)
                                  || 0,
                                  100,
                                ),
                              )
                            }%`,
                          }}
                        />
                      </i>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pdf-report-location-grid">
              <ReportMetric
                label={t(
                  "satellite.acquisitionDate",
                )}
                value={satelliteDate}
              />
              <ReportMetric
                label={t(
                  "satellite.cloudCover",
                )}
                value={
                  hasValue(
                    satelliteContext
                      .imagery
                      ?.cloud_cover_percentage,
                  )
                    ? (
                        displayNumber(
                          satelliteContext
                            .imagery
                            .cloud_cover_percentage,
                          2,
                        )
                        + t(
                          "common.percent",
                        )
                      )
                    : unavailable
                }
              />
              <ReportMetric
                label={t(
                  "satellite.resolution",
                )}
                value={formatWithUnit(
                  satelliteContext
                    .imagery
                    ?.resolution_meters,
                  t("common.meters"),
                )}
              />
              <ReportMetric
                label={t(
                  "satellite.confidence",
                )}
                value={
                  satelliteContext
                    .quality
                    ?.analysis_confidence
                    ? t(
                        `satellite.confidence${
                          satelliteContext
                            .quality
                            .analysis_confidence
                            .charAt(0)
                            .toUpperCase()
                          + satelliteContext
                            .quality
                            .analysis_confidence
                            .slice(1)
                        }`,
                      )
                    : unavailable
                }
              />
              <ReportMetric
                label={t(
                  "satellite.meanTopProbability",
                )}
                value={
                  hasValue(
                    satelliteContext
                      .quality
                      ?.mean_top_probability_percentage,
                  )
                    ? (
                        displayNumber(
                          satelliteContext
                            .quality
                            .mean_top_probability_percentage,
                          1,
                        )
                        + t(
                          "common.percent",
                        )
                      )
                    : unavailable
                }
              />
              <ReportMetric
                label={t(
                  "satellite.probabilityTotal",
                )}
                value={
                  hasValue(
                    satelliteContext
                      .land_context
                      ?.probability_sum_percentage,
                  )
                    ? (
                        displayNumber(
                          satelliteContext
                            .land_context
                            .probability_sum_percentage,
                          1,
                        )
                        + t(
                          "common.percent",
                        )
                      )
                    : unavailable
                }
              />
            </div>

            <div className="pdf-report-summary">
              <strong>
                {t("satellite.contextSummary")}
              </strong>
              <p>
                {t(
                  `satellite.summaries.${
                    getDominantSatelliteClass(
                      satelliteContext,
                    )
                    || "unavailable"
                  }`,
                )}
              </p>
            </div>

            <p className="pdf-report-paragraph">
              {t(
                "report.satelliteMethodology",
              )}
            </p>

            <div className="pdf-report-source-list">
              <p>
                {t("satellite.source")}:{" "}
                {
                  satelliteContext.source
                    ?.provider
                  || unavailable
                } — {
                  satelliteContext.source
                    ?.dataset
                  || unavailable
                }
              </p>
              <p>
                {t(
                  "satellite.supportingSource",
                )}:{" "}
                {
                  satelliteContext.source
                    ?.supporting_provider
                  || unavailable
                } — {
                  satelliteContext.source
                    ?.supporting_dataset
                  || unavailable
                }
              </p>
            </div>

            <div className="pdf-report-disclaimer">
              <strong>
                {t("report.disclaimerTitle")}
              </strong>
              <p>
                {t(
                  "satellite.aridEnvironmentWarning",
                )}
              </p>
              <p>
                {t(
                  "satellite.trafficScoreNote",
                )}
              </p>
            </div>
          </div>

          <ReportFooter t={t} />
        </section>
      )}
    </div>
  );
}


function waitForNextPaint() {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(resolve);
    });
  });
}

function waitForReportImages(root) {
  const images = Array.from(
    root?.querySelectorAll("img")
    || [],
  );

  return Promise.all(
    images.map((reportImage) => {
      if (reportImage.complete) {
        return Promise.resolve();
      }

      return new Promise((resolve) => {
        let settled = false;
        const finish = () => {
          if (settled) {
            return;
          }

          settled = true;
          reportImage.removeEventListener(
            "load",
            finish,
          );
          reportImage.removeEventListener(
            "error",
            finish,
          );
          resolve();
        };

        reportImage.addEventListener(
          "load",
          finish,
        );
        reportImage.addEventListener(
          "error",
          finish,
        );
        window.setTimeout(finish, 5000);
      });
    }),
  );
}


export default function PDFReportButton({
  result,
  satelliteContext,
  assistantExplanation,
  t,
  i18n,
}) {
  const reportRef = useRef(null);
  const [isGenerating, setIsGenerating] =
    useState(false);
  const [generatedAt, setGeneratedAt] =
    useState(null);
  const [errorMessage, setErrorMessage] =
    useState("");
  const [showSuccess, setShowSuccess] =
    useState(false);


  async function handleDownload() {
    if (isGenerating || !result) {
      return;
    }

    const reportTime = new Date();

    setIsGenerating(true);
    setGeneratedAt(reportTime);
    setErrorMessage("");
    setShowSuccess(false);

    try {
      const librariesPromise = Promise.all([
        import("jspdf"),
        import("html2canvas"),
      ]);
      const reportReadyPromise = (async () => {
        await waitForNextPaint();
        await document.fonts?.ready;
        await waitForReportImages(
          reportRef.current,
        );
      })();
      const [
        [
          { jsPDF },
          { default: html2canvas },
        ],
      ] = await Promise.all([
        librariesPromise,
        reportReadyPromise,
      ]);
      const pages =
        reportRef.current?.querySelectorAll(
          ".pdf-report-page",
        );

      if (!pages?.length) {
        throw new Error(
          "Report pages are unavailable",
        );
      }

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      for (
        let pageIndex = 0;
        pageIndex < pages.length;
        pageIndex += 1
      ) {
        const canvas = await html2canvas(
          pages[pageIndex],
          {
            backgroundColor: "#07181b",
            logging: false,
            scale: 2,
            useCORS: true,
            windowWidth: 794,
          },
        );

        if (pageIndex > 0) {
          pdf.addPage();
        }

        pdf.addImage(
          canvas.toDataURL(
            "image/jpeg",
            0.94,
          ),
          "JPEG",
          0,
          0,
          210,
          297,
          undefined,
          "FAST",
        );
      }

      const latitude =
        Number(
          result?.requested_point?.latitude,
        );
      const longitude =
        Number(
          result?.requested_point?.longitude,
        );
      const coordinatePart = (
        Number.isFinite(latitude)
        && Number.isFinite(longitude)
      )
        ? (
            `${latitude.toFixed(4)}`
            + `-${longitude.toFixed(4)}`
          )
        : "location";
      const datePart =
        reportTime
          .toISOString()
          .slice(0, 10);

      const filename = (
        "traffic-analysis-"
        + `${coordinatePart}-${datePart}.pdf`
      );
      const pdfBlob = pdf.output("blob");
      const objectUrl =
        window.URL.createObjectURL(pdfBlob);
      const downloadLink =
        document.createElement("a");

      downloadLink.href = objectUrl;
      downloadLink.download = filename;
      downloadLink.style.display = "none";
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      window.setTimeout(
        () => (
          window.URL.revokeObjectURL(
            objectUrl,
          )
        ),
        60000,
      );
      setShowSuccess(true);
    } catch {
      setErrorMessage(
        t("report.error"),
      );
    } finally {
      setIsGenerating(false);
    }
  }


  return (
    <div className="pdf-report-action">
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
          ? t("report.generating")
          : t("report.download")}
      </button>

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
        <p
          className="pdf-report-success"
          role="status"
        >
          {t("report.success")}
        </p>
      )}

      {isGenerating && generatedAt && (
        <div
          className="pdf-report-render-root"
          ref={reportRef}
          aria-hidden="true"
        >
          <ReportTemplate
            result={result}
            satelliteContext={
              satelliteContext
            }
            assistantExplanation={
              assistantExplanation
            }
            generatedAt={generatedAt}
            t={t}
            i18n={i18n}
          />
        </div>
      )}
    </div>
  );
}
