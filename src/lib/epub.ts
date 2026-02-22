import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";

type ParsedChapter = {
  order: number;
  title: string;
  href: string | null;
  wordCount: number;
};

type ParsedChapterWithMeta = ParsedChapter & {
  fromToc: boolean;
};

type ParsedEpub = {
  title: string;
  wordCount: number;
  estimatedPages: number;
  coverMime: string | null;
  coverData: Buffer | null;
  chapters: ParsedChapter[];
};

type ManifestItem = {
  id?: string;
  href?: string;
  mediaType?: string;
  properties?: string;
  [key: string]: unknown;
};

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function countWords(text: string) {
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function resolveZipPath(rootFolder: string, href: string) {
  return new URL(href, `https://dummy/${rootFolder}`).pathname.slice(1);
}

function normalizePath(pathOrHref: string) {
  return pathOrHref.split("#")[0]?.trim().toLowerCase();
}

function prettifyTitleFromPath(pathOrHref: string) {
  const part = pathOrHref.split("/").pop() ?? pathOrHref;
  const plain = part.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ").trim();
  if (!plain) return "Chapter";
  return plain[0].toUpperCase() + plain.slice(1);
}

function isTechnicalChapterTitle(title: string) {
  const normalized = title.trim().toLowerCase().replace(/\s+/g, " ");
  if (!normalized) return true;

  return (
    /^index[\s_-]*split[\s_-]*\d+$/.test(normalized) ||
    /^split[\s_-]*\d+$/.test(normalized) ||
    /^chapter[\s_-]*\d+$/.test(normalized) ||
    /^part[\s_-]*\d+$/.test(normalized) ||
    /^section[\s_-]*\d+$/.test(normalized) ||
    /^page[\s_-]*\d+$/.test(normalized) ||
    /^file[\s_-]*\d+$/.test(normalized) ||
    /^x?html[\s_-]*\d*$/.test(normalized)
  );
}

function extractHeadingFromHtml(html: string) {
  const match = html.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i);
  if (!match?.[1]) return null;
  const heading = stripHtml(match[1]);
  return heading.trim() ? heading.trim() : null;
}

function resolveChapterTitle(options: {
  tocTitle: string | null;
  pathTitle: string;
  htmlHeading: string | null;
  order: number;
}) {
  const candidates = [options.tocTitle, options.htmlHeading, options.pathTitle].filter(
    (value): value is string => typeof value === "string" && value.trim().length > 0
  );

  for (const candidate of candidates) {
    if (!isTechnicalChapterTitle(candidate)) {
      return candidate.trim();
    }
  }

  return `Chapter ${options.order + 1}`;
}

function findCoverId(metadata: unknown): string | null {
  const metadataNode = metadata as Record<string, unknown> | undefined;
  if (!metadataNode) return null;

  const metaEntries = toArray(metadataNode.meta as Record<string, unknown> | Record<string, unknown>[] | undefined);
  for (const metaEntry of metaEntries) {
    const name = typeof metaEntry.name === "string" ? metaEntry.name.toLowerCase() : "";
    const content = typeof metaEntry.content === "string" ? metaEntry.content : null;
    if (name === "cover" && content) {
      return content;
    }
  }

  return null;
}

function pickCoverManifestItem(manifestItems: ManifestItem[], coverId: string | null): ManifestItem | null {
  if (coverId) {
    const byId = manifestItems.find((item) => item.id === coverId);
    if (byId?.href) return byId;
  }

  const byProperty = manifestItems.find((item) => {
    const props = typeof item.properties === "string" ? item.properties : "";
    return props.split(/\s+/).includes("cover-image") && !!item.href;
  });
  if (byProperty) return byProperty;

  const byName = manifestItems.find((item) => {
    const href = typeof item.href === "string" ? item.href.toLowerCase() : "";
    const mediaType = typeof item.mediaType === "string" ? item.mediaType.toLowerCase() : "";
    return href.includes("cover") && mediaType.startsWith("image/");
  });

  return byName ?? null;
}

