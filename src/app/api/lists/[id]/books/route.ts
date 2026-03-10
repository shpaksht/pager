import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  bookId: z.string().min(1)
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

  const [list, book, lastItem] = await Promise.all([
    prisma.readingList.findFirst({
      where: {
        id,
        userId: user.id
      },
      select: { id: true }
    }),
    prisma.book.findFirst({
      where: {
        id: parsed.data.bookId,
        userId: user.id
      },
      select: { id: true }
    }),
    prisma.readingListBook.findFirst({
      where: { listId: id },
      orderBy: { position: "desc" },
      select: { position: true }
    })
  ]);

  if (!list) {
    return NextResponse.json({ error: "List not found" }, { status: 404 });
  }

  if (!book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  try {
    const item = await prisma.readingListBook.create({
      data: {
        listId: id,
        bookId: parsed.data.bookId,
        position: (lastItem?.position ?? 0) + 1
      },
      select: {
        id: true,
        listId: true,
        bookId: true,
        position: true
      }
    });

    return NextResponse.json({ item });
  } catch {
    return NextResponse.json({ error: "Book is already in this list" }, { status: 409 });
  }
}
