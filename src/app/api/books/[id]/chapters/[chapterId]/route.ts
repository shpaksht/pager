import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; chapterId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, chapterId } = await params;
  const payload = (await request.json()) as { isRead?: boolean };
  if (typeof payload.isRead !== "boolean") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const chapter = await prisma.bookChapter.findFirst({
    where: {
      id: chapterId,
      bookId: id,
      book: { userId: user.id }
    },
    select: { id: true }
  });

  if (!chapter) {
    return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
  }

  const updated = await prisma.bookChapter.update({
    where: { id: chapterId },
    data: {
      isRead: payload.isRead,
      readAt: payload.isRead ? new Date() : null
    },
    select: {
      id: true,
      isRead: true,
      readAt: true
    }
  });

  return NextResponse.json({ chapter: updated });
}
