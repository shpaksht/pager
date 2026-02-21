import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const schema = z.object({
  login: z.string().email("Enter a valid email").max(120),
  password: z.string().min(6).max(100)
});

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = schema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.login,
    password: parsed.data.password
  });

  if (error || !data.user?.email) {
    return NextResponse.json({ error: error?.message ?? "Invalid email or password" }, { status: 401 });
  }

  await prisma.user.upsert({
    where: { id: data.user.id },
    update: { login: data.user.email },
    create: {
      id: data.user.id,
      login: data.user.email,
      passwordHash: "SUPABASE_AUTH"
    }
  });

  return NextResponse.json({ ok: true });
}
