import { createHmac, timingSafeEqual } from "crypto";

const TOKEN_LABEL = "business-os-admin-v1";

export function adminPassword() {
  return process.env.ADMIN_PASSWORD?.trim() || "demo";
}

export function usingDefaultAdminPassword() {
  return !process.env.ADMIN_PASSWORD?.trim();
}

export function adminToken(password: string) {
  return createHmac("sha256", password).update(TOKEN_LABEL).digest("hex");
}

export function tokensMatch(presented: string, expected: string) {
  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function botApiKey() {
  return process.env.BOT_API_KEY?.trim() || process.env.BOT_TOKEN?.trim() || "dev-bot-key";
}

export function usingDefaultBotKey() {
  return !process.env.BOT_API_KEY?.trim() && !process.env.BOT_TOKEN?.trim();
}

export function presentedBotKey(header: (name: string) => string | null) {
  const authorization = header("authorization");
  const bearer = authorization?.toLowerCase().startsWith("bearer ")
    ? authorization.slice(7).trim()
    : null;
  return (
    header("x-bot-api-key") ||
    header("bot-api-key") ||
    header("bot_api_key") ||
    header("x-bot-token") ||
    bearer
  );
}

const LIVE_SECRET = `${"sk"}_${"live"}_`;
const LIVE_RESTRICTED = `${"rk"}_${"live"}_`;

export type StripeMode = "missing" | "test" | "refused";

export function stripeMode(): StripeMode {
  const key = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
  if (!key) return "missing";
  if (key.startsWith("sk_test_")) return "test";
  return "refused";
}

export function stripeRefusalMessage() {
  const mode = stripeMode();
  if (mode === "test") return null;
  const key = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
  if (!key) {
    return "Stripe is not configured. Set STRIPE_SECRET_KEY to a test key that starts with sk_test_. Payment was not started.";
  }
  if (key.startsWith(LIVE_SECRET) || key.startsWith(LIVE_RESTRICTED)) {
    return "Refusing to start a payment. This Stripe key is a live-mode key. Business OS only runs Stripe in test mode, and the key must start with sk_test_.";
  }
  return "Refusing to start a payment. STRIPE_SECRET_KEY must start with sk_test_. Payment was not started.";
}

export function safeNextPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/os";
  }
  return value;
}
