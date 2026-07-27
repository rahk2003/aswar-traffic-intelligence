import {
  useEffect,
  useState,
} from "react";

import {
  explainComparison,
  getApiAssetUrl,
  getSatelliteContext,
} from "../services/api";
import {
  formatNumber,
  getRoadName,
  getTrafficFactorData,
  getTrafficLevelCode,
} from "../utils/analysis";
import { DemoBadge } from "./AnalysisComponents";
import ComparisonPDFReport
  from "./ComparisonPDFReport";


const LAND_ROWS = [
  {
    key: "builtUp",
    dataKey: "built_percentage",
  },
  {
    key: "bareSoil",
    dataKey: "bare_percentage",
  },
  {
    key: "vegetation",
    dataKey: "vegetation_percentage",
  },
  {
    key: "water",
    dataKey: "water_percentage",
  },
  {
    key: "other",
    dataKey: "other_percentage",
  },
];


function emptySatelliteState() {
  return {
    a: {
      status: "loading",
      data: null,
      error: "",
    },
    b: {
      status: "loading",
      data: null,
      error: "",
    },
  };
}


function buildAssistantLocation(
  result,
  satellite,
  t,
  isArabic,
) {
  const point = result?.requested_point;
  const spatial = result?.spatial_analysis;
  const traffic = result?.live_traffic;
  const score = result?.traffic_score;
  const levelCode =
    getTrafficLevelCode(score);
  const hasSatellite = [
    "available",
    "demo",
  ].includes(
    satellite?.status,
  );

  return {
    data_mode:
      result?.data_mode
      ?? (
        result?.is_demo
          ? "demo"
          : "live"
      ),
    is_demo: Boolean(
      result?.is_demo,
    ),
    latitude:
      point?.latitude ?? null,
    longitude:
      point?.longitude ?? null,
    radius_meters:
      spatial?.radius_meters
      ?? point?.radius_meters
      ?? null,
    traffic_score:
      score?.traffic_score ?? null,
    traffic_level: t(
      `levels.${levelCode}`,
      {
        defaultValue:
          score?.traffic_level
          || t("levels.unknown"),
      },
    ),
    road_density_km_per_km2:
      spatial
        ?.road_density_km_per_km2
      ?? null,
    intersection_count:
      spatial?.intersection_count
      ?? null,
    nearby_services_count:
      spatial
        ?.nearby_services_count
      ?? null,
    nearest_road_type:
      spatial?.nearest_road_type
      ?? null,
    nearest_road_name:
      getRoadName(
        spatial,
        isArabic,
      ) ?? null,
    current_speed_kmph:
      traffic?.current_speed_kmph
      ?? null,
    free_flow_speed_kmph:
      traffic?.free_flow_speed_kmph
      ?? null,
    congestion_index:
      traffic?.congestion_index
      ?? null,
    historical_volume_available:
      Boolean(
        score
          ?.historical_volume_available,
      ),
    factors: getTrafficFactorData(
      score,
    ).map((factor) => ({
      key: factor.key,
      score: factor.score,
      weight: factor.weight,
    })),
    satellite_context: hasSatellite
      ? {
          acquisition_date:
            satellite.imagery
              ?.acquisition_date
            ?? null,
          cloud_cover_percentage:
            satellite.imagery
              ?.cloud_cover_percentage
            ?? null,
          built_percentage:
            satellite.land_context
              ?.built_percentage
            ?? null,
          bare_percentage:
            satellite.land_context
              ?.bare_percentage
            ?? null,
          vegetation_percentage:
            satellite.land_context
              ?.vegetation_percentage
            ?? null,
          water_percentage:
            satellite.land_context
              ?.water_percentage
            ?? null,
          other_percentage:
            satellite.land_context
              ?.other_percentage
            ?? null,
          probability_sum_percentage:
            satellite.land_context
              ?.probability_sum_percentage
            ?? null,
          mean_top_probability_percentage:
            satellite.quality
              ?.mean_top_probability_percentage
            ?? null,
          mean_ndvi:
            satellite.spectral_indices
              ?.mean_ndvi
            ?? null,
          mean_ndbi:
            satellite.spectral_indices
              ?.mean_ndbi
            ?? null,
          mean_bsi:
            satellite.spectral_indices
              ?.mean_bsi
            ?? null,
          analysis_confidence:
            satellite.quality
              ?.analysis_confidence
            ?? null,
          is_estimated: true,
        }
      : null,
  };
}


