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

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = schema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const source = parsed.data.sources[0];
  const externalId = parsed.data.externalIds[source];

  if (!externalId) {
    return NextResponse.json({ error: "Missing source id" }, { status: 400 });
  }

  const canonicalFileName = `catalog:${source}:${externalId}`;

  const existing = await prisma.book.findFirst({
    where: {
      userId: user.id,
      fileName: canonicalFileName
    },
    select: {
      id: true,
      title: true,
      fileName: true,
      wordCount: true,
      estimatedPages: true
    }
  });

  if (existing) {
    return NextResponse.json({ book: existing, mode: "existing" });
  }

  const estimatedWords =
    parsed.data.wordCountEstimate ??
    (parsed.data.pageCount && parsed.data.pageCount > 0 ? parsed.data.pageCount * 300 : null) ??
    300;

  const safeWordCount = Math.max(300, Math.round(estimatedWords));
  const safePages = Math.max(1, parsed.data.pageCount ?? Math.ceil(safeWordCount / 300));
  const authorSuffix = parsed.data.authors.length ? ` — ${parsed.data.authors.join(", ")}` : "";
  const cover = await fetchCatalogCover(parsed.data.coverUrl);

  const book = await prisma.book.create({
    data: {
      userId: user.id,
      title: `${parsed.data.title}${authorSuffix}`,
      fileName: canonicalFileName,
      wordCount: safeWordCount,
      estimatedPages: safePages,
      coverMime: cover?.coverMime ?? null,
      coverData: cover?.coverData ?? null
    },
    select: {
      id: true,
      title: true,
      fileName: true,
      wordCount: true,
      estimatedPages: true
    }
  });

  return NextResponse.json({ book, mode: "created" });
}
