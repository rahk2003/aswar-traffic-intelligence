export const ANALYSIS_RADIUS_OPTIONS = [
  250,
  500,
  750,
  1000,
  2000,
];


export function hasValue(value) {
  return value !== null
    && value !== undefined
    && value !== "";
}


export function formatNumber(
  value,
  language,
  unavailable,
  maximumFractionDigits = 0,
) {
  if (!hasValue(value)) {
    return unavailable;
  }

  return new Intl.NumberFormat(
    language.startsWith("ar")
      ? "ar-SA"
      : "en-US",
    {
      maximumFractionDigits,
    },
  ).format(value);
}


export function formatCoordinate(value) {
  if (!hasValue(value)) {
    return "—";
  }

  return Number(value).toFixed(6);
}


export function getErrorMessage(error, t) {
  if (error?.code === "NETWORK_ERROR") {
    return t("errors.network");
  }

  if (error?.code === "TIMEOUT") {
    return t("errors.timeout");
  }

  if (error?.code === "HTTP_ERROR") {
    return t("errors.general");
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
