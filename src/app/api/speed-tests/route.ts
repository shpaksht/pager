import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  textWordCount: z.number().int().positive(),
  secondsSpent: z.number().int().positive()
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const parsed = schema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const wordsPerMin = (parsed.data.textWordCount / parsed.data.secondsSpent) * 60;

  const test = await prisma.readingSpeedTest.create({
    data: {
      userId: user.id,
      textWordCount: parsed.data.textWordCount,
      secondsSpent: parsed.data.secondsSpent,
      wordsPerMin
    }
  });

  return NextResponse.json({ test });
}
