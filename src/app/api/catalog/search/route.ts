import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { searchCatalog } from "@/lib/catalog-search";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("query") ?? "").trim();

  if (query.length < 2) {
    return NextResponse.json({ error: "Query must be at least 2 characters" }, { status: 400 });
  }

  const merged = await searchCatalog(query, 30);

  return NextResponse.json({ items: merged });
}
