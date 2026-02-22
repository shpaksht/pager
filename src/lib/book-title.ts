export function splitTitleAndAuthor(rawTitle: string) {
  const trimmed = rawTitle.trim();
  if (!trimmed) {
    return { title: "", author: null as string | null };
  }

  const match = trimmed.match(/^(.*?)\s[—-]\s(.+)$/);
  if (!match) {
    return { title: trimmed, author: null as string | null };
  }

  const title = (match[1] ?? "").trim();
  const author = (match[2] ?? "").trim();

  return {
    title: title || trimmed,
    author: author || null
  };
}

export function hasMatchedAuthor(rawTitle: string) {
  return !!splitTitleAndAuthor(rawTitle).author;
}

export function buildMatchQuery(rawTitle: string) {
  const { title, author } = splitTitleAndAuthor(rawTitle);
  return [title, author].filter(Boolean).join(" ").trim();
}

export function normalizeEpubFileName(fileName: string | null | undefined) {
  if (!fileName || fileName.startsWith("catalog:")) {
    return "";
  }

  return fileName
    .replace(/\.epub$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildMatchQueryFromBook(rawTitle: string, fileName: string | null | undefined) {
  const fromFileName = normalizeEpubFileName(fileName);
  if (fromFileName) {
    return fromFileName;
  }

  return buildMatchQuery(rawTitle);
}
