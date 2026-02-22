import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { fetchCatalogCover, searchCatalog } from "@/lib/catalog-search";
import { hasMatchedAuthor } from "@/lib/book-title";
import { prisma } from "@/lib/prisma";
import { parseEpub } from "@/lib/epub";

export const runtime = "nodejs";

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9а-яё\\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".epub")) {
      return NextResponse.json({ error: "Only .epub files are supported" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const parsed = await parseEpub(Buffer.from(arrayBuffer), file.name.replace(/\.epub$/i, ""));

    if (parsed.wordCount <= 0) {
      return NextResponse.json({ error: "Could not extract text from this EPUB file" }, { status: 400 });
    }

    const matches = await searchCatalog(parsed.title, 5).catch(() => []);
    const bestMatch = matches[0] ?? null;
    const parsedTitleNorm = normalize(parsed.title);
    const bestTitleNorm = bestMatch ? normalize(bestMatch.title) : "";
    const looksLikeGoodMatch =
      !!bestMatch &&
      (bestTitleNorm === parsedTitleNorm ||
        bestTitleNorm.includes(parsedTitleNorm) ||
        parsedTitleNorm.includes(bestTitleNorm));
    const matchedTitle = bestMatch
      ? `${bestMatch.title}${bestMatch.authors.length ? ` — ${bestMatch.authors.join(", ")}` : ""}`
      : null;
    const matchedCover = looksLikeGoodMatch ? await fetchCatalogCover(bestMatch?.coverUrl) : null;
    const coverMime = matchedCover?.coverMime ?? parsed.coverMime;
    const coverData = matchedCover?.coverData ?? parsed.coverData;

    const existing = await prisma.book.findFirst({
      where: {
        userId: user.id,
        fileName: file.name
      },
      select: { id: true, title: true }
    });

    const shouldKeepExistingMatch = !!existing && hasMatchedAuthor(existing.title) && !looksLikeGoodMatch;
    const resolvedTitle = shouldKeepExistingMatch
      ? existing.title
      : looksLikeGoodMatch && matchedTitle
        ? matchedTitle
        : parsed.title;

    const chapterPayload = parsed.chapters.map((chapter, index) => ({
      order: chapter.order ?? index,
      title: chapter.title,
      href: chapter.href,
      wordCount: chapter.wordCount
    }));

    const book = existing
      ? await prisma.book.update({
          where: { id: existing.id },
          data: {
            title: resolvedTitle,
            wordCount: parsed.wordCount,
            estimatedPages: parsed.estimatedPages,
            coverMime,
            coverData,
            chapters: {
              deleteMany: {},
              create: chapterPayload
            }
          },
          select: {
            id: true,
            title: true,
            fileName: true,
            wordCount: true,
            estimatedPages: true
          }
        })
      : await prisma.book.create({
          data: {
            userId: user.id,
            title: resolvedTitle,
            fileName: file.name,
            wordCount: parsed.wordCount,
            estimatedPages: parsed.estimatedPages,
            coverMime,
            coverData,
            chapters: {
              create: chapterPayload
            }
          },
          select: {
            id: true,
            title: true,
            fileName: true,
            wordCount: true,
            estimatedPages: true
          }
        });

    return NextResponse.json({
      book,
      mode: existing ? "updated" : "created",
      matchedCatalog: looksLikeGoodMatch ? bestMatch : null
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
