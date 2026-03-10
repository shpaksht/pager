import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  name: z.string().trim().min(1).max(120)
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
  const parsed = updateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

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

  const updated = await prisma.readingList.update({
    where: { id },
    data: {
      name: parsed.data.name
    },
    select: {
      id: true,
      name: true,
      createdAt: true,
      updatedAt: true
    }
  });

  return NextResponse.json({ list: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
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

  await prisma.readingList.delete({
    where: { id }
  });

  return NextResponse.json({ ok: true });
}
