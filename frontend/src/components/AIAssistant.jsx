import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  explainAnalysis,
} from "../services/api";
import {
  getRoadName,
  getTrafficFactorData,
  getTrafficLevelCode,
} from "../utils/analysis";


const SUGGESTED_QUESTIONS = [
  "why_score",
  "strongest_factor",
  "weakest_factor",
  "suitability",
  "satellite_context",
  "improve",
];


function buildAssistantAnalysis(
  result,
  t,
  isArabic,
  satelliteContext,
) {
  const point = result?.requested_point;
  const spatial = result?.spatial_analysis;
  const traffic = result?.live_traffic;
  const score = result?.traffic_score;
  const levelCode =
    getTrafficLevelCode(score);

  return {
    data_mode:
      result?.data_mode
      ?? (
        result?.is_demo
          ? "demo"
          : "live"
      ),
    is_demo: Boolean(
      result?.is_demo
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
      spatial?.road_density_km_per_km2
      ?? null,
    intersection_count:
      spatial?.intersection_count
      ?? null,
    nearby_services_count:
      spatial?.nearby_services_count
      ?? null,
    nearest_road_type:
      spatial?.nearest_road_type
      ?? null,
    nearest_road_name:
      getRoadName(spatial, isArabic)
      ?? null,
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
        score?.historical_volume_available,
      ),
    factors: getTrafficFactorData(
      score,
    ).map((factor) => ({
      key: factor.key,
      score: factor.score,
      weight: factor.weight,
    })),
    satellite_context: (
      (
        satelliteContext?.status
        === "available"
        || satelliteContext?.status
        === "demo"
      )
    )
      ? {
          acquisition_date:
            satelliteContext.imagery
              ?.acquisition_date
            ?? null,
          cloud_cover_percentage:
            satelliteContext.imagery
              ?.cloud_cover_percentage
            ?? null,
          built_percentage:
            satelliteContext.land_context
              ?.built_percentage
            ?? null,
          bare_percentage:
            satelliteContext.land_context
              ?.bare_percentage
            ?? null,
          vegetation_percentage:
            satelliteContext.land_context
              ?.vegetation_percentage
            ?? null,
          water_percentage:
            satelliteContext.land_context
              ?.water_percentage
            ?? null,
          other_percentage:
            satelliteContext.land_context
              ?.other_percentage
            ?? null,
          probability_sum_percentage:
            satelliteContext.land_context
              ?.probability_sum_percentage
            ?? null,
          mean_top_probability_percentage:
            satelliteContext.quality
              ?.mean_top_probability_percentage
            ?? null,
          mean_ndvi:
            satelliteContext
              .spectral_indices
              ?.mean_ndvi
            ?? null,
          mean_ndbi:
            satelliteContext
              .spectral_indices
              ?.mean_ndbi
            ?? null,
          mean_bsi:
            satelliteContext
              .spectral_indices
              ?.mean_bsi
            ?? null,
          analysis_confidence:
            satelliteContext.quality
              ?.analysis_confidence
            ?? null,
          is_estimated: true,
        }
      : null,
  };
}


