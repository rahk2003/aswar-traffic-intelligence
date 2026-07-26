import {
  useEffect,
  useState,
} from "react";

import {
  getApiAssetUrl,
  getSatelliteContext,
} from "../services/api";
import {
  formatNumber,
  getDominantSatelliteClass,
  hasValue,
} from "../utils/analysis";


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

const LIMITATION_TRANSLATION_KEYS = {
  "Dynamic World probabilities are distributed across multiple land-cover classes, reducing classification confidence.":
    "distributedProbabilities",
  "Low Dynamic World valid-pixel coverage reduced classification confidence.":
    "lowValidPixels",
  "The nearest available Dynamic World result did not exactly match the Sentinel-2 preview date.":
    "differentDate",
  "Multiple Dynamic World quality factors reduced classification confidence.":
    "multipleFactors",
};

function formatAcquisitionDate(
  rawDate,
  locale,
  unavailable,
) {
  if (!rawDate) {
    return unavailable;
  }

  const parsedDate = new Date(rawDate);

  if (
    Number.isNaN(
      parsedDate.getTime(),
    )
  ) {
    return unavailable;
  }

  return new Intl.DateTimeFormat(
    locale,
    {
      calendar: "gregory",
      dateStyle: "medium",
    },
  ).format(parsedDate);
}


