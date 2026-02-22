import { dedupeCatalogBooks, mapGoogleVolumes, mapOpenLibraryDocs, rankCatalogBooks, type CatalogBook } from "@/lib/catalog";

async function searchGoogleBooks(query: string) {
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  if (!apiKey) return [] as CatalogBook[];

  const hasCyrillic = /[а-яё]/i.test(query);
  const queries = [query, `intitle:${query}`];
  const allItems: unknown[] = [];

  for (const q of queries) {
    const url = new URL("https://www.googleapis.com/books/v1/volumes");
    url.searchParams.set("q", q);
    url.searchParams.set("maxResults", "20");
    url.searchParams.set("printType", "books");
    url.searchParams.set("key", apiKey);
    if (hasCyrillic) {
      url.searchParams.set("langRestrict", "ru");
    }

    const response = await fetch(url.toString(), { next: { revalidate: 3600 } });
    if (!response.ok) continue;

    const data = (await response.json()) as { items?: unknown[] };
    const items = Array.isArray(data.items) ? data.items : [];
    allItems.push(...items);
  }

  const uniqueById = new Map<string, unknown>();
  for (const item of allItems as Array<{ id?: string }>) {
    if (item?.id && !uniqueById.has(item.id)) {
      uniqueById.set(item.id, item);
    }
  }

  return mapGoogleVolumes(Array.from(uniqueById.values()) as never[]);
}

async function searchOpenLibrary(query: string) {
  const url = new URL("https://openlibrary.org/search.json");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "20");

  const response = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!response.ok) return [] as CatalogBook[];

  const data = (await response.json()) as { docs?: unknown[] };
  const docs = Array.isArray(data.docs) ? data.docs : [];
  return mapOpenLibraryDocs(docs as never[]);
}

export async function searchCatalog(query: string, limit = 30) {
  const [google, openLibrary] = await Promise.all([searchGoogleBooks(query), searchOpenLibrary(query)]);
  const deduped = dedupeCatalogBooks([...google, ...openLibrary]);
  return rankCatalogBooks(deduped, query).slice(0, limit);
}

export async function fetchCatalogCover(coverUrl: string | null | undefined) {
  if (!coverUrl) return null;

  try {
    const response = await fetch(coverUrl, { next: { revalidate: 86400 } });
    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") ?? "";
    const mime = contentType.split(";")[0]?.trim().toLowerCase();
    if (!mime || !mime.startsWith("image/")) {
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length || buffer.length > 5 * 1024 * 1024) {
      return null;
    }

    return {
      coverMime: mime,
      coverData: buffer
    };
  } catch {
    return null;
  }
}
