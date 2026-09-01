import type { ItineraryDay, ItineraryStop } from "./models/itinerary.js";

const HEADERS = { "User-Agent": "Tripora/1.0 (hobby trip planner)" };

let queue: Promise<void> = Promise.resolve();

function throttled(): Promise<void> {
  const slot = queue.then(
    () => new Promise<void>((resolve) => setTimeout(resolve, 1000)),
  );
  queue = slot;
  return slot;
}

async function fetchJson<T>(label: string, url: string): Promise<T | null> {
  await throttled();
  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) {
      console.error(`Places: ${label} failed (${res.status})`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.error(
      `Places: ${label} failed:`,
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function words(text: string) {
  return normalize(text)
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 3);
}

function cleanQuery(query: string) {
  const cleaned = query
    .replace(/\(.*?\)/g, " ")
    .split(/[,—–]/)[0]
    ?.replace(/\s+/g, " ")
    .trim();
  return cleaned || query;
}

function commonsFileUrl(file: string) {
  return (
    "https://commons.wikimedia.org/wiki/Special:FilePath/" +
    encodeURIComponent(file.replace(/^File:/, "")) +
    "?width=800"
  );
}

function directImageUrl(value?: string) {
  if (!value) return null;
  const commons = value.match(
    /commons\.(?:m\.)?wikimedia\.org\/wiki\/(File:.+)$/i,
  );
  if (commons?.[1]) return commonsFileUrl(decodeURIComponent(commons[1]));
  if (/^https?:\/\/\S+\.(jpe?g|png|webp)(\?\S*)?$/i.test(value)) return value;
  return null;
}

interface OsmPlace {
  display_name?: string;
  lat?: string;
  lon?: string;
  extratags?: Record<string, string>;
}

async function findPlace(query: string) {
  const results = await fetchJson<OsmPlace[]>(
    "search",
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&extratags=1&q=${encodeURIComponent(query)}`,
  );
  const place = results?.[0];
  if (!place) return null;
  return {
    name: place.display_name?.split(",")[0] ?? "unknown",
    lat: Number(place.lat),
    lng: Number(place.lon),
    tags: place.extratags ?? {},
  };
}

async function wikidataImage(id: string) {
  const data = await fetchJson<{
    claims?: { P18?: { mainsnak?: { datavalue?: { value?: string } } }[] };
  }>(
    "wikidata",
    `https://www.wikidata.org/w/api.php?action=wbgetclaims&property=P18&format=json&entity=${id}`,
  );
  const file = data?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
  return file ? commonsFileUrl(file) : null;
}

async function wikipediaImage(tag: string) {
  const [lang, ...rest] = tag.split(":");
  const title = rest.join(":");
  if (!lang || !title) return null;
  const data = await fetchJson<{
    query?: { pages?: Record<string, { thumbnail?: { source?: string } }> };
  }>(
    "wikipedia",
    `https://${lang}.wikipedia.org/w/api.php?action=query&prop=pageimages&piprop=thumbnail&pithumbsize=800&format=json&redirects=1&titles=${encodeURIComponent(title)}`,
  );
  return Object.values(data?.query?.pages ?? {})[0]?.thumbnail?.source ?? null;
}

async function entityImage(tags: Record<string, string>) {
  return (
    directImageUrl(tags.image) ??
    (tags.wikimedia_commons?.startsWith("File:")
      ? commonsFileUrl(tags.wikimedia_commons)
      : null) ??
    (tags.wikidata ? await wikidataImage(tags.wikidata) : null) ??
    (tags.wikipedia ? await wikipediaImage(tags.wikipedia) : null)
  );
}

interface CommonsPage {
  index?: number;
  title?: string;
  imageinfo?: { thumburl?: string; url?: string }[];
}

async function nearbyImage(lat: number, lng: number, hint: string) {
  const data = await fetchJson<{
    query?: { pages?: Record<string, CommonsPage> };
  }>(
    "geosearch",
    `https://commons.wikimedia.org/w/api.php?action=query&generator=geosearch&ggscoord=${lat}%7C${lng}&ggsradius=2000&ggsnamespace=6&ggslimit=50&prop=imageinfo&iiprop=url&iiurlwidth=800&format=json`,
  );
  const photos = Object.values(data?.query?.pages ?? {})
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .flatMap((page) => {
      const url = page.imageinfo?.[0]?.thumburl ?? page.imageinfo?.[0]?.url;
      const title = page.title ?? "";
      return url && /\.(jpe?g|png|webp)$/i.test(title) ? [{ title, url }] : [];
    });
  const hintWords = words(hint);
  const best =
    photos.find((photo) =>
      hintWords.some((word) => normalize(photo.title).includes(word)),
    ) ?? photos[0];
  if (!best) {
    console.warn(`Places: no image near ${lat},${lng}`);
    return null;
  }
  console.log(`Places: nearby image for "${hint}" (${best.title})`);
  return best.url;
}

export async function placePhotoUrl(query: string): Promise<string | null> {
  const place = await findPlace(query);
  if (!place) {
    console.warn(`Places: no match for "${query}"`);
    return null;
  }
  const photo = await entityImage(place.tags);
  if (photo) {
    console.log(`Places: entity image for "${query}" (${place.name})`);
    return photo;
  }
  if (!Number.isFinite(place.lat) || !Number.isFinite(place.lng)) return null;
  return nearbyImage(place.lat, place.lng, query.split(",")[0] ?? query);
}

export async function withStopPhotos(
  days: ItineraryDay[],
  destination: string,
  existing: ItineraryDay[] = [],
): Promise<ItineraryDay[]> {
  const known = new Map<string, string>();
  for (const day of existing) {
    for (const stop of day.stops) {
      if (stop.photoUrl) known.set(stop.title, stop.photoUrl);
    }
  }

  async function stopPhoto(stop: ItineraryStop) {
    const name = cleanQuery(stop.mapsQuery);
    const photo = await placePhotoUrl(`${name}, ${destination}`);
    if (photo) return photo;
    if (stop.lat === undefined || stop.lng === undefined) return undefined;
    return (await nearbyImage(stop.lat, stop.lng, name)) ?? undefined;
  }

  return Promise.all(
    days.map(async (day) => ({
      ...day,
      stops: await Promise.all(
        day.stops.map(async (stop) => ({
          ...stop,
          photoUrl: known.get(stop.title) ?? (await stopPhoto(stop)),
        })),
      ),
    })),
  );
}
