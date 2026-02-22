export type CatalogSource = "google" | "openlibrary";

export type CatalogBook = {
  key: string;
  title: string;
  authors: string[];
  publishedYear: number | null;
  pageCount: number | null;
  wordCountEstimate: number | null;
  coverUrl: string | null;
  language: string | null;
  sources: CatalogSource[];
  externalIds: Partial<Record<CatalogSource, string>>;
  isbn: string | null;
};

function hasCyrillic(text: string) {
  return /[а-яё]/i.test(text);
}

type GoogleVolume = {
  id: string;
  volumeInfo?: {
    title?: string;
    authors?: string[];
    publishedDate?: string;
    pageCount?: number;
    language?: string;
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
    industryIdentifiers?: Array<{ type?: string; identifier?: string }>;
  };
};

type OpenLibraryDoc = {
  key?: string;
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  number_of_pages_median?: number;
  language?: string[];
  cover_i?: number;
  isbn?: string[];
};

function normalizeIsbn(raw: string | null | undefined) {
  if (!raw) return null;
  const normalized = raw.replace(/[^0-9Xx]/g, "").toUpperCase();
  if (normalized.length === 10 || normalized.length === 13) return normalized;
  return null;
}

function normalizeText(value: string | null | undefined) {
  if (!value) return "";
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pickPrimaryKey(item: {
  isbn: string | null;
  title: string;
  authors: string[];
}) {
  if (item.isbn) return `isbn:${item.isbn}`;
  const titleKey = normalizeText(item.title);
  const authorKey = normalizeText(item.authors[0] ?? "");
  return `ta:${titleKey}|${authorKey}`;
}

function yearFromDateString(value: string | undefined) {
  if (!value) return null;
  const match = value.match(/\d{4}/);
  if (!match) return null;
  const year = Number(match[0]);
  return Number.isFinite(year) ? year : null;
}

function toWordEstimate(pageCount: number | null) {
  if (!pageCount || pageCount <= 0) return null;
  return Math.round(pageCount * 300);
}

function toHttps(url: string | undefined) {
  if (!url) return null;
  return url.replace(/^http:\/\//i, "https://");
}

export function mapGoogleVolumes(volumes: GoogleVolume[]): CatalogBook[] {
  return volumes
    .map((volume) => {
      const info = volume.volumeInfo ?? {};
      const pageCount = typeof info.pageCount === "number" && info.pageCount > 0 ? info.pageCount : null;
      const isbn =
        normalizeIsbn(
          info.industryIdentifiers?.find((item) => item.type === "ISBN_13")?.identifier ??
            info.industryIdentifiers?.find((item) => item.type === "ISBN_10")?.identifier
        ) ?? null;
      const title = (info.title ?? "").trim();
      const authors = (info.authors ?? []).filter(Boolean);
      const key = pickPrimaryKey({ isbn, title, authors });

      return {
        key,
        title: title || "Untitled",
        authors,
        publishedYear: yearFromDateString(info.publishedDate),
        pageCount,
        wordCountEstimate: toWordEstimate(pageCount),
        coverUrl: toHttps(info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail),
        language: info.language ?? null,
        sources: ["google"] as CatalogSource[],
        externalIds: { google: volume.id },
        isbn
      } satisfies CatalogBook;
    })
    .filter((item) => item.title !== "Untitled");
}

export function mapOpenLibraryDocs(docs: OpenLibraryDoc[]): CatalogBook[] {
  return docs
    .map((doc) => {
      const pageCount =
        typeof doc.number_of_pages_median === "number" && doc.number_of_pages_median > 0
          ? doc.number_of_pages_median
          : null;
      const isbn = normalizeIsbn(doc.isbn?.[0]) ?? null;
      const title = (doc.title ?? "").trim();
      const authors = (doc.author_name ?? []).filter(Boolean);
      const key = pickPrimaryKey({ isbn, title, authors });
      const coverUrl = doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null;

      return {
        key,
        title: title || "Untitled",
        authors,
        publishedYear: doc.first_publish_year ?? null,
        pageCount,
        wordCountEstimate: toWordEstimate(pageCount),
        coverUrl,
        language: doc.language?.[0] ?? null,
        sources: ["openlibrary"] as CatalogSource[],
        externalIds: { openlibrary: doc.key ?? "" },
        isbn
      } satisfies CatalogBook;
    })
    .filter((item) => item.title !== "Untitled");
}

function pickMoreInformativeNumber(a: number | null, b: number | null) {
  if (a === null) return b;
  if (b === null) return a;
  return b > a ? b : a;
}

function pickMoreInformativeString(a: string | null, b: string | null) {
  if (!a) return b;
  if (!b) return a;
  return b.length > a.length ? b : a;
}

export function dedupeCatalogBooks(items: CatalogBook[]) {
  const map = new Map<string, CatalogBook>();

  for (const item of items) {
    const existing = map.get(item.key);
    if (!existing) {
      map.set(item.key, item);
      continue;
    }

    const mergedSources = Array.from(new Set([...existing.sources, ...item.sources]));

    map.set(item.key, {
      ...existing,
      title: pickMoreInformativeString(existing.title, item.title) ?? existing.title,
      authors: existing.authors.length >= item.authors.length ? existing.authors : item.authors,
      publishedYear: existing.publishedYear ?? item.publishedYear,
      pageCount: pickMoreInformativeNumber(existing.pageCount, item.pageCount),
      wordCountEstimate: pickMoreInformativeNumber(existing.wordCountEstimate, item.wordCountEstimate),
      coverUrl: existing.coverUrl ?? item.coverUrl,
      language: existing.language ?? item.language,
      sources: mergedSources,
      externalIds: {
        google: existing.externalIds.google ?? item.externalIds.google,
        openlibrary: existing.externalIds.openlibrary ?? item.externalIds.openlibrary
      },
      isbn: existing.isbn ?? item.isbn
    });
  }

  return Array.from(map.values());
}

export function rankCatalogBooks(items: CatalogBook[], rawQuery: string) {
  const query = normalizeText(rawQuery);
  if (!query) return items;

  const queryTokens = query.split(" ").filter(Boolean);
  const queryHasCyrillic = hasCyrillic(rawQuery);

  const scored = items.map((item) => {
    const title = normalizeText(item.title);
    const authors = normalizeText(item.authors.join(" "));

    let score = 0;

    if (title === query) score += 200;
    if (title.startsWith(query)) score += 120;
    if (title.includes(query)) score += 80;
    if (authors.includes(query)) score += 40;

    for (const token of queryTokens) {
      if (title.includes(token)) score += 18;
      if (authors.includes(token)) score += 8;
    }

    if (item.isbn && queryTokens.some((token) => item.isbn?.includes(token))) {
      score += 100;
    }

    if (item.authors.length > 0) score += 6;
    if (item.coverUrl) score += 4;
    if (item.sources.includes("google")) score += 2;
    if (item.sources.includes("openlibrary")) score += 1;

    if (queryHasCyrillic && item.language?.toLowerCase().startsWith("ru")) {
      score += 20;
    }

    return { item, score };
  });

  return scored
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const aYear = a.item.publishedYear ?? -Infinity;
      const bYear = b.item.publishedYear ?? -Infinity;
      return bYear - aYear;
    })
    .map((entry) => entry.item);
}
