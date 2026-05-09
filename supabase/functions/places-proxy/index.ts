// Places API (New) v1 proxy for the Vice mobile app.
//
// The mobile client never sees the Google Places API key. It calls this
// edge function with location + query, the function fans out to Google,
// normalizes the response, and returns Place[] shaped for the client.
//
// Supports two actions:
//   { action: "nearby",  lat, lng, radius, query?, placeTypes?, openNow? }
//   { action: "details", placeId }

const GOOGLE_PLACES_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY") ?? "";

const NEARBY_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.rating",
  "places.priceLevel",
  "places.currentOpeningHours.openNow",
  "places.photos",
  "places.types",
].join(",");

const DETAILS_FIELD_MASK = [
  "id",
  "displayName",
  "formattedAddress",
  "location",
  "rating",
  "priceLevel",
  "currentOpeningHours",
  "regularOpeningHours.weekdayDescriptions",
  "websiteUri",
  "internationalPhoneNumber",
  "photos",
  "types",
].join(",");

// In-memory per-IP rate limit. Edge functions reuse instances per region for a
// short time, so this catches casual abuse but is not a hard guarantee.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_REQUESTS = 30;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function rateLimit(ip: string): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const bucket = rateBuckets.get(ip);
  if (!bucket || bucket.resetAt < now) {
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { ok: true, retryAfter: 0 };
  }
  bucket.count++;
  if (bucket.count > RATE_MAX_REQUESTS) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfter: 0 };
}

interface GooglePlace {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  rating?: number;
  priceLevel?: string; // "PRICE_LEVEL_FREE" | "PRICE_LEVEL_INEXPENSIVE" | ...
  currentOpeningHours?: { openNow?: boolean };
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  photos?: { name: string }[];
  types?: string[];
  websiteUri?: string;
  internationalPhoneNumber?: string;
}

const PRICE_LEVEL_MAP: Record<string, number> = {
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

function normalizePlace(p: GooglePlace) {
  return {
    placeId: p.id,
    name: p.displayName?.text ?? "",
    address: p.formattedAddress ?? "",
    lat: p.location?.latitude ?? 0,
    lng: p.location?.longitude ?? 0,
    isOpen: p.currentOpeningHours?.openNow ?? null,
    rating: p.rating ?? null,
    priceLevel:
      p.priceLevel != null ? PRICE_LEVEL_MAP[p.priceLevel] ?? null : null,
    photoRef: p.photos?.[0]?.name ?? null,
    types: p.types ?? [],
  };
}

function normalizeDetails(p: GooglePlace) {
  return {
    ...normalizePlace(p),
    websiteUri: p.websiteUri ?? null,
    phone: p.internationalPhoneNumber ?? null,
    weekdayDescriptions: p.regularOpeningHours?.weekdayDescriptions ?? [],
  };
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, ...extra, "content-type": "application/json" },
  });
}

async function handleNearby(body: {
  lat: number;
  lng: number;
  radius?: number;
  query?: string;
  placeTypes?: string[];
  openNow?: boolean;
  maxResults?: number;
}) {
  const { lat, lng } = body;
  const radius = Math.min(Math.max(body.radius ?? 1600, 100), 50_000);
  const maxResultCount = Math.min(Math.max(body.maxResults ?? 20, 1), 20);

  // The New API exposes two surfaces: searchNearby (type-driven) and
  // searchText (free-text). When `query` is present we prefer searchText —
  // it returns the most relevant results for "boba tea" / "smoke shop"
  // style queries that don't map cleanly to a single place type.
  let url: string;
  let payload: Record<string, unknown>;

  if (body.query && body.query.trim().length > 0) {
    url = "https://places.googleapis.com/v1/places:searchText";
    payload = {
      textQuery: body.query,
      maxResultCount,
      locationBias: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius,
        },
      },
      ...(body.openNow ? { openNow: true } : {}),
    };
  } else {
    url = "https://places.googleapis.com/v1/places:searchNearby";
    payload = {
      maxResultCount,
      locationRestriction: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius,
        },
      },
      ...(body.placeTypes && body.placeTypes.length > 0
        ? { includedTypes: body.placeTypes }
        : {}),
    };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-Goog-Api-Key": GOOGLE_PLACES_KEY,
      "X-Goog-FieldMask": NEARBY_FIELD_MASK,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    return json(
      { error: "places_upstream_error", status: res.status, detail: text },
      502,
    );
  }

  const data = (await res.json()) as { places?: GooglePlace[] };
  const places = (data.places ?? []).map(normalizePlace);
  return json({ places });
}

async function handleDetails(body: { placeId: string }) {
  if (!body.placeId) return json({ error: "missing_placeId" }, 400);

  const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(body.placeId)}`;
  const res = await fetch(url, {
    headers: {
      "X-Goog-Api-Key": GOOGLE_PLACES_KEY,
      "X-Goog-FieldMask": DETAILS_FIELD_MASK,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    return json(
      { error: "places_upstream_error", status: res.status, detail: text },
      502,
    );
  }

  const data = (await res.json()) as GooglePlace;
  return json({ place: normalizeDetails(data) });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }
  if (!GOOGLE_PLACES_KEY) {
    return json({ error: "missing_api_key" }, 500);
  }

  const ip =
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";

  const limit = rateLimit(ip);
  if (!limit.ok) {
    return json(
      { error: "rate_limited", retryAfter: limit.retryAfter },
      429,
      { "retry-after": String(limit.retryAfter) },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const action = body.action ?? "nearby";

  try {
    if (action === "nearby") {
      if (typeof body.lat !== "number" || typeof body.lng !== "number") {
        return json({ error: "lat_lng_required" }, 400);
      }
      // deno-lint-ignore no-explicit-any
      return await handleNearby(body as any);
    }
    if (action === "details") {
      // deno-lint-ignore no-explicit-any
      return await handleDetails(body as any);
    }
    return json({ error: "unknown_action" }, 400);
  } catch (err) {
    return json({ error: "internal_error", detail: String(err) }, 500);
  }
});