export default function AIAssistant({
  result,
  satelliteContext,
  t,
  i18n,
  onAnswerChange,
}) {
  const [question, setQuestion] =
    useState("");
  const [exchange, setExchange] =
    useState(null);
  const [lastRequest, setLastRequest] =
    useState(null);
  const [isLoading, setIsLoading] =
    useState(false);
  const [errorMessage, setErrorMessage] =
    useState("");
  const automaticRequestRef =
    useRef("");
  const language =
    i18n.language.startsWith("ar")
      ? "ar"
      : "en";


  const askAssistant = useCallback(
    async (requestData) => {
      if (
        isLoading
        || !requestData.question.trim()
      ) {
        return;
      }

      setIsLoading(true);
      setErrorMessage("");
      setLastRequest(requestData);

      try {
        const response =
          await explainAnalysis({
            ...requestData,
            language,
            analysis:
              buildAssistantAnalysis(
                result,
                t,
                language === "ar",
                satelliteContext,
              ),
          });

        const nextExchange = {
          question: requestData.question,
          answer: response.answer,
          source: response.source,
          fallbackUsed:
            response.fallback_used,
        };

        setExchange(nextExchange);
        onAnswerChange?.({
          language,
          text: response.answer,
        });
      } catch {
        setErrorMessage(
          t("assistant.error"),
        );
      } finally {
        setIsLoading(false);
      }
    },
    [
      isLoading,
      language,
      onAnswerChange,
      result,
      satelliteContext,
      t,
    ],
  );


  useEffect(() => {
    if (
      !result?.is_demo
      || satelliteContext?.status !== "demo"
    ) {
      return;
    }

    const point = result?.requested_point;
    const requestKey = [
      point?.latitude,
      point?.longitude,
      point?.radius_meters,
      language,
    ].join(":");

    if (
      automaticRequestRef.current
      === requestKey
    ) {
      return;
    }

    automaticRequestRef.current =
      requestKey;
    askAssistant({
      question: t(
        "assistant.questions.why_score",
      ),
      questionType: "why_score",
    });
  }, [
    askAssistant,
    language,
    result,
    satelliteContext?.status,
    t,
  ]);


  function handleSuggestion(
    questionType,
  ) {
    const suggestedQuestion = t(
      `assistant.questions.${questionType}`,
    );

    setQuestion("");
    askAssistant({
      question: suggestedQuestion,
      questionType,
    });
  }


  function handleSubmit(event) {
    event.preventDefault();
    const trimmedQuestion =
      question.trim();

    if (!trimmedQuestion) {
      return;
    }

    askAssistant({
      question: trimmedQuestion,
      questionType: "custom",
    });
  }


  return (
    <article
      id="ai-assistant"
      className="assistant-card"
      aria-labelledby="assistant-title"
    >
      <div className="assistant-heading">
        <div>
          <span className="dashboard-card-kicker">
            {t("assistant.kicker")}
          </span>
          <h3 id="assistant-title">
            {t("assistant.title")}
          </h3>
        </div>

        <span
          className="assistant-icon"
          aria-hidden="true"
        >
          AI
        </span>
      </div>

      {result?.is_demo && (
        <div
          className="assistant-demo-notice"
          role="note"
        >
          <span className="demo-badge">
            {t("system.demoBadge")}
          </span>
          <span>{t("assistant.demoNotice")}</span>
        </div>
      )}

      <p className="assistant-description">
        {t("assistant.description")}
      </p>

      <div
        className="assistant-suggestions"
        aria-label={
          t("assistant.suggestionsLabel")
        }
      >
        {SUGGESTED_QUESTIONS.map(
          (questionType) => (
            <button
              type="button"
              key={questionType}
              onClick={() =>
                handleSuggestion(
                  questionType,
                )
              }
              disabled={isLoading}
            >
              {t(
                `assistant.questions.${questionType}`,
              )}
            </button>
          ),
        )}
      </div>

      {isLoading && (
        <div
          className="assistant-loading"
          role="status"
        >
          <span aria-hidden="true" />
          {t("assistant.loading")}
        </div>
      )}

      {!isLoading && exchange && (
        <div className="assistant-exchange">
          <div>
            <span>{t("assistant.yourQuestion")}</span>
            <p>{exchange.question}</p>
          </div>

          <div className="assistant-answer">
            <span>{t("assistant.answerLabel")}</span>
            <p>{exchange.answer}</p>
            <small>
              {exchange.source === "ollama"
                ? t("assistant.aiSource")
                : t(
                    "assistant.localSource",
                  )}
            </small>
          </div>
        </div>
      )}

      {errorMessage && (
        <div
          className="assistant-error"
          role="alert"
        >
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() =>
              lastRequest
                && askAssistant(lastRequest)
            }
            disabled={
              isLoading || !lastRequest
            }
          >
            {t("assistant.retry")}
          </button>
        </div>
      )}

      <form
        className="assistant-form"
        onSubmit={handleSubmit}
      >
        <label htmlFor="assistant-question">
          {t("assistant.customLabel")}
        </label>

        <div>
          <textarea
            id="assistant-question"
            value={question}
            onChange={(event) =>
              setQuestion(
                event.target.value,
              )
            }
            placeholder={
              t("assistant.placeholder")
            }
            maxLength={500}
            rows={2}
            disabled={isLoading}
          />

          <button
            type="submit"
            className={
              "button button-primary "
              + "assistant-send"
            }
            disabled={
              isLoading
              || !question.trim()
            }
          >
            {t("assistant.send")}
          </button>
        </div>
      </form>

      <p className="assistant-disclaimer">
        {t("assistant.disclaimer")}
      </p>
    </article>
  );
}
