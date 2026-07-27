export const ANALYSIS_RADIUS_OPTIONS = [
  250,
  500,
  750,
  1000,
  2000,
];

const TRAFFIC_ACTIVITY_PATTERN = [
  {
    timeKey: "sixAm",
    multiplier: 0.62,
    congestionInfluence: 0.04,
  },
  {
    timeKey: "nineAm",
    multiplier: 0.94,
    congestionInfluence: 0.1,
  },
  {
    timeKey: "noon",
    multiplier: 0.72,
    congestionInfluence: 0.05,
  },
  {
    timeKey: "threePm",
    multiplier: 0.79,
    congestionInfluence: 0.06,
  },
  {
    timeKey: "sixPm",
    multiplier: 1,
    congestionInfluence: 0.12,
  },
  {
    timeKey: "ninePm",
    multiplier: 0.69,
    congestionInfluence: 0.05,
  },
];

const TRAFFIC_FACTOR_SPECS = [
  {
    key: "roadType",
    scoreKey: "road_type_score",
    weightKey: "road_type",
  },
  {
    key: "roadDensity",
    scoreKey: "road_density_score",
    weightKey: "road_density",
  },
  {
    key: "intersections",
    scoreKey: "intersection_score",
    weightKey: "intersections",
  },
  {
    key: "services",
    scoreKey: "services_score",
    weightKey: "services",
  },
  {
    key: "liveTraffic",
    scoreKey: "live_traffic_score",
    weightKey: "live_traffic",
  },
  {
    key: "historicalVolume",
    scoreKey: "historical_volume_score",
    weightKey: "historical_volume",
  },
];


export function hasValue(value) {
  return value !== null
    && value !== undefined
    && value !== "";
}


function clampScore(value) {
  return Math.max(
    0,
    Math.min(value, 100),
  );
}


function toFiniteNumber(value) {
  if (!hasValue(value)) {
    return null;
  }

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue)
    ? parsedValue
    : null;
}


export function buildEstimatedTrafficActivity(
  trafficScore,
  congestionIndex,
) {
  const parsedScore =
    toFiniteNumber(trafficScore);
  const parsedCongestion =
    toFiniteNumber(congestionIndex);
  const congestionScore =
    parsedCongestion === null
      ? null
      : clampScore(parsedCongestion * 100);

  if (
    parsedScore === null
    && congestionScore === null
  ) {
    return [];
  }

  const normalizedScore =
    parsedScore === null
      ? congestionScore
      : clampScore(parsedScore);
  const baseline =
    congestionScore === null
      ? normalizedScore
      : (
          normalizedScore * 0.76
          + congestionScore * 0.24
        );

  return TRAFFIC_ACTIVITY_PATTERN.map(
    ({
      timeKey,
      multiplier,
      congestionInfluence,
    }) => ({
      timeKey,
      activity: Math.round(
        clampScore(
          baseline * multiplier
          + (
            congestionScore === null
              ? 0
              : congestionScore
                * congestionInfluence
          ),
        ),
      ),
    }),
  );
}


export function getTrafficFactorData(
  score,
) {
  if (!score) {
    return [];
  }

  return TRAFFIC_FACTOR_SPECS
    .map((factor) => {
      const factorScore = toFiniteNumber(
        score[factor.scoreKey],
      );
      const rawWeight = toFiniteNumber(
        score.weights_used?.[
          factor.weightKey
        ],
      );

      if (factorScore === null) {
        return null;
      }

      return {
        key: factor.key,
        score: clampScore(factorScore),
        weight:
          rawWeight === null
            ? null
            : clampScore(rawWeight * 100),
      };
    })
    .filter(Boolean);
}


export function getSuitabilityCode(
  trafficScore,
) {
  const score = toFiniteNumber(
    trafficScore,
  );

  if (score === null) {
    return "unavailable";
  }

  if (score >= 80) {
    return "strong";
  }

  if (score >= 60) {
    return "promising";
  }

  if (score >= 40) {
    return "balanced";
  }

  return "limited";
}


export function formatNumber(
  value,
  language,
  unavailable,
  maximumFractionDigits = 0,
) {
  const numericValue = Number(value);

  if (
    !hasValue(value)
    || !Number.isFinite(numericValue)
  ) {
    return unavailable;
  }

  return new Intl.NumberFormat(
    language.startsWith("ar")
      ? "ar-SA"
      : "en-US",
    {
      maximumFractionDigits,
    },
  ).format(numericValue);
}


export function formatCoordinate(value) {
  const numericValue = Number(value);

  if (
    !hasValue(value)
    || !Number.isFinite(numericValue)
  ) {
    return "—";
  }

  return numericValue.toFixed(6);
}


export function getErrorMessage(error, t) {
  if (error?.code === "NETWORK_ERROR") {
    return t(
      "errors.backendUnavailable",
    );
  }

  if (error?.code === "TIMEOUT") {
    return t("errors.timeout");
  }

  if (error?.code === "HTTP_ERROR") {
    return (
      error?.status === 503
        ? (
            error?.message
            || t(
              "errors.serviceUnavailable",
            )
          )
        : t("errors.general")
    );
  }

  return error?.message || t("errors.general");
}


