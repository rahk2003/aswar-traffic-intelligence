import { useState } from "react";
import {
  Circle,
  CircleMarker,
  Tooltip,
} from "react-leaflet";

import {
  getServiceIcon,
  getServiceLabel,
} from "../utils/analysis";


const ARABIC_INDIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const EASTERN_ARABIC_DIGITS = "۰۱۲۳۴۵۶۷۸۹";


function parseCoordinate(value) {
  const normalized = String(value)
    .trim()
    .replace(
      /[٠-٩]/g,
      (digit) =>
        ARABIC_INDIC_DIGITS.indexOf(digit),
    )
    .replace(
      /[۰-۹]/g,
      (digit) =>
        EASTERN_ARABIC_DIGITS.indexOf(digit),
    )
    .replaceAll("٫", ".")
    .replaceAll(",", ".");

  return Number(normalized);
}


export function CoordinateInput({
  point,
  onSubmit,
  disabled = false,
  compact = false,
  idPrefix = "location",
  t,
}) {
  const [latitude, setLatitude] = useState(
    point
      ? String(point.latitude)
      : "",
  );
  const [longitude, setLongitude] = useState(
    point
      ? String(point.longitude)
      : "",
  );
  const [error, setError] = useState("");

  function handleSubmit(event) {
    event.preventDefault();

    const parsedLatitude =
      parseCoordinate(latitude);
    const parsedLongitude =
      parseCoordinate(longitude);
    const isValid =
      latitude.trim() !== ""
      && longitude.trim() !== ""
      && Number.isFinite(parsedLatitude)
      && Number.isFinite(parsedLongitude)
      && parsedLatitude >= -90
      && parsedLatitude <= 90
      && parsedLongitude >= -180
      && parsedLongitude <= 180;

    if (!isValid) {
      setError(t("coordinates.invalid"));
      return;
    }

    setError("");
    onSubmit({
      latitude: parsedLatitude,
      longitude: parsedLongitude,
    });
  }

  return (
    <form
      className={
        "coordinate-entry"
        + (
          compact
            ? " coordinate-entry--compact"
            : ""
        )
      }
      onSubmit={handleSubmit}
      noValidate
    >
      <div className="coordinate-entry-heading">
        <strong>{t("coordinates.title")}</strong>
        {!compact && (
          <small>
            {t("coordinates.description")}
          </small>
        )}
      </div>

      <div className="coordinate-fields">
        <label htmlFor={`${idPrefix}-latitude`}>
          <span>{t("coordinates.latitude")}</span>
          <input
            id={`${idPrefix}-latitude`}
            type="text"
            inputMode="decimal"
            dir="ltr"
            value={latitude}
            placeholder="24.7136"
            disabled={disabled}
            aria-invalid={Boolean(error)}
            onChange={(event) => {
              setLatitude(event.target.value);
              setError("");
            }}
          />
        </label>

        <label htmlFor={`${idPrefix}-longitude`}>
          <span>{t("coordinates.longitude")}</span>
          <input
            id={`${idPrefix}-longitude`}
            type="text"
            inputMode="decimal"
            dir="ltr"
            value={longitude}
            placeholder="46.6753"
            disabled={disabled}
            aria-invalid={Boolean(error)}
            onChange={(event) => {
              setLongitude(event.target.value);
              setError("");
            }}
          />
        </label>
      </div>

      {error && (
        <p className="coordinate-error" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        className={
          "button button-secondary "
          + "coordinate-submit"
        }
        disabled={disabled}
      >
        {t("coordinates.useCoordinates")}
      </button>
    </form>
  );
}


export function LocationMarker({
  point,
  radius = 500,
  color = "#19c7b5",
  label,
}) {
  if (!point) {
    return null;
  }

  const center = [
    point.latitude,
    point.longitude,
  ];

  return (
    <>
      <Circle
        center={center}
        radius={radius}
        pathOptions={{
          color,
          fillColor: color,
          fillOpacity: 0.1,
          weight: 2,
        }}
      />

      <CircleMarker
        center={center}
        radius={label ? 15 : 9}
        pathOptions={{
          color: "#ffffff",
          fillColor: color,
          fillOpacity: 1,
          weight: 3,
        }}
      >
        {label && (
          <Tooltip
            permanent
            direction="center"
            className="location-letter-tooltip"
          >
            {label}
          </Tooltip>
        )}
      </CircleMarker>
    </>
  );
}


export function MetricCard({
  label,
  value,
  interactive = false,
  expanded = false,
  onToggle,
}) {
  if (interactive) {
    return (
      <button
        type="button"
        className={
          "result-metric result-metric--interactive"
          + (expanded ? " is-expanded" : "")
        }
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <span>{label}</span>

        <span className="result-metric-value">
          <strong>{value}</strong>

          <span
            className="result-metric-chevron"
            aria-hidden="true"
          >
            {expanded ? "−" : "+"}
          </span>
        </span>
      </button>
    );
  }

  return (
    <article className="result-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}


export function ScoreCard({
  label,
  value,
  suffix,
  level,
  progressValue,
  compact = false,
}) {
  const parsedProgress =
    Number(progressValue);
  const progress =
    Number.isFinite(parsedProgress)
      ? Math.max(
          0,
          Math.min(parsedProgress, 100),
        )
      : null;

  return (
    <div
      className={
        "score-result"
        + (compact ? " score-result--compact" : "")
      }
    >
      <div className="score-result-value">
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{suffix}</small>
      </div>

      <div className="score-result-context">
        <span className="traffic-level-badge">
          {level}
        </span>

        {progress !== null && (
          <div
            className="score-progress"
            role="progressbar"
            aria-label={label}
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow={progress}
          >
            <span
              style={{
                width: `${progress}%`,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}


export function ServicesBreakdown({
  categories,
  total,
  radius,
  t,
  formatCount,
}) {
  return (
    <section
      className="services-breakdown"
      aria-labelledby="services-breakdown-title"
    >
      <div className="services-breakdown-header">
        <div>
          <h4 id="services-breakdown-title">
            {t("services.title")}
          </h4>

          <p>
            {t(
              "services.summary",
              {
                count: formatCount(total),
                radius: formatCount(radius),
              },
            )}
          </p>
        </div>

        <span className="services-total">
          {formatCount(total)}
        </span>
      </div>

      {categories.length > 0 ? (
        <ul className="services-breakdown-list">
          {categories.map(
            ({ category, count }) => (
              <li key={category}>
                <span className="service-icon" aria-hidden="true">
                  {getServiceIcon(category)}
                </span>

                <span>
                  {getServiceLabel(category, t)}
                </span>

                <strong>
                  {formatCount(count)}
                </strong>
              </li>
            ),
          )}
        </ul>
      ) : (
        <p className="services-empty-message">
          {t("services.empty")}
        </p>
      )}
    </section>
  );
}


export function LoadingState({
  title,
  description,
  steps = [],
  compact = false,
}) {
  return (
    <div
      className={
        "analysis-loading"
        + (compact ? " analysis-loading--compact" : "")
      }
      role="status"
      aria-live="polite"
    >
      <div className="loading-spinner" aria-hidden="true" />
      <h2>{title}</h2>
      <p>{description}</p>

      {steps.length > 0 && (
        <div className="loading-steps">
          {steps.map((step) => (
            <span key={step}>{step}</span>
          ))}
        </div>
      )}
    </div>
  );
}


export function ErrorState({
  title,
  message,
  actionLabel,
  onAction,
}) {
  return (
    <div className="analysis-error" role="alert">
      <strong>{title}</strong>
      <p>{message}</p>

      {onAction && (
        <button
          type="button"
          className="text-button"
          onClick={onAction}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}


export function DataWarnings({
  warnings,
  t,
}) {
  if (
    !Array.isArray(warnings)
    || warnings.length === 0
  ) {
    return null;
  }

  return (
    <div
      className="analysis-warning"
      role="status"
    >
      <strong>{t("errors.partialTitle")}</strong>
      <ul>
        {warnings.map((warning) => (
          <li key={warning}>
            {t(
              `errors.${warning}`,
              {
                defaultValue: warning,
              },
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
