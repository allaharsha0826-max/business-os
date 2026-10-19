import { NextResponse } from "next/server";
import { openApiDocument } from "@/lib/openapi";
import { requestOrigin } from "@/lib/origin";
import { botApiKey, presentedBotKey, tokensMatch } from "@/lib/secrets";
import {
  audit,
  bookSession,
  chiefOfStaffSummary,
  createCampaign,
  createJob,
  createLead,
  enforceBotsRunning,
  listApplicants,
  listCampaigns,
  listJobs,
  listLeads,
  listTickets,
  logActivity,
  lookupFamily,
  paymentStatus,
  publicPricing,
  queueApproval,
  replyTicket,
  sessionsForBot,
  setLeadStatus,
  BOTS,
} from "@/lib/store";

export const runtime = "nodejs";

async function guard(request: Request) {
  const presented = presentedBotKey((name) => request.headers.get(name));
  const expected = botApiKey();
  if (!presented || !tokensMatch(presented, expected)) {
    return NextResponse.json(
      { ok: false, error: "unauthorized", message: "Send the BOT_API_KEY in the x-bot-api-key header." },
      { status: 401 },
    );
  }
  const gate = await enforceBotsRunning(new URL(request.url).pathname);
  if (!gate.ok) {
    return NextResponse.json({ ok: false, error: "bots_paused", message: gate.message }, { status: 423 });
  }
  return null;
}

async function readBody(request: Request) {
  return (await request.json().catch(() => ({}))) as Record<string, unknown>;
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

export async function GET(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const denied = await guard(request);
  if (denied) return denied;
  const { path } = await context.params;
  const url = new URL(request.url);
  const origin = await requestOrigin();
  const key = path.join("/");

  if (key === "openapi.json") return NextResponse.json(openApiDocument(origin));
  if (key === "summary") return NextResponse.json(await chiefOfStaffSummary(origin));
  if (key === "pricing" || key === "faq") return NextResponse.json(await publicPricing(origin));
  if (key === "families") {
    const email = url.searchParams.get("email") ?? "";
    if (!email) return NextResponse.json({ ok: false, message: "Pass email." }, { status: 400 });
    const family = await lookupFamily(email);
    if (!family) return NextResponse.json({ ok: false, error: "not_found", message: "No family with that email." }, { status: 404 });
    return NextResponse.json({ ok: true, family });
  }
  if (key === "leads") return NextResponse.json({ ok: true, leads: await listLeads() });
  if (key === "campaigns") return NextResponse.json({ ok: true, campaigns: await listCampaigns() });
  if (key === "tickets") return NextResponse.json({ ok: true, tickets: await listTickets() });
  if (key === "jobs") return NextResponse.json({ ok: true, jobs: await listJobs() });
  if (key === "applicants") return NextResponse.json({ ok: true, applicants: await listApplicants() });
  if (key === "bookings" || key === "sessions") {
    return NextResponse.json({
      ok: true,
      sessions: await sessionsForBot({
        email: url.searchParams.get("email") ?? undefined,
        status: url.searchParams.get("status") ?? undefined,
      }),
    });
  }
  if (key === "invoices" || key === "payments") {
    return NextResponse.json({
      ok: true,
      payments: await paymentStatus({
        invoiceId: url.searchParams.get("invoice_id") ?? undefined,
        email: url.searchParams.get("email") ?? undefined,
      }),
    });
  }
  return NextResponse.json({ ok: false, message: "Unknown bot endpoint." }, { status: 404 });
}

export async function POST(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const denied = await guard(request);
  if (denied) return denied;
  const { path } = await context.params;
  const body = await readBody(request);
  const origin = await requestOrigin();

  if (path[0] === "leads" && path.length === 1) {
    const result = await createLead({
      name: text(body.name),
      email: text(body.email),
      source: text(body.source) || "bot",
      notes: text(body.notes),
      status: text(body.status),
    });
    return NextResponse.json(result, { status: result.ok ? 201 : 400 });
  }
  if (path[0] === "leads" && path[2] === "status") {
    const result = await setLeadStatus(path[1], text(body.status));
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  }
  if (path[0] === "campaigns" && path.length === 1) {
    const result = await createCampaign({
      title: text(body.title),
      channel: text(body.channel),
      body: text(body.body),
      status: text(body.status) || "draft",
      fromBot: true,
    });
    return NextResponse.json(result, { status: result.ok ? 201 : 400 });
  }
  if (path[0] === "tickets" && path[2] === "replies") {
    const result = await replyTicket(path[1], text(body.body), "support", text(body.status));
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  }
  if (path[0] === "jobs" && path.length === 1) {
    const result = await createJob({ title: text(body.title), team: text(body.team), description: text(body.description) });
    return NextResponse.json(result, { status: result.ok ? 201 : 400 });
  }
  if (path[0] === "bookings" && path.length === 1) {
    const result = await bookSession({
      slug: text(body.slug) || "maya-tutor",
      startsAt: text(body.starts_at || body.startsAt),
      parentName: text(body.parent_name || body.parentName),
      parentEmail: text(body.parent_email || body.parentEmail),
      parentPhone: text(body.parent_phone || body.parentPhone),
      studentName: text(body.student_name || body.studentName),
      studentGrade: text(body.student_grade || body.studentGrade),
      notes: text(body.notes),
    });
    return NextResponse.json(result, { status: result.ok ? 201 : 400 });
  }
  if (path[0] === "approvals") {
    const bot = text(body.bot) || "sales";
    if (!BOTS.includes(bot as (typeof BOTS)[number])) {
      return NextResponse.json({ ok: false, message: "bot must be sales, support, ops, marketing, or hr." }, { status: 400 });
    }
    const result = await queueApproval(
      {
        bot,
        department: text(body.department) || bot,
        kind: text(body.kind) || "other",
        customer: text(body.customer),
        request: text(body.request),
        recommendation: text(body.recommendation),
        targetId: text(body.target_id) || null,
      },
      { fromBot: true },
    );
    return NextResponse.json(result, { status: result.ok ? 201 : result.error === "bots_paused" ? 423 : 400 });
  }
  if (path[0] === "activity" || path[0] === "log") {
    const bot = text(body.bot);
    if (!BOTS.includes(bot as (typeof BOTS)[number])) {
      return NextResponse.json({ ok: false, message: "bot must be sales, support, ops, marketing, or hr." }, { status: 400 });
    }
    const summary = text(body.summary);
    if (!summary) return NextResponse.json({ ok: false, message: "summary is required." }, { status: 400 });
    const id = await logActivity({
      bot,
      department: text(body.department) || bot,
      action: text(body.action) || "note",
      summary,
      target: text(body.target) || null,
    });
    await audit(bot, text(body.action) || "note", text(body.target) || bot, { summary });
    return NextResponse.json({ ok: true, id }, { status: 201 });
  }
  return NextResponse.json({ ok: false, message: "Unknown bot endpoint.", origin }, { status: 404 });
}