export function getTrafficLevelCode(score) {
  return score?.traffic_level_code
    || score?.traffic_level
      ?.toLowerCase()
      .replaceAll(" ", "_")
    || "unknown";
}


export function getRoadName(
  spatial,
  isArabic,
) {
  if (!spatial) {
    return null;
  }

  if (isArabic) {
    return spatial.nearest_road_name_ar
      || spatial.nearest_road_name
      || spatial.nearest_road_name_en;
  }

  return spatial.nearest_road_name_en
    || spatial.nearest_road_name
    || spatial.nearest_road_name_ar;
}


export function getRoadTypeLabel(
  roadType,
  t,
) {
  if (!roadType) {
    return t("common.unavailable");
  }

  return t(
    `roadTypes.${roadType}`,
    {
      defaultValue: roadType
        .replaceAll("_", " ")
        .replace(
          /\b\w/g,
          (letter) => letter.toUpperCase(),
        ),
    },
  );
}


export function getDominantSatelliteClass(
  satelliteContext,
) {
  if (
    ![
      "available",
      "demo",
    ].includes(
      satelliteContext?.status,
    )
  ) {
    return null;
  }

  const land =
    satelliteContext.land_context;
  const candidates = [
    {
      key: "builtUp",
      value:
        land
          ?.built_percentage,
    },
    {
      key: "bareSoil",
      value:
        land
          ?.bare_percentage,
    },
    {
      key: "vegetation",
      value:
        land
          ?.vegetation_percentage,
    },
    {
      key: "water",
      value:
        land?.water_percentage,
    },
    {
      key: "other",
      value:
        land?.other_percentage,
    },
  ].filter(
    (candidate) =>
      hasValue(candidate.value)
      && Number.isFinite(
        Number(candidate.value),
      ),
  );

  if (candidates.length === 0) {
    return null;
  }

  const dominant = candidates.reduce(
    (highest, candidate) => (
      Number(candidate.value)
      > Number(highest.value)
        ? candidate
        : highest
      ),
  );
  return dominant.key;
}


export function mergeServiceCategories(spatial) {
  const merged = new Map();

  [
    spatial?.amenity_types,
    spatial?.shop_types,
    spatial?.tourism_types,
  ].forEach((collection) => {
    Object.entries(collection || {})
      .forEach(([category, rawCount]) => {
        const count = Number(rawCount);

        if (
          !category
          || !Number.isFinite(count)
          || count <= 0
        ) {
          return;
        }

        merged.set(
          category,
          (merged.get(category) || 0)
          + count,
        );
      });
  });

  return [...merged.entries()]
    .map(([category, count]) => ({
      category,
      count,
    }))
    .sort(
      (first, second) =>
        second.count - first.count
        || first.category.localeCompare(
          second.category,
        ),
    );
}


export function getServiceLabel(
  category,
  t,
) {
  const fallback = category
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (letter) => letter.toUpperCase(),
    );

  return t(
    `services.categories.${category}`,
    {
      defaultValue: fallback,
    },
  );
}


const SERVICE_ICONS = {
  restaurant: "🍽️",
  cafe: "☕",
  fast_food: "🍔",
  pharmacy: "💊",
  hospital: "🏥",
  clinic: "🩺",
  doctors: "🩺",
  dentist: "🦷",
  school: "🏫",
  kindergarten: "🧸",
  college: "🎓",
  university: "🎓",
  mosque: "🕌",
  place_of_worship: "🕌",
  bank: "🏦",
  atm: "🏧",
  fuel: "⛽",
  parking: "🅿️",
  parking_space: "🅿️",
  marketplace: "🛍️",
  supermarket: "🛒",
  convenience: "🛒",
  bakery: "🥐",
  mall: "🛍️",
  clothes: "👕",
  hotel: "🛏️",
  guest_house: "🛏️",
  attraction: "⭐",
  cinema: "🎬",
  theatre: "🎭",
  travel_agency: "✈️",
  car_repair: "🔧",
  car_wash: "🚗",
  childcare: "🧸",
  dry_cleaning: "🧺",
  laundry: "🧺",
  electronics: "🔌",
  mobile_phone: "📱",
  furniture: "🛋️",
  hardware: "🛠️",
  books: "📚",
  stationery: "✏️",
  beauty: "✨",
  hairdresser: "✂️",
  optician: "👓",
  veterinary: "🐾",
  post_office: "✉️",
  police: "🛡️",
  fire_station: "🚒",
  library: "📚",
  community_centre: "🏛️",
  fitness_centre: "🏋️",
  sports_centre: "⚽",
  swimming_pool: "🏊",
  playground: "🛝",
  bus_station: "🚌",
  taxi: "🚕",
  charging_station: "🔋",
  theme_park: "🎡",
  museum: "🏛️",
  viewpoint: "🔭",
};


export function getServiceIcon(category) {
  return SERVICE_ICONS[category] || "📍";
}