function SatelliteComparisonCard({
  slot,
  state,
  t,
  i18n,
  onRetry,
}) {
  const [imageFailed, setImageFailed] =
    useState(false);
  const unavailable =
    t("common.unavailable");
  const isArabic =
    i18n.language.startsWith("ar");
  const locale = isArabic
    ? "ar-SA"
    : "en-US";
  const data = state.data;
  const land = data?.land_context;
  const quality = data?.quality;
  const rawDate =
    data?.imagery?.acquisition_date;
  const acquisitionDate = (() => {
    if (!rawDate) {
      return unavailable;
    }

    const date = new Date(rawDate);

    return Number.isNaN(
      date.getTime(),
    )
      ? unavailable
      : new Intl.DateTimeFormat(
          locale,
          {
            calendar: "gregory",
            dateStyle: "medium",
          },
        ).format(date);
  })();
  const displayNumber = (
    value,
    digits = 1,
  ) => formatNumber(
    value,
    i18n.language,
    unavailable,
    digits,
  );

  return (
    <article
      className={
        "comparison-satellite-card "
        + `comparison-satellite-card--${slot}`
      }
    >
      <div className="comparison-insight-heading">
        <span
          className={
            `location-chip location-chip--${slot}`
          }
        >
          {slot.toUpperCase()}
        </span>

        <div>
          <h3>
            {t(
              "compare.satelliteLocationTitle",
              {
                location:
                  slot.toUpperCase(),
              },
            )}
          </h3>

          {data?.is_demo ? (
            <DemoBadge t={t} />
          ) : (
            state.status === "available"
            && (
              <span className="live-badge">
                {t("compare.liveBadge")}
              </span>
            )
          )}
        </div>
      </div>

      {state.status === "loading" && (
        <div
          className="comparison-insight-status"
          role="status"
        >
          <span className="loading-dot" />
          {t("compare.satelliteLoading")}
        </div>
      )}

      {state.status === "error" && (
        <div
          className="comparison-insight-status"
          role="alert"
        >
          <p>
            {state.error
            || t(
              "compare.satelliteUnavailable",
            )}
          </p>
          <button
            type="button"
            onClick={onRetry}
          >
            {t("compare.satelliteRetry")}
          </button>
        </div>
      )}

      {(
        state.status === "available"
        || state.status === "demo"
      ) && data && (
        <>
          <div className="comparison-satellite-preview">
            {data.preview_src
              && !imageFailed ? (
                <img
                  src={data.preview_src}
                  alt={t(
                    "compare.satelliteImageAlt",
                    {
                      location:
                        slot.toUpperCase(),
                    },
                  )}
                  onError={() =>
                    setImageFailed(true)
                  }
                />
              ) : (
                <div>
                  {t(
                    "satellite.imageUnavailable",
                  )}
                </div>
              )}
          </div>

          <div className="comparison-land-list">
            {LAND_ROWS.map((row) => (
              <div key={row.key}>
                <span>
                  {t(
                    `satellite.${row.key}`,
                  )}
                </span>
                <strong>
                  {displayNumber(
                    land?.[row.dataKey],
                    1,
                  )}
                  {t("common.percent")}
                </strong>
              </div>
            ))}
          </div>

          <dl className="comparison-satellite-meta">
            <div>
              <dt>
                {t(
                  "satellite.acquisitionDate",
                )}
              </dt>
              <dd>{acquisitionDate}</dd>
            </div>
            <div>
              <dt>
                {t("satellite.confidence")}
              </dt>
              <dd>
                {quality
                  ?.analysis_confidence
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
                  : unavailable}
              </dd>
            </div>
          </dl>
        </>
      )}
    </article>
  );
}


