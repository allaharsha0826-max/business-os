import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/lib/auth";
import { requestOrigin } from "@/lib/origin";

export async function POST() {
  const response = NextResponse.redirect(new URL("/", await requestOrigin()), 303);
  response.cookies.set(ADMIN_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