function extractNavTitles(navHtml: string) {
  const map = new Map<string, string>();
  const matches = navHtml.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi);

  for (const match of matches) {
    const href = normalizePath(match[1] ?? "");
    const title = stripHtml(match[2] ?? "");
    if (!href || !title) continue;
    if (!map.has(href)) map.set(href, title);
  }

  return map;
}

type NcxNavPoint = {
  navLabel?: { text?: string | string[] };
  content?: { src?: string };
  navPoint?: NcxNavPoint | NcxNavPoint[];
};

function walkNcxNavPoints(points: NcxNavPoint[], map: Map<string, string>) {
  for (const point of points) {
    const href = normalizePath(point?.content?.src ?? "");
    const labelRaw = point?.navLabel?.text;
    const label = Array.isArray(labelRaw) ? labelRaw[0] : labelRaw;

    if (href && typeof label === "string" && label.trim() && !map.has(href)) {
      map.set(href, label.trim());
    }

    const children = toArray(point?.navPoint);
    if (children.length) {
      walkNcxNavPoints(children, map);
    }
  }
}

function extractNcxTitles(ncxXml: string, parser: XMLParser) {
  const parsed = parser.parse(ncxXml);
  const navPoints = toArray(parsed?.ncx?.navMap?.navPoint as NcxNavPoint | NcxNavPoint[] | undefined);
  const map = new Map<string, string>();
  walkNcxNavPoints(navPoints, map);
  return map;
}

async function buildTocTitleMap(
  zip: JSZip,
  parser: XMLParser,
  rootFolder: string,
  manifestItems: ManifestItem[],
  spineTocId?: string
) {
  const titleMap = new Map<string, string>();

  const navItem = manifestItems.find((item) =>
    typeof item.properties === "string" && item.properties.split(/\s+/).includes("nav")
  );

  if (navItem?.href) {
    const navPath = resolveZipPath(rootFolder, navItem.href);
    const navFile = zip.file(navPath);
    if (navFile) {
      const navHtml = await navFile.async("string");
      const navTitles = extractNavTitles(navHtml);
      for (const [href, title] of navTitles) {
        titleMap.set(resolveZipPath(rootFolder, href).toLowerCase(), title);
      }
    }
  }

  if (spineTocId) {
    const ncxItem = manifestItems.find((item) => item.id === spineTocId);
    if (ncxItem?.href) {
      const ncxPath = resolveZipPath(rootFolder, ncxItem.href);
      const ncxFile = zip.file(ncxPath);
      if (ncxFile) {
        const ncxXml = await ncxFile.async("string");
        const ncxTitles = extractNcxTitles(ncxXml, parser);
        for (const [href, title] of ncxTitles) {
          titleMap.set(resolveZipPath(rootFolder, href).toLowerCase(), title);
        }
      }
    }
  }

  return titleMap;
}

