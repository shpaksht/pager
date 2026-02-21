import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseEpub } from "@/lib/epub";

export const runtime = "nodejs";

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

    const book = await prisma.book.create({
      data: {
        userId: user.id,
        title: parsed.title,
        fileName: file.name,
        wordCount: parsed.wordCount,
        estimatedPages: parsed.estimatedPages,
        coverMime: parsed.coverMime,
        coverData: parsed.coverData
      }
    });

    return NextResponse.json({ book });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
