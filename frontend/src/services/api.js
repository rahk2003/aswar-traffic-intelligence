const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL
  || "http://127.0.0.1:8000";


export class ApiError extends Error {
  constructor(
    message,
    status = 0,
    code = "API_ERROR",
  ) {
    super(message);

    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}


async function request(
  path,
  options = {},
  timeoutMilliseconds = 90000,
) {
  const controller = new AbortController();

  const timeoutId = window.setTimeout(
    () => controller.abort(),
    timeoutMilliseconds,
  );

  try {
    const response = await fetch(
      `${API_BASE_URL}${path}`,
      {
        ...options,
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...options.headers,
        },
      },
    );

    const contentType =
      response.headers.get("content-type") || "";

    const data = contentType.includes(
      "application/json",
    )
      ? await response.json()
      : null;

    if (!response.ok) {
      throw new ApiError(
        data?.detail
        || "The request could not be completed.",
        response.status,
        "HTTP_ERROR",
      );
    }

    return data;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new ApiError(
        "Request timed out.",
        0,
        "TIMEOUT",
      );
    }

    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      "Could not connect to the backend.",
      0,
      "NETWORK_ERROR",
    );
  } finally {
    window.clearTimeout(timeoutId);
  }
}


export function analyzePoint({
  latitude,
  longitude,
  radiusMeters,
}) {
  return request(
    "/api/locations/analyze-point",
    {
      method: "POST",
      body: JSON.stringify({
        latitude,
        longitude,
        radius_meters: radiusMeters,
      }),
    },
  );
}


export async function getLocations() {
  const data = await request(
    "/api/locations/ranking",
  );

  return [
    ...(data.ranked_locations || []),
    ...(data.context_only_locations || []),
  ];
}


export function compareLocations(
  locationAId,
  locationBId,
) {
  return request(
    "/api/locations/compare",
    {
      method: "POST",
      body: JSON.stringify({
        location_a_id: Number(locationAId),
        location_b_id: Number(locationBId),
      }),
    },
  );
}


export function explainAnalysis({
  question,
  questionType,
  language,
  analysis,
}) {
  return request(
    "/api/assistant/explain",
    {
      method: "POST",
      body: JSON.stringify({
        question,
        question_type: questionType,
        language,
        analysis,
      }),
    },
    20000,
  );
}
