import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";

type ParsedEpub = {
  title: string;
  wordCount: number;
  estimatedPages: number;
  coverMime: string | null;
  coverData: Buffer | null;
};

type ManifestItem = {
  id?: string;
  href?: string;
  mediaType?: string;
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
  return text
    .split(/\s+/)
    .filter(Boolean)
    .length;
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function resolveZipPath(rootFolder: string, href: string) {
  return new URL(href, `https://dummy/${rootFolder}`).pathname.slice(1);
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
  const title =
    (Array.isArray(titleFromMeta) ? titleFromMeta[0] : titleFromMeta) || fallbackTitle;

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
    totalWords += countWords(stripHtml(chapterHtml));
  }

  if (totalWords === 0) {
    for (const fileName of Object.keys(zip.files)) {
      if (!fileName.endsWith(".xhtml") && !fileName.endsWith(".html") && !fileName.endsWith(".htm")) {
        continue;
      }
      const file = zip.file(fileName);
      if (!file) continue;
      totalWords += countWords(stripHtml(await file.async("string")));
    }
  }

  const estimatedPages = Math.max(1, Math.ceil(totalWords / 300));

  return {
    title: typeof title === "string" && title.trim() ? title.trim() : fallbackTitle,
    wordCount: totalWords,
    estimatedPages,
    coverMime,
    coverData
  };
}
