import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { searchAll, getPopularSearches } from "@/lib/search";
import { getSectionPath } from "@/lib/sections";
import { getAccessibleSections } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q") ?? "";

  if (q.trim().length < 2) {
    const popular = await getPopularSearches(session.user.id);
    return NextResponse.json({ results: [], popular });
  }

  const { readable } = await getAccessibleSections({
    id: session.user.id,
    role: session.user.role,
  });
  const results = await searchAll(q, readable === "all" ? null : readable, 8);

  const withPaths = await Promise.all(
    results.map(async (r) => {
      const sectionId = r.type === "article" ? r.sectionId : r.id;
      const path = await getSectionPath(sectionId);
      return { ...r, pathNames: path.map((p) => p.name) };
    }),
  );

  return NextResponse.json({ results: withPaths, popular: null });
}
