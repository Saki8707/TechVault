import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveTagHref, TAG_DISPLAY_INCLUDE } from "@/lib/tags";

export async function GET(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const decoded = decodeURIComponent(name);

  const tag = await prisma.tag.findUnique({
    where: { name: decoded },
    include: TAG_DISPLAY_INCLUDE,
  });

  const href = tag
    ? resolveTagHref(tag).href
    : `/pretraga?q=${encodeURIComponent(decoded)}`;

  // Ne oslanjati se na req.nextUrl/req.url origin - kad je server pokrenut sa -H 0.0.0.0
  // (samo-hostovano, bez javnog domena) ta vrednost zna da bude pogresna (bind adresa
  // umesto stvarnog hosta). Isti princip kao trustHost u auth.ts - koristi Host header.
  if (/^https?:\/\//i.test(href)) {
    return NextResponse.redirect(href);
  }
  const proto = req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "");
  const host = req.headers.get("host") ?? req.nextUrl.host;
  return NextResponse.redirect(`${proto}://${host}${href}`);
}
