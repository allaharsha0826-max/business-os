import { NextResponse } from "next/server";
import { stripeMode } from "@/lib/secrets";
import { botsPaused } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  const payments = stripeMode();
  return NextResponse.json({
    ok: true,
    bots: (await botsPaused()) ? "paused" : "running",
    payments: payments === "test" ? "stripe_test" : payments,
  });
}
