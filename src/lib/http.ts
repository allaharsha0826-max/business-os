import { NextResponse } from "next/server";
import { requestOrigin } from "./origin";
import { safeNextPath } from "./secrets";

export async function redirectBack(path: string, notice?: { toast?: string; error?: string }) {
  const url = new URL(safeNextPath(path.startsWith("/") ? path : "/os"), await requestOrigin());
  if (notice?.toast) url.searchParams.set("toast", notice.toast);
  if (notice?.error) url.searchParams.set("error", notice.error);
  return NextResponse.redirect(url, 303);
}

export function jsonError(message: string, status: number, error = "error") {
  return NextResponse.json({ ok: false, error, message }, { status });
}