export default function ComparisonInsights({
  resultA,
  resultB,
  t,
  i18n,
}) {
  const [satellites, setSatellites] =
    useState(emptySatelliteState);
  const [satelliteVersion,
    setSatelliteVersion] = useState(0);
  const [assistantVersion,
    setAssistantVersion] = useState(0);
  const [assistant, setAssistant] =
    useState({
      status: "loading",
      answer: "",
      error: "",
      source: "",
    });
  const language =
    i18n.language.startsWith("ar")
      ? "ar"
      : "en";


  useEffect(() => {
    const controller =
      new AbortController();

    async function loadSlot(
      slot,
      result,
    ) {
      const point =
        result?.requested_point;
      const radius = (
        result?.spatial_analysis
          ?.radius_meters
        ?? point?.radius_meters
      );

      try {
        const context =
          await getSatelliteContext({
            latitude: point?.latitude,
            longitude: point?.longitude,
            radiusMeters: radius,
            signal: controller.signal,
          });

        if (controller.signal.aborted) {
          return;
        }

        const isAvailable = [
          "available",
          "demo",
        ].includes(context.status);
        const data = isAvailable
          ? {
              ...context,
              preview_src:
                getApiAssetUrl(
                  context.imagery
                    ?.preview_url,
                ),
            }
          : context;

        setSatellites(
          (current) => ({
            ...current,
            [slot]: {
              status: isAvailable
                ? context.status
                : "error",
              data,
              error: isAvailable
                ? ""
                : t(
                    "compare.satelliteUnavailable",
                  ),
            },
          }),
        );
      } catch {
        if (!controller.signal.aborted) {
          setSatellites(
            (current) => ({
              ...current,
              [slot]: {
                status: "error",
                data: null,
                error: t(
                  "compare.satelliteUnavailable",
                ),
              },
            }),
          );
        }
      }
    }

    Promise.allSettled([
      loadSlot("a", resultA),
      loadSlot("b", resultB),
    ]);

    return () => controller.abort();
  }, [
    resultA,
    resultB,
    satelliteVersion,
    t,
  ]);


  useEffect(() => {
    if (
      satellites.a.status
        === "loading"
      || satellites.b.status
        === "loading"
    ) {
      return undefined;
    }

    const controller =
      new AbortController();

    explainComparison({
      language,
      locationA:
        buildAssistantLocation(
          resultA,
          satellites.a.data,
          t,
          language === "ar",
        ),
      locationB:
        buildAssistantLocation(
          resultB,
          satellites.b.data,
          t,
          language === "ar",
        ),
      signal: controller.signal,
    })
      .then((response) => {
        if (!controller.signal.aborted) {
          setAssistant({
            status: "available",
            answer: response.answer,
            error: "",
            source: response.source,
          });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setAssistant({
            status: "error",
            answer: "",
            error: t(
              "compare.assistantError",
            ),
            source: "",
          });
        }
      });

    return () => controller.abort();
  }, [
    assistantVersion,
    language,
    resultA,
    resultB,
    satellites,
    t,
  ]);


  function retrySatellite() {
    setSatellites(
      emptySatelliteState(),
    );
    setAssistant({
      status: "loading",
      answer: "",
      error: "",
      source: "",
    });
    setSatelliteVersion(
      (version) => version + 1,
    );
  }


  return (
    <section
      className="comparison-insights"
      aria-labelledby="comparison-insights-title"
    >
      <div className="comparison-insights-title">
        <div className="comparison-insights-copy">
          <span className="eyebrow">
            {t("compare.contextEyebrow")}
          </span>
          <h2 id="comparison-insights-title">
            {t("compare.contextTitle")}
          </h2>
          <p>
            {t("compare.contextDescription")}
          </p>
        </div>

        <ComparisonPDFReport
          resultA={resultA}
          resultB={resultB}
          satellites={satellites}
          assistant={assistant}
          t={t}
          i18n={i18n}
        />
      </div>

      <div className="comparison-satellite-grid">
        <SatelliteComparisonCard
          slot="a"
          state={satellites.a}
          t={t}
          i18n={i18n}
          onRetry={retrySatellite}
        />
        <SatelliteComparisonCard
          slot="b"
          state={satellites.b}
          t={t}
          i18n={i18n}
          onRetry={retrySatellite}
        />
      </div>

      <article className="comparison-assistant-card">
        <div className="comparison-assistant-heading">
          <div>
            <span>
              {t(
                "compare.assistantKicker",
              )}
            </span>
            <h2>
              {t(
                "compare.assistantTitle",
              )}
            </h2>
          </div>
          <span aria-hidden="true">AI</span>
        </div>

        {(
          resultA?.is_demo
          || resultB?.is_demo
        ) && (
          <div className="comparison-demo-notice">
            <DemoBadge t={t} />
            <span>
              {t(
                "compare.assistantDemoNotice",
              )}
            </span>
          </div>
        )}

        {(
          assistant.status === "waiting"
          || assistant.status === "loading"
        ) && (
          <div
            className="comparison-insight-status"
            role="status"
          >
            <span className="loading-dot" />
            {t(
              "compare.assistantLoading",
            )}
          </div>
        )}

        {assistant.status === "error" && (
          <div
            className="comparison-insight-status"
            role="alert"
          >
            <p>{assistant.error}</p>
            <button
              type="button"
              onClick={() => {
                setAssistant({
                  status: "loading",
                  answer: "",
                  error: "",
                  source: "",
                });
                setAssistantVersion(
                  (version) =>
                    version + 1,
                );
              }}
            >
              {t(
                "compare.assistantRetry",
              )}
            </button>
          </div>
        )}

        {assistant.status
          === "available" && (
          <div className="comparison-assistant-answer">
            <p>{assistant.answer}</p>
            <small>
              {t(
                assistant.source === "ollama"
                  ? "assistant.aiSource"
                  : "assistant.localSource",
              )}
            </small>
          </div>
        )}

        <p className="comparison-assistant-disclaimer">
          {t(
            "compare.assistantDisclaimer",
          )}
        </p>
      </article>
    </section>
  );
}
