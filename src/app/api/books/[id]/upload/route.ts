import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { fetchCatalogCover, searchCatalog } from "@/lib/catalog-search";
import { hasMatchedAuthor } from "@/lib/book-title";
import { parseEpub } from "@/lib/epub";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9а-яё\\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const book = await prisma.book.findFirst({
      where: { id, userId: user.id },
      select: { id: true, title: true }
    });

    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".epub")) {
      return NextResponse.json({ error: "Only .epub files are supported" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await parseEpub(buffer, book.title);

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
    const shouldKeepExistingMatch = hasMatchedAuthor(book.title) && !looksLikeGoodMatch;
    const resolvedTitle = shouldKeepExistingMatch
      ? book.title
      : looksLikeGoodMatch && matchedTitle
        ? matchedTitle
        : parsed.title;
    const matchedCover = looksLikeGoodMatch ? await fetchCatalogCover(bestMatch?.coverUrl) : null;
    const coverMime = matchedCover?.coverMime ?? parsed.coverMime;
    const coverData = matchedCover?.coverData ?? parsed.coverData;

    const updated = await prisma.book.update({
      where: { id: book.id },
      data: {
        title: resolvedTitle,
        fileName: file.name,
        wordCount: parsed.wordCount,
        estimatedPages: parsed.estimatedPages,
        coverMime,
        coverData,
        chapters: {
          deleteMany: {},
          create: parsed.chapters.map((chapter, index) => ({
            order: chapter.order ?? index,
            title: chapter.title,
            href: chapter.href,
            wordCount: chapter.wordCount
          }))
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

    return NextResponse.json({ book: updated, mode: "updated", matchedCatalog: looksLikeGoodMatch ? bestMatch : null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
