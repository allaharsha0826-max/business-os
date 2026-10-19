import { NextResponse } from "next/server";
import { ADMIN_COOKIE, adminCookieOptions } from "@/lib/auth";
import { requestOrigin } from "@/lib/origin";
import { adminPassword, adminToken, safeNextPath, tokensMatch } from "@/lib/secrets";

export async function POST(request: Request) {
  const form = await request.formData();
  const password = String(form.get("password") ?? "");
  const next = safeNextPath(String(form.get("next") ?? "/os"));
  const origin = await requestOrigin();
  if (!tokensMatch(password, adminPassword())) {
    return NextResponse.redirect(new URL(`/login?error=1&next=${encodeURIComponent(next)}`, origin), 303);
  }
  const response = NextResponse.redirect(new URL(next, origin), 303);
  response.cookies.set(ADMIN_COOKIE, adminToken(adminPassword()), adminCookieOptions());
  return response;
}
