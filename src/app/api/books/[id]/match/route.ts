import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { fetchCatalogCover } from "@/lib/catalog-search";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  title: z.string().min(1).max(300),
  authors: z.array(z.string()).default([]),
  pageCount: z.number().int().positive().nullable().optional(),
  wordCountEstimate: z.number().int().positive().nullable().optional(),
  coverUrl: z.string().url().nullable().optional(),
  sources: z.array(z.enum(["google", "openlibrary"])).min(1),
  externalIds: z.object({
    google: z.string().optional(),
    openlibrary: z.string().optional()
  })
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const payload = await request.json().catch(() => null);
  const parsed = schema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const existing = await prisma.book.findFirst({
    where: { id, userId: user.id },
    select: {
      id: true,
      fileName: true,
      wordCount: true,
      estimatedPages: true
    }
  });

  if (!existing) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  const titleWithAuthors = `${parsed.data.title}${
    parsed.data.authors.length ? ` — ${parsed.data.authors.join(", ")}` : ""
  }`;

  const source = parsed.data.sources[0];
  const sourceId = parsed.data.externalIds[source];
  const isCatalogOnlyBook = existing.fileName.startsWith("catalog:");

  const nextWordCount =
    parsed.data.wordCountEstimate ??
    (parsed.data.pageCount ? parsed.data.pageCount * 300 : null);
  const cover = await fetchCatalogCover(parsed.data.coverUrl);

  const updated = await prisma.book.update({
    where: { id: existing.id },
    data: {
      title: titleWithAuthors,
      fileName:
        isCatalogOnlyBook && sourceId ? `catalog:${source}:${sourceId}` : existing.fileName,
      wordCount:
        isCatalogOnlyBook && typeof nextWordCount === "number" && nextWordCount > 0
          ? Math.max(300, Math.round(nextWordCount))
          : existing.wordCount,
      estimatedPages:
        isCatalogOnlyBook && parsed.data.pageCount && parsed.data.pageCount > 0
          ? parsed.data.pageCount
          : existing.estimatedPages,
      coverMime: cover?.coverMime ?? undefined,
      coverData: cover?.coverData ?? undefined
    },
    select: {
      id: true,
      title: true,
      fileName: true,
      wordCount: true,
      estimatedPages: true
    }
  });

  return NextResponse.json({ book: updated, mode: "matched" });
}
