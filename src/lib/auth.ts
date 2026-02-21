import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { cache } from "react";

export const getCurrentUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user || !user.email) {
    return null;
  }

  const existingUser = await prisma.user.findUnique({ where: { id: user.id } });

  if (!existingUser) {
    return prisma.user.create({
      data: {
        id: user.id,
        login: user.email,
        passwordHash: "SUPABASE_AUTH"
      }
    });
  }

  if (existingUser.login !== user.email) {
    return prisma.user.update({
      where: { id: user.id },
      data: { login: user.email }
    });
  }

  return existingUser;
});