function SatelliteLoading({ t }) {
  return (
    <div
      className="satellite-loading"
      role="status"
    >
      <div
        className="satellite-skeleton-image"
        aria-hidden="true"
      />

      <div>
        <strong>{t("satellite.loading")}</strong>
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}


function SatelliteStatus({
  status,
  onRetry,
  t,
}) {
  const canRetry = (
    status === "no_imagery"
    || status === "temporarily_unavailable"
    || status === "error"
  );
  const translationKey = (
    status === "not_configured"
      ? "notConfigured"
      : status === "no_imagery"
        ? "noImagery"
        : "temporarilyUnavailable"
  );

  return (
    <div
      className={
        "satellite-status "
        + `satellite-status--${status}`
      }
      role={
        canRetry ? "alert" : "status"
      }
    >
      <span
        className="satellite-status-icon"
        aria-hidden="true"
      >
        ◉
      </span>

      <div>
        <strong>
          {t(
            `satellite.${translationKey}Title`,
          )}
        </strong>
        <p>
          {t(
            `satellite.${translationKey}`,
          )}
        </p>

        {canRetry && (
          <button
            type="button"
            onClick={onRetry}
          >
            {t("satellite.retry")}
          </button>
        )}
      </div>
    </div>
  );
}


export default function SatelliteContextCard({
  latitude,
  longitude,
  radiusMeters,
  onContextChange,
  t,
  i18n,
}) {
  const [requestVersion, setRequestVersion] =
    useState(0);
  const [satelliteContext,
    setSatelliteContext] = useState(null);
  const [requestStatus, setRequestStatus] =
    useState("loading");
  const [imageFailed, setImageFailed] =
    useState(false);
  const isArabic =
    i18n.language.startsWith("ar");
  const language =
    isArabic ? "ar-SA" : "en-US";
  const unavailable =
    t("common.unavailable");


  useEffect(() => {
    const controller =
      new AbortController();

    getSatelliteContext({
      latitude,
      longitude,
      radiusMeters,
      signal: controller.signal,
    })
      .then((result) => {
        if (controller.signal.aborted) {
          return;
        }

        setRequestStatus(result.status);

        if (
          result.status === "available"
        ) {
          const contextWithPreview = {
            ...result,
            preview_src:
              getApiAssetUrl(
                result.imagery?.preview_url,
              ),
          };

          setSatelliteContext(
            contextWithPreview,
          );
          onContextChange?.(
            contextWithPreview,
          );
          return;
        }

        setSatelliteContext(null);
        onContextChange?.(null);
      })
      .catch(() => {
        if (controller.signal.aborted) {
          return;
        }

        setRequestStatus("error");
        setSatelliteContext(null);
        onContextChange?.(null);
      });

    return () => {
      controller.abort();
    };
  }, [
    latitude,
    longitude,
    radiusMeters,
    requestVersion,
    onContextChange,
  ]);


  function retry() {
    setSatelliteContext(null);
    setRequestStatus("loading");
    setImageFailed(false);
    onContextChange?.(null);
    setRequestVersion(
      (version) => version + 1,
    );
  }


  const displayNumber = (
    value,
    digits = 1,
  ) => formatNumber(
    value,
    i18n.language,
    unavailable,
    digits,
  );
  const imagery =
    satelliteContext?.imagery;
  const land =
    satelliteContext?.land_context;
  const spectral =
    satelliteContext?.spectral_indices;
  const quality =
    satelliteContext?.quality;
  const source =
    satelliteContext?.source;
  const dominantClass =
    getDominantSatelliteClass(
      satelliteContext,
    );
  const summaryClass = dominantClass;
  const confidenceLimitations = (
    Array.isArray(quality?.limitations)
      ? quality.limitations
      : []
  ).map((limitation) => {
    const translationKey =
      LIMITATION_TRANSLATION_KEYS[
        limitation
      ];

    if (!translationKey) {
      return limitation;
    }

    return t(
      `satellite.limitations.${translationKey}`,
    );
  });
  const acquisitionDate =
    formatAcquisitionDate(
      imagery?.acquisition_date,
      language,
      unavailable,
    );

  return (
    <article
      className="satellite-card"
      aria-labelledby="satellite-title"
    >
      <div className="satellite-heading">
        <div>
          <span className="dashboard-card-kicker">
            Google Dynamic World
          </span>
          <h3 id="satellite-title">
            {t("satellite.title")}
          </h3>
          <p>{t("satellite.description")}</p>
        </div>

        <span
          className="satellite-heading-icon"
          aria-hidden="true"
        >
          ◉
        </span>
      </div>

      {requestStatus === "loading" && (
        <SatelliteLoading t={t} />
      )}

      {requestStatus !== "loading"
        && requestStatus !== "available"
        && (
          <SatelliteStatus
            status={requestStatus}
            onRetry={retry}
            t={t}
          />
        )}

      {(
        requestStatus === "available"
        && satelliteContext
      ) && (
        <>
          <div className="satellite-content-grid">
            <div className="satellite-preview-panel">
              <div className="satellite-preview">
                {(
                  satelliteContext.preview_src
                  && !imageFailed
                )
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
                        loading="lazy"
                        onError={() =>
                          setImageFailed(true)
                        }
                      />
                    )
                  : (
                      <div
                        className={
                          "satellite-image-unavailable"
                        }
                      >
                        {t(
                          "satellite.imageUnavailable",
                        )}
                      </div>
                    )}

                <span>
                  {t(
                    "satellite.trueColorWithResolution",
                    {
                      resolution:
                        displayNumber(
                          imagery
                            ?.resolution_meters,
                          0,
                        ),
                    },
                  )}
                </span>
              </div>

              <p className="satellite-preview-note">
                {t(
                  "satellite.previewResolutionNote",
                )}
              </p>
            </div>

            <div className="satellite-land-list">
              {LAND_ROWS.map((row) => {
                const value =
                  land?.[row.dataKey];

                if (!hasValue(value)) {
                  return null;
                }

                return (
                  <div
                    className={
                      "satellite-land-row "
                      + `satellite-land-row--${row.key}`
                    }
                    key={row.key}
                  >
                    <div>
                      <span
                        aria-hidden="true"
                      />
                      <strong>
                        {t(
                          `satellite.${row.key}`,
                        )}
                      </strong>
                      <b>
                        {displayNumber(
                          value,
                          1,
                        )}
                        {t("common.percent")}
                      </b>
                    </div>

                    <span className="satellite-progress">
                      <span
                        style={{
                          width:
                            `${Math.max(
                              0,
                              Math.min(
                                Number(value),
                                100,
                              ),
                            )}%`,
                        }}
                      />
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="satellite-metadata-grid">
            <div>
              <span>
                {t(
                  "satellite.acquisitionDate",
                )}
              </span>
              <strong>{acquisitionDate}</strong>
            </div>
            <div>
              <span>
                {t(
                  "satellite.classificationDate",
                )}
              </span>
              <strong>
                {formatAcquisitionDate(
                  quality
                    ?.classification_acquisition_date,
                  language,
                  unavailable,
                )}
              </strong>
            </div>
            <div>
              <span>
                {t("satellite.cloudCover")}
              </span>
              <strong>
                {hasValue(
                  imagery
                    ?.cloud_cover_percentage,
                )
                  ? (
                      displayNumber(
                        imagery
                          .cloud_cover_percentage,
                        2,
                      )
                      + t("common.percent")
                    )
                  : unavailable}
              </strong>
            </div>
            <div>
              <span>
                {t(
                  "satellite.meanTopProbability",
                )}
              </span>
              <strong>
                {hasValue(
                  quality
                    ?.mean_top_probability_percentage,
                )
                  ? (
                      displayNumber(
                        quality
                          .mean_top_probability_percentage,
                        1,
                      )
                      + t("common.percent")
                    )
                  : unavailable}
              </strong>
            </div>
            <div>
              <span>
                {t(
                  "satellite.probabilityTotal",
                )}
              </span>
              <strong>
                {hasValue(
                  land
                    ?.probability_sum_percentage,
                )
                  ? (
                      displayNumber(
                        land
                          .probability_sum_percentage,
                        1,
                      )
                      + t("common.percent")
                    )
                  : unavailable}
              </strong>
            </div>
            <div>
              <span>
                {t("satellite.resolution")}
              </span>
              <strong>
                {hasValue(
                  imagery
                    ?.resolution_meters,
                )
                  ? `${displayNumber(
                      imagery
                        .resolution_meters,
                      0,
                    )} ${
                      t("common.meters")
                    }`
                  : unavailable}
              </strong>
            </div>
            <div>
              <span>
                {t("satellite.confidence")}
              </span>
              <strong>
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
              </strong>
            </div>
            <div>
              <span>
                {t("satellite.validPixels")}
              </span>
              <strong>
                {hasValue(
                  land
                    ?.valid_pixel_percentage,
                )
                  ? (
                      displayNumber(
                        land
                          .valid_pixel_percentage,
                        1,
                      )
                      + t("common.percent")
                    )
                  : unavailable}
              </strong>
            </div>
          </div>

          <details className="satellite-indices">
            <summary>
              {t("satellite.indices")}
            </summary>
            <div>
              {[
                ["NDVI", spectral?.mean_ndvi],
                ["NDBI", spectral?.mean_ndbi],
                ["BSI", spectral?.mean_bsi],
              ].map(([label, value]) => (
                <span key={label}>
                  <small>{label}</small>
                  <strong>
                    {displayNumber(
                      value,
                      3,
                    )}
                  </strong>
                </span>
              ))}
            </div>
          </details>

          <div className="satellite-summary">
            <strong>
              {t("satellite.contextSummary")}
            </strong>
            <p>
              {summaryClass
                ? t(
                    `satellite.summaries.${summaryClass}`,
                  )
                : t(
                    "satellite.summaries.unavailable",
                  )}
            </p>
            {confidenceLimitations.length > 0 && (
              <div className="satellite-limitations">
                <strong>
                  {t(
                    "satellite.confidenceLimitations",
                  )}
                </strong>
                <ul>
                  {confidenceLimitations.map(
                    (limitation) => (
                      <li key={limitation}>
                        {limitation}
                      </li>
                    ),
                  )}
                </ul>
              </div>
            )}
            <p>
              {t(
                "satellite.aridEnvironmentWarning",
              )}
            </p>
          </div>

          <div className="satellite-source">
            <span>
              {t("satellite.source")}
            </span>
            <strong>
              {source?.provider
                || unavailable}
            </strong>
            <small>
              {source?.dataset
                || unavailable}
            </small>
            <small>
              {t("satellite.supportingSource")}:{" "}
              {source?.supporting_provider
                || unavailable}
              {" — "}
              {source?.supporting_dataset
                || unavailable}
            </small>
          </div>

          <p className="satellite-score-note">
            {t(
              "satellite.trafficScoreNote",
            )}
          </p>
        </>
      )}
    </article>
  );
}
