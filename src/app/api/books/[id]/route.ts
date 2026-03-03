import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as {
    rating?: unknown;
    reviewComment?: unknown;
  } | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const normalizedRating =
    body.rating === null || body.rating === undefined ? null : Number(body.rating);

  if (
    normalizedRating !== null &&
    (!Number.isInteger(normalizedRating) || normalizedRating < 1 || normalizedRating > 5)
  ) {
    return NextResponse.json({ error: "Rating must be an integer from 1 to 5" }, { status: 400 });
  }

  const normalizedComment =
    typeof body.reviewComment === "string" ? body.reviewComment.trim() : "";

  if (normalizedComment.length > 2000) {
    return NextResponse.json({ error: "Comment is too long (max 2000 chars)" }, { status: 400 });
  }

  const updated = await prisma.book.updateMany({
    where: {
      id,
      userId: user.id
    },
    data: {
      rating: normalizedRating,
      reviewComment: normalizedComment.length > 0 ? normalizedComment : null
    }
  });

  if (updated.count === 0) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    rating: normalizedRating,
    reviewComment: normalizedComment.length > 0 ? normalizedComment : null
  });
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

  const deleted = await prisma.book.deleteMany({
    where: {
      id,
      userId: user.id
    }
  });

  if (deleted.count === 0) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