export async function parseEpub(buffer: Buffer, fallbackTitle: string): Promise<ParsedEpub> {
  const zip = await JSZip.loadAsync(buffer);
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });

  const containerFile = zip.file("META-INF/container.xml");
  if (!containerFile) {
    throw new Error("Invalid EPUB: missing container.xml");
  }

  const containerXml = await containerFile.async("string");
  const container = parser.parse(containerXml);
  const rootFilePath =
    container?.container?.rootfiles?.rootfile?.["full-path"] ??
    container?.container?.rootfiles?.rootfile?.fullPath;

  if (!rootFilePath || typeof rootFilePath !== "string") {
    throw new Error("Invalid EPUB: missing root package file");
  }

  const opfFile = zip.file(rootFilePath);
  if (!opfFile) {
    throw new Error("Invalid EPUB: cannot find OPF file");
  }

  const opfXml = await opfFile.async("string");
  const opf = parser.parse(opfXml);

  const packageNode = opf?.package;
  const metadata = packageNode?.metadata;
  const manifest = packageNode?.manifest;
  const spine = packageNode?.spine;

  const titleFromMeta = metadata?.["dc:title"] ?? metadata?.title;
  const title = (Array.isArray(titleFromMeta) ? titleFromMeta[0] : titleFromMeta) || fallbackTitle;

  const manifestItems = toArray(manifest?.item as ManifestItem | ManifestItem[] | undefined);
  const manifestMap = new Map<string, string>();
  for (const item of manifestItems) {
    if (item?.id && item?.href) {
      manifestMap.set(item.id, item.href);
    }
  }

  const rootFolder = rootFilePath.includes("/")
    ? rootFilePath.slice(0, rootFilePath.lastIndexOf("/") + 1)
    : "";

  const tocTitleMap = await buildTocTitleMap(
    zip,
    parser,
    rootFolder,
    manifestItems,
    typeof spine?.toc === "string" ? spine.toc : undefined
  );

  const coverId = findCoverId(metadata);
  const coverItem = pickCoverManifestItem(manifestItems, coverId);
  let coverMime: string | null = null;
  let coverData: Buffer | null = null;

  if (coverItem?.href) {
    const coverPath = resolveZipPath(rootFolder, coverItem.href);
    const coverFile = zip.file(coverPath);
    if (coverFile) {
      coverData = await coverFile.async("nodebuffer");
      coverMime = typeof coverItem.mediaType === "string" ? coverItem.mediaType : "image/jpeg";
    }
  }

  const spineItems = toArray(spine?.itemref);
  const chapters: ParsedChapterWithMeta[] = [];
  let totalWords = 0;

  for (const itemRef of spineItems) {
    const idref = itemRef?.idref;
    if (!idref) continue;

    const href = manifestMap.get(idref);
    if (!href) continue;

    const normalizedPath = resolveZipPath(rootFolder, href);
    const chapterFile = zip.file(normalizedPath);
    if (!chapterFile) continue;

    const chapterHtml = await chapterFile.async("string");
    const chapterWords = countWords(stripHtml(chapterHtml));
    totalWords += chapterWords;

    const tocTitle = tocTitleMap.get(normalizePath(normalizedPath));
    const fromToc = typeof tocTitle === "string" && tocTitle.trim().length > 0;
    const titleFromPath = prettifyTitleFromPath(normalizedPath);
    const headingFromHtml = extractHeadingFromHtml(chapterHtml);
    const resolvedTitle = resolveChapterTitle({
      tocTitle: tocTitle ?? null,
      htmlHeading: headingFromHtml,
      pathTitle: titleFromPath,
      order: chapters.length
    });

    chapters.push({
      order: chapters.length,
      title: resolvedTitle,
      href: normalizedPath,
      wordCount: chapterWords,
      fromToc
    });
  }

  if (totalWords === 0) {
    for (const fileName of Object.keys(zip.files)) {
      if (!fileName.endsWith(".xhtml") && !fileName.endsWith(".html") && !fileName.endsWith(".htm")) {
        continue;
      }
      const file = zip.file(fileName);
      if (!file) continue;
      const html = await file.async("string");
      const words = countWords(stripHtml(html));
      const headingFromHtml = extractHeadingFromHtml(html);
      totalWords += words;
      chapters.push({
        order: chapters.length,
        title: resolveChapterTitle({
          tocTitle: null,
          htmlHeading: headingFromHtml,
          pathTitle: prettifyTitleFromPath(fileName),
          order: chapters.length
        }),
        href: fileName,
        wordCount: words,
        fromToc: false
      });
    }
  }

  const hasToc = tocTitleMap.size > 0;
  const normalizedChapters = (hasToc ? chapters.filter((chapter) => chapter.fromToc) : chapters).map(
    (chapter, index) => ({
      order: index,
      title: chapter.title,
      href: chapter.href,
      wordCount: chapter.wordCount
    })
  );

  const hasAnyWords = normalizedChapters.some((chapter) => chapter.wordCount > 0);
  const finalChapters =
    hasAnyWords
      ? normalizedChapters
      : normalizedChapters.map((chapter) => ({ ...chapter, wordCount: Math.max(1, chapter.wordCount) }));

  const estimatedPages = Math.max(1, Math.ceil(totalWords / 300));

  return {
    title: typeof title === "string" && title.trim() ? title.trim() : fallbackTitle,
    wordCount: totalWords,
    estimatedPages,
    coverMime,
    coverData,
    chapters: finalChapters
  };
}
