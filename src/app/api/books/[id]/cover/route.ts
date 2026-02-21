import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const book = await prisma.book.findFirst({
    where: { id, userId: user.id },
    select: {
      coverData: true,
      coverMime: true
    }
  });

  if (!book || !book.coverData || !book.coverMime) {
    return NextResponse.json({ error: "Cover not found" }, { status: 404 });
  }

  return new NextResponse(Buffer.from(book.coverData), {
    status: 200,
    headers: {
      "Content-Type": book.coverMime,
      "Cache-Control": "public, max-age=86400"
    }
  });
}
