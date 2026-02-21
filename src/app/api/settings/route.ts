import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  monHours: z.number().min(0).max(24),
  tueHours: z.number().min(0).max(24),
  wedHours: z.number().min(0).max(24),
  thuHours: z.number().min(0).max(24),
  friHours: z.number().min(0).max(24),
  satHours: z.number().min(0).max(24),
  sunHours: z.number().min(0).max(24)
});

const DEFAULT_SETTINGS = {
  monHours: 1,
  tueHours: 1,
  wedHours: 1,
  thuHours: 1,
  friHours: 1,
  satHours: 1,
  sunHours: 1
};

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await prisma.userSettings.findUnique({ where: { userId: user.id } });
  return NextResponse.json({ settings: settings ?? DEFAULT_SETTINGS });
}

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

  const settings = await prisma.userSettings.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...parsed.data },
    update: parsed.data
  });

  return NextResponse.json({ settings });
}
