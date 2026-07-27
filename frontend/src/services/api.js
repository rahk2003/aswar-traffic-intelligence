export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL
  || "http://127.0.0.1:8000"
).replace(/\/+$/, "");


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
  const {
    signal: externalSignal,
    ...fetchOptions
  } = options;
  const abortFromExternal = () =>
    controller.abort();

  if (externalSignal?.aborted) {
    controller.abort();
  } else {
    externalSignal?.addEventListener(
      "abort",
      abortFromExternal,
      {
        once: true,
      },
    );
  }

  const timeoutId = window.setTimeout(
    () => controller.abort(),
    timeoutMilliseconds,
  );

  try {
    const response = await fetch(
      `${API_BASE_URL}${path}`,
      {
        ...fetchOptions,
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...fetchOptions.headers,
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
    externalSignal?.removeEventListener(
      "abort",
      abortFromExternal,
    );
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


export function getHealth({
  signal,
} = {}) {
  return request(
    "/api/health",
    {
      method: "GET",
      signal,
    },
    5000,
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


export function explainComparison({
  language,
  locationA,
  locationB,
  signal,
}) {
  return request(
    "/api/assistant/compare",
    {
      method: "POST",
      signal,
      body: JSON.stringify({
        language,
        location_a: locationA,
        location_b: locationB,
      }),
    },
    20000,
  );
}


export function getSatelliteContext({
  latitude,
  longitude,
  radiusMeters,
  signal,
}) {
  const query = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    radius_meters: String(radiusMeters),
  });

  return request(
    `/api/satellite/context?${query}`,
    {
      method: "GET",
      signal,
    },
    70000,
  );
}


export function getApiAssetUrl(path) {
  if (!path) {
    return "";
  }

  try {
    return new URL(
      path,
      `${API_BASE_URL}/`,
    ).toString();
  } catch {
    return "";
  }
}
