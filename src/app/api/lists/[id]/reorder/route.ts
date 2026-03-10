import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  orderedBookIds: z.array(z.string().min(1)).min(1)
});

export async function PATCH(
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

  const list = await prisma.readingList.findFirst({
    where: {
      id,
      userId: user.id
    },
    select: {
      id: true,
      items: {
        select: {
          id: true,
          bookId: true
        }
      }
    }
  });

  if (!list) {
    return NextResponse.json({ error: "List not found" }, { status: 404 });
  }

  if (list.items.length !== parsed.data.orderedBookIds.length) {
    return NextResponse.json({ error: "Ordered books do not match the list" }, { status: 400 });
  }

  const itemByBookId = new Map(list.items.map((item) => [item.bookId, item]));
  if (parsed.data.orderedBookIds.some((bookId) => !itemByBookId.has(bookId))) {
    return NextResponse.json({ error: "Ordered books do not match the list" }, { status: 400 });
  }

  await prisma.$transaction(
    parsed.data.orderedBookIds.map((bookId, index) =>
      prisma.readingListBook.update({
        where: { id: itemByBookId.get(bookId)!.id },
        data: { position: index + 1 }
      })
    )
  );

  return NextResponse.json({ ok: true });
}
