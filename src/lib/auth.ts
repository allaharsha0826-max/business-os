import { cookies } from "next/headers";
import { adminPassword, adminToken, tokensMatch } from "./secrets";

export const ADMIN_COOKIE = "bos_admin";

export async function isAdmin() {
  const password = adminPassword();
  const jar = await cookies();
  const presented = jar.get(ADMIN_COOKIE)?.value;
  if (!presented) return false;
  return tokensMatch(presented, adminToken(password));
}

export function adminCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: false,
    maxAge: 60 * 60 * 12,
  };
}
