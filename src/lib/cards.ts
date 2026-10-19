export const DEMO_SUCCESS_CARD = "4242424242424242";
export const DEMO_DECLINE_CARD = "4000000000000002";

export function normalizeCard(value: string) {
  return value.replace(/\D/g, "");
}

export function classifyDemoCard(value: string): "success" | "decline" | "unknown" {
  const digits = normalizeCard(value);
  if (digits === DEMO_SUCCESS_CARD) return "success";
  if (digits === DEMO_DECLINE_CARD) return "decline";
  return "unknown";
}

export function formatCardInput(value: string) {
  const digits = normalizeCard(value).slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}
