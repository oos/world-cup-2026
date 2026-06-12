const WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php";
const cache = new Map<string, string | null>();
const pending = new Map<string, Promise<string | null>>();

function clubTitleCandidates(clubName: string): string[] {
  const trimmed = clubName.trim();
  return [
    trimmed,
    `${trimmed} FC`,
    `${trimmed} F.C.`,
    `FC ${trimmed}`,
    `${trimmed} (football club)`,
  ];
}

function isClubPageTitle(title: string): boolean {
  return !/season|list of|squad|transfers|statistics|record|history|youth|women|basketball/i.test(
    title
  );
}

async function fetchThumbnailForTitle(title: string): Promise<string | null> {
  const params = new URLSearchParams({
    action: "query",
    titles: title,
    prop: "pageimages",
    piprop: "thumbnail",
    pithumbsize: "64",
    format: "json",
    redirects: "1",
    origin: "*",
  });

  const response = await fetch(`${WIKIPEDIA_API}?${params}`);
  if (!response.ok) return null;

  const data = await response.json();
  const pages = data?.query?.pages ?? {};
  for (const page of Object.values(pages) as Array<{
    missing?: string;
    title?: string;
    thumbnail?: { source?: string };
  }>) {
    if (page.missing || !page.thumbnail?.source) continue;
    if (!isClubPageTitle(page.title ?? title)) continue;
    return page.thumbnail.source;
  }
  return null;
}

async function fetchThumbnailBySearch(clubName: string): Promise<string | null> {
  const params = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: clubName,
    gsrlimit: "6",
    prop: "pageimages",
    piprop: "thumbnail",
    pithumbsize: "64",
    format: "json",
    origin: "*",
  });

  const response = await fetch(`${WIKIPEDIA_API}?${params}`);
  if (!response.ok) return null;

  const data = await response.json();
  const pages = Object.values(data?.query?.pages ?? {}) as Array<{
    title?: string;
    index?: number;
    thumbnail?: { source?: string };
  }>;

  pages.sort((a, b) => (a.index ?? 99) - (b.index ?? 99));
  for (const page of pages) {
    if (!page.thumbnail?.source || !isClubPageTitle(page.title ?? "")) continue;
    return page.thumbnail.source;
  }
  return null;
}

export function getCachedClubBadgeUrl(clubName?: string | null): string | null {
  const key = clubName?.trim();
  if (!key || !cache.has(key)) return null;
  return cache.get(key) ?? null;
}

export function fetchClubBadgeUrl(clubName: string): Promise<string | null> {
  const key = clubName.trim();
  if (!key) return Promise.resolve(null);
  if (cache.has(key)) return Promise.resolve(cache.get(key) ?? null);
  if (pending.has(key)) return pending.get(key)!;

  const promise = (async () => {
    for (const title of clubTitleCandidates(key)) {
      const url = await fetchThumbnailForTitle(title);
      if (url) {
        cache.set(key, url);
        return url;
      }
    }

    const searchUrl = await fetchThumbnailBySearch(key);
    cache.set(key, searchUrl);
    return searchUrl;
  })()
    .catch(() => {
      cache.set(key, null);
      return null;
    })
    .finally(() => {
      pending.delete(key);
    });

  pending.set(key, promise);
  return promise;
}
