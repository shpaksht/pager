import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; bookId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, bookId } = await params;
  const list = await prisma.readingList.findFirst({
    where: {
      id,
      userId: user.id
    },
    select: { id: true }
  });

  if (!list) {
    return NextResponse.json({ error: "List not found" }, { status: 404 });
  }

  const currentItems = await prisma.readingListBook.findMany({
    where: { listId: id },
    orderBy: { position: "asc" },
    select: {
      id: true,
      bookId: true
    }
  });

  if (!currentItems.some((item) => item.bookId === bookId)) {
    return NextResponse.json({ error: "Book is not in this list" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.readingListBook.deleteMany({
      where: {
        listId: id,
        bookId
      }
    });

    const remaining = currentItems.filter((item) => item.bookId !== bookId);
    for (const [index, item] of remaining.entries()) {
      await tx.readingListBook.update({
        where: { id: item.id },
        data: { position: index + 1 }
      });
    }
  });

  return NextResponse.json({ ok: true });
}
