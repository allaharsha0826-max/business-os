import { randomUUID } from "crypto";
import { classifyDemoCard } from "./cards";
import { all, isUniqueError, one, ready, run, wipe } from "./db";
import { digestBody, dunningBody, HOLDING_REPLY, parentUpdateBody } from "./messages";
import { PLAN, pricingPayload, SESSION_OFFER, SLOT_TIMES } from "./plan";
import { stripeMode, stripeRefusalMessage } from "./secrets";
import { addDays, zonedLocalToUtc, zonedParts } from "./time";

type Row = Record<string, unknown>;

export function rid(prefix: string) {
  return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function text(value: unknown) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

export const LEAD_STATUSES = ["new", "contacted", "trial", "won", "lost"] as const;
export const CAMPAIGN_STATUSES = ["draft", "needs_approval", "approved", "scheduled"] as const;
export const TICKET_STATUSES = ["open", "answered", "escalated"] as const;
export const BOTS = ["sales", "support", "ops", "marketing", "hr"] as const;

async function q<T = Row>(sql: string, params: unknown[] = []) {
  await ready();
  return all<T>(sql, params);
}

async function q1<T = Row>(sql: string, params: unknown[] = []) {
  await ready();
  return one<T>(sql, params);
}

export async function audit(actor: string, action: string, target: string, details: Record<string, unknown>) {
  await ready();
  await run(
    `INSERT INTO audit_log (id, actor, action, target, details_json, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [rid("aud"), actor, action, target, JSON.stringify(details), nowIso()],
  );
}

export async function logActivity(input: {
  bot: string;
  department: string;
  action: string;
  summary: string;
  target?: string | null;
}) {
  await ready();
  const id = rid("act");
  await run(
    `INSERT INTO activity_log (id, bot, department, action, summary, target, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, input.bot, input.department, input.action, input.summary.slice(0, 500), input.target ?? null, nowIso()],
  );
  return id;
}

async function insertOutbox(input: {
  kind: string;
  toEmail: string;
  subject: string;
  body: string;
  relatedId?: string | null;
  key: string;
}) {
  const inserted = await run(
    `INSERT INTO outbox (id, kind, to_email, subject, body, related_id, idempotency_key, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(idempotency_key) DO NOTHING`,
    [rid("out"), input.kind, input.toEmail, input.subject, input.body, input.relatedId ?? null, input.key, nowIso()],
  );
  return inserted.changes > 0;
}

export async function botsPaused() {
  const row = await q1<{ value: string }>(`SELECT value FROM settings WHERE key = 'bots_paused'`);
  return row?.value === "1";
}

export async function setBotsPaused(paused: boolean) {
  await ready();
  await run(
    `INSERT INTO settings (key, value) VALUES ('bots_paused', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [paused ? "1" : "0"],
  );
  await audit("founder", paused ? "bots_paused" : "bots_resumed", "settings", {});
  await logActivity({
    bot: "system",
    department: "ops",
    action: paused ? "bots_paused" : "bots_resumed",
    summary: paused ? "Founder paused the bots." : "Founder turned the bots back on.",
  });
}

export async function enforceBotsRunning(path: string) {
  if (!(await botsPaused())) return { ok: true as const };
  await audit("system", "bot_call_refused", path, { reason: "bots_paused" });
  await logActivity({
    bot: "system",
    department: "ops",
    action: "bot_call_refused",
    summary: `Kill switch refused ${path}.`,
    target: path,
  });
  return { ok: false as const, message: "Bots are paused. This call was refused and logged." };
}

export async function getTutor(slug: string) {
  return q1(`SELECT * FROM tutors WHERE slug = ?`, [slug]);
}

export async function listOpenSlots(slug: string) {
  const tutor = await getTutor(slug);
  if (!tutor) return null;
  const taken = await q<{ starts_at: string }>(
    `SELECT starts_at FROM sessions WHERE tutor_id = ? AND status != 'canceled'`,
    [tutor.id],
  );
  const takenSet = new Set(taken.map((row) => row.starts_at));
  const timeZone = text(tutor.timezone);
  const today = zonedParts(new Date(), timeZone).ymd;
  const slots: { startsAt: string; endsAt: string }[] = [];
  for (let day = 0; day < 12 && slots.length < 16; day += 1) {
    const ymd = addDays(today, day);
    const weekday = zonedParts(zonedLocalToUtc(ymd, "12:00", timeZone), timeZone).weekday;
    if (weekday === "Sat" || weekday === "Sun") continue;
    for (const hm of SLOT_TIMES) {
      const start = zonedLocalToUtc(ymd, hm, timeZone);
      if (start.getTime() < Date.now() + 30 * 60 * 1000) continue;
      const startsAt = start.toISOString();
      if (takenSet.has(startsAt)) continue;
      slots.push({ startsAt, endsAt: new Date(start.getTime() + 60 * 60 * 1000).toISOString() });
    }
  }
  return { tutor, slots };
}

export async function bookSession(input: {
  slug: string;
  startsAt: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  studentName: string;
  studentGrade: string;
  notes?: string;
}) {
  const open = await listOpenSlots(input.slug);
  if (!open) return { ok: false as const, error: "not_found", message: "That booking page does not exist." };
  const parentName = input.parentName.trim().slice(0, 120);
  const parentEmail = input.parentEmail.trim().slice(0, 160);
  const parentPhone = input.parentPhone.trim().slice(0, 40);
  const studentName = input.studentName.trim().slice(0, 120);
  const studentGrade = input.studentGrade.trim().slice(0, 20);
  const notes = (input.notes ?? "").trim().slice(0, 500);
  if (!parentName || !parentPhone || !studentName || !studentGrade) {
    return { ok: false as const, error: "invalid", message: "Add the parent and student details." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail)) {
    return { ok: false as const, error: "invalid", message: "Enter a parent email." };
  }
  const slot = open.slots.find((item) => item.startsAt === input.startsAt);
  if (!slot) {
    return { ok: false as const, error: "slot_unavailable", message: "That time was just taken or is no longer open. Pick another." };
  }
  const tutor = open.tutor;
  let family = await q1<{ id: string }>(
    `SELECT id FROM families WHERE tutor_id = ? AND lower(parent_email) = lower(?)`,
    [tutor.id, parentEmail],
  );
  if (!family) {
    const familyId = rid("fam");
    await run(
      `INSERT INTO families (id, tutor_id, parent_name, parent_email, parent_phone) VALUES (?, ?, ?, ?, ?)`,
      [familyId, tutor.id, parentName, parentEmail, parentPhone],
    );
    family = { id: familyId };
  } else {
    await run(`UPDATE families SET parent_name = ?, parent_phone = ? WHERE id = ?`, [parentName, parentPhone, family.id]);
  }
  let student = await q1<{ id: string }>(
    `SELECT id FROM students WHERE family_id = ? AND lower(name) = lower(?)`,
    [family.id, studentName],
  );
  if (!student) {
    const studentId = rid("stu");
    await run(
      `INSERT INTO students (id, family_id, tutor_id, name, grade, subjects) VALUES (?, ?, ?, ?, ?, ?)`,
      [studentId, family.id, tutor.id, studentName, studentGrade, "SAT Math"],
    );
    student = { id: studentId };
  }
  const sessionId = rid("ses");
  try {
    await run(
      `INSERT INTO sessions (
        id, tutor_id, family_id, student_id, session_type, starts_at, ends_at, price_cents, status,
        parent_name, parent_email, parent_phone, student_name, student_grade, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'booked', ?, ?, ?, ?, ?, ?, ?)`,
      [
        sessionId,
        tutor.id,
        family.id,
        student.id,
        SESSION_OFFER.name,
        slot.startsAt,
        slot.endsAt,
        SESSION_OFFER.priceCents,
        parentName,
        parentEmail,
        parentPhone,
        studentName,
        studentGrade,
        notes,
        nowIso(),
      ],
    );
  } catch (error) {
    if (isUniqueError(error)) {
      return { ok: false as const, error: "slot_unavailable", message: "That time was just booked. Pick another." };
    }
    throw error;
  }
  await audit("parent", "booking_confirmed", sessionId, { student: studentName, starts_at: slot.startsAt });
  await logActivity({
    bot: "ops",
    department: "bookings",
    action: "booking_confirmed",
    summary: `${studentName} booked ${SESSION_OFFER.label}.`,
    target: sessionId,
  });
  return { ok: true as const, sessionId };
}

export async function getSession(id: string) {
  return q1(`SELECT * FROM sessions WHERE id = ?`, [id]);
}

export async function listSessions() {
  return q(`SELECT * FROM sessions ORDER BY starts_at ASC`);
}

async function nextInvoiceNumber() {
  const rows = await q<{ number: string }>(`SELECT number FROM invoices`);
  let max = 1000;
  for (const row of rows) {
    const value = Number(String(row.number).replace(/\D/g, ""));
    if (value > max) max = value;
  }
  return `INV-${max + 1}`;
}

export async function getInvoice(id: string) {
  return q1(
    `SELECT invoices.*, sessions.parent_email, sessions.parent_name, sessions.student_name, sessions.session_type, sessions.starts_at, sessions.student_grade
     FROM invoices JOIN sessions ON sessions.id = invoices.session_id WHERE invoices.id = ?`,
    [id],
  );
}

export async function listInvoices() {
  return q(
    `SELECT invoices.*, sessions.parent_name, sessions.student_name, sessions.session_type, sessions.starts_at
     FROM invoices JOIN sessions ON sessions.id = invoices.session_id ORDER BY invoices.created_at DESC`,
  );
}

export async function markSessionDone(
  sessionId: string,
  notes: { covered: string; wentWell: string; nextFocus: string },
  origin: string,
) {
  const session = await q1<Row>(`SELECT * FROM sessions WHERE id = ?`, [sessionId]);
  if (!session) return { ok: false as const, message: "Session not found." };
  const covered = notes.covered.trim().slice(0, 600);
  const wentWell = notes.wentWell.trim().slice(0, 600);
  const nextFocus = notes.nextFocus.trim().slice(0, 600);
  if (text(session.status) === "done") {
    const invoice = await q1(`SELECT * FROM invoices WHERE session_id = ?`, [sessionId]);
    return { ok: true as const, already: true, invoiceId: text(invoice?.id), number: text(invoice?.number) };
  }
  if (text(session.status) !== "booked") return { ok: false as const, message: "Only a booked session can be marked done." };
  if (!covered || !wentWell || !nextFocus) {
    return { ok: false as const, message: "Add what you covered, what went well, and the next focus." };
  }
  await run(
    `UPDATE sessions SET status = 'done', covered = ?, went_well = ?, next_focus = ? WHERE id = ?`,
    [covered, wentWell, nextFocus, sessionId],
  );
  const invoiceId = rid("inv");
  const number = await nextInvoiceNumber();
  const created = nowIso();
  const due = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  try {
    await run(
      `INSERT INTO invoices (id, tutor_id, family_id, session_id, number, amount_cents, status, due_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'open', ?, ?)`,
      [invoiceId, session.tutor_id, session.family_id, sessionId, number, session.price_cents, due, created],
    );
  } catch (error) {
    if (!isUniqueError(error)) throw error;
  }
  const invoice = await getInvoice(text((await q1(`SELECT id FROM invoices WHERE session_id = ?`, [sessionId]))?.id));
  const tutor = await q1(`SELECT * FROM tutors WHERE id = ?`, [session.tutor_id]);
  const finalId = text(invoice?.id);
  await insertOutbox({
    kind: "parent_update",
    toEmail: text(session.parent_email),
    subject: `${text(tutor?.name).split(" ")[0]}'s SAT Math session: today's update`,
    body: parentUpdateBody({
      parentName: text(session.parent_name).split(" ")[0] || "there",
      studentName: text(session.student_name),
      sessionType: text(session.session_type),
      startsAt: text(session.starts_at),
      timeZone: text(tutor?.timezone || "America/Chicago"),
      covered,
      wentWell,
      nextFocus,
      tutorName: text(tutor?.name || "Maya Chen"),
      payUrl: `${origin}/invoice/${finalId}`,
    }),
    relatedId: sessionId,
    key: `update:${sessionId}`,
  });
  await audit("founder", "session_marked_done", sessionId, { invoice: text(invoice?.number) });
  await logActivity({
    bot: "ops",
    department: "bookings",
    action: "session_marked_done",
    summary: `${text(session.student_name)}'s session is done. Invoice ${text(invoice?.number)} is open.`,
    target: finalId,
  });
  return { ok: true as const, already: false, invoiceId: finalId, number: text(invoice?.number) };
}

async function findInvoice(input: { invoiceId?: string; stripeSessionId?: string; paymentIntentId?: string }) {
  if (input.invoiceId) {
    const row = await getInvoice(input.invoiceId);
    if (row) return row;
  }
  if (input.stripeSessionId) {
    const row = await q1<{ id: string }>(`SELECT id FROM invoices WHERE stripe_session_id = ?`, [input.stripeSessionId]);
    if (row) return getInvoice(row.id);
  }
  if (input.paymentIntentId) {
    const row = await q1<{ id: string }>(`SELECT id FROM invoices WHERE stripe_payment_intent_id = ?`, [input.paymentIntentId]);
    if (row) return getInvoice(row.id);
  }
  return undefined;
}

export async function markInvoicePaid(input: {
  invoiceId?: string;
  stripeSessionId?: string;
  paymentIntentId?: string;
  source: string;
}) {
  const invoice = await findInvoice(input);
  if (!invoice) return { ok: false as const, message: "Invoice not found." };
  if (text(invoice.status) === "paid") return { ok: true as const, already: true, invoiceId: text(invoice.id) };
  await run(
    `UPDATE invoices SET status = 'paid', paid_at = ?, failure_reason = NULL,
      stripe_session_id = COALESCE(?, stripe_session_id),
      stripe_payment_intent_id = COALESCE(?, stripe_payment_intent_id)
     WHERE id = ?`,
    [nowIso(), input.stripeSessionId ?? null, input.paymentIntentId ?? null, invoice.id],
  );
  await audit("ops", "invoice_paid", text(invoice.id), { source: input.source, number: invoice.number });
  await logActivity({
    bot: "ops",
    department: "finance",
    action: "invoice_paid",
    summary: `${text(invoice.number)} is paid (${input.source}). No real money moved in demo mode.`,
    target: text(invoice.id),
  });
  return { ok: true as const, invoiceId: text(invoice.id) };
}

export async function markInvoiceFailed(input: {
  invoiceId?: string;
  stripeSessionId?: string;
  paymentIntentId?: string;
  reason: string;
  source: string;
}) {
  const invoice = await findInvoice(input);
  if (!invoice) return { ok: false as const, message: "Invoice not found." };
  if (text(invoice.status) === "paid") {
    await audit("ops", "payment_failed_ignored", text(invoice.id), { reason: "already paid", source: input.source });
    return { ok: true as const, ignored: true, invoiceId: text(invoice.id) };
  }
  await run(
    `UPDATE invoices SET status = 'failed', failure_reason = ?,
      stripe_session_id = COALESCE(?, stripe_session_id),
      stripe_payment_intent_id = COALESCE(?, stripe_payment_intent_id)
     WHERE id = ?`,
    [input.reason, input.stripeSessionId ?? null, input.paymentIntentId ?? null, invoice.id],
  );
  const tutor = await q1(`SELECT * FROM tutors LIMIT 1`);
  const wrote = await insertOutbox({
    kind: "dunning",
    toEmail: text(invoice.parent_email),
    subject: `Payment didn't go through for ${text(invoice.student_name)}'s SAT Math session`,
    body: dunningBody({
      parentName: text(invoice.parent_name).split(" ")[0] || "there",
      studentName: text(invoice.student_name),
      invoiceNumber: text(invoice.number),
      amountCents: Number(invoice.amount_cents),
      reason: input.reason,
      payUrl: `/invoice/${text(invoice.id)}`,
      tutorName: text(tutor?.name || "Maya Chen"),
    }),
    relatedId: text(invoice.id),
    key: `dunning:${text(invoice.id)}`,
  });
  if (wrote) {
    await insertOutbox({
      kind: "digest",
      toEmail: text(tutor?.email || "maya.chen@example.com"),
      subject: "Ops digest line",
      body: digestBody({
        invoiceNumber: text(invoice.number),
        amountCents: Number(invoice.amount_cents),
        parentName: text(invoice.parent_name),
        reason: input.reason,
      }),
      relatedId: text(invoice.id),
      key: `digest:${text(invoice.id)}`,
    });
    await audit("ops", "payment failed logged", text(invoice.id), {
      source: input.source,
      reason: input.reason,
      number: invoice.number,
    });
    await logActivity({
      bot: "ops",
      department: "finance",
      action: "payment_failed",
      summary: `ops: payment failed logged for ${text(invoice.number)}. Dunning drafted. No retry charge.`,
      target: text(invoice.id),
    });
  }
  return { ok: true as const, invoiceId: text(invoice.id), dunningCreated: wrote };
}

function metaOf(obj: Record<string, unknown>) {
  const metadata = obj.metadata && typeof obj.metadata === "object" ? (obj.metadata as Record<string, unknown>) : {};
  return {
    invoiceId: text(metadata.invoiceId) || text(obj.client_reference_id),
    planPaymentId: text(metadata.planPaymentId),
    kind: text(metadata.kind),
  };
}

function nestedId(value: unknown) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "id" in value && typeof (value as { id: unknown }).id === "string") {
    return (value as { id: string }).id;
  }
  return "";
}

export async function handleStripeEvent(event: { id: string; type: string; data: { object: Record<string, unknown> } }) {
  const obj = event.data.object;
  const meta = metaOf(obj);
  const paymentIntentId = event.type.startsWith("payment_intent") ? text(obj.id) : nestedId(obj.payment_intent);
  const stripeSessionId = event.type.startsWith("checkout.session") ? text(obj.id) : "";
  if (event.type === "checkout.session.completed" && (obj.payment_status === "paid" || obj.payment_status === "no_payment_required")) {
    if (meta.kind === "plan" || meta.planPaymentId) {
      return markPlanPaid(meta.planPaymentId, "stripe", stripeSessionId, paymentIntentId);
    }
    return markInvoicePaid({ invoiceId: meta.invoiceId, stripeSessionId, paymentIntentId, source: "stripe" });
  }
  if (
    event.type === "payment_intent.payment_failed" ||
    event.type === "checkout.session.async_payment_failed" ||
    event.type === "charge.failed"
  ) {
    const reason = text((obj.last_payment_error as { message?: string } | undefined)?.message) || "Your card was declined.";
    if (meta.kind === "plan" || meta.planPaymentId) {
      return markPlanFailed(meta.planPaymentId, reason);
    }
    return markInvoiceFailed({
      invoiceId: meta.invoiceId,
      stripeSessionId,
      paymentIntentId,
      reason,
      source: "stripe",
    });
  }
  return { ok: true as const, ignored: true };
}

export async function startInvoiceCheckout(invoiceId: string, origin: string) {
  const invoice = await getInvoice(invoiceId);
  if (!invoice) return { ok: false as const, message: "Invoice not found." };
  if (text(invoice.status) === "paid") return { ok: false as const, message: "This invoice is already paid." };
  const mode = stripeMode();
  if (mode === "refused") return { ok: false as const, message: stripeRefusalMessage() || "Stripe key refused." };
  if (mode === "missing") return { ok: true as const, mode: "demo" as const, url: `${origin}/pay/invoice/${invoice.id}` };
  try {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!.trim());
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: text(invoice.parent_email),
      client_reference_id: text(invoice.id),
      success_url: `${origin}/invoice/${invoice.id}?checkout=success`,
      cancel_url: `${origin}/invoice/${invoice.id}?checkout=cancel`,
      metadata: { kind: "invoice", invoiceId: text(invoice.id) },
      payment_intent_data: { metadata: { kind: "invoice", invoiceId: text(invoice.id) } },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: Number(invoice.amount_cents),
            product_data: { name: `${text(invoice.session_type)} · ${text(invoice.student_name)}` },
          },
        },
      ],
    });
    await run(
      `UPDATE invoices SET checkout_url = ?, stripe_session_id = ?, stripe_payment_intent_id = COALESCE(?, stripe_payment_intent_id) WHERE id = ?`,
      [session.url, session.id, typeof session.payment_intent === "string" ? session.payment_intent : null, invoice.id],
    );
    return { ok: true as const, mode: "stripe" as const, url: session.url || "" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stripe request failed.";
    return { ok: false as const, message: `Stripe couldn't start Checkout. ${message}` };
  }
}

export async function syncInvoiceFromStripe(invoiceId: string) {
  const invoice = await getInvoice(invoiceId);
  if (!invoice) return { ok: false as const, message: "Invoice not found." };
  if (stripeMode() !== "test") {
    return { ok: false as const, message: stripeMode() === "missing" ? "Demo mode checks the card on the checkout page, not at Stripe." : stripeRefusalMessage() || "Stripe key refused." };
  }
  if (!text(invoice.stripe_session_id)) return { ok: false as const, message: "Start Checkout before checking Stripe." };
  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!.trim());
  const session = await stripe.checkout.sessions.retrieve(text(invoice.stripe_session_id), { expand: ["payment_intent"] });
  const paymentIntentId = nestedId(session.payment_intent);
  if (session.payment_status === "paid") {
    await markInvoicePaid({ invoiceId, stripeSessionId: session.id, paymentIntentId, source: "stripe" });
    return { ok: true as const, status: "paid" as const };
  }
  const intent = session.payment_intent;
  const reason =
    intent && typeof intent === "object" && "last_payment_error" in intent
      ? text((intent.last_payment_error as { message?: string } | null)?.message)
      : "";
  if (reason) {
    await markInvoiceFailed({ invoiceId, stripeSessionId: session.id, paymentIntentId, reason, source: "stripe" });
    return { ok: true as const, status: "failed" as const };
  }
  return { ok: true as const, status: text(invoice.status), message: "Stripe has not finished this payment." };
}

export async function createPlanPayment(email: string) {
  const clean = email.trim().slice(0, 160);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return { ok: false as const, message: "Enter an email for the receipt." };
  const id = rid("plan");
  await ready();
  await run(
    `INSERT INTO plan_payments (id, email, amount_cents, status, created_at) VALUES (?, ?, ?, 'open', ?)`,
    [id, clean, PLAN.priceCents, nowIso()],
  );
  return { ok: true as const, id };
}

export async function getPlanPayment(id: string) {
  return q1(`SELECT * FROM plan_payments WHERE id = ?`, [id]);
}

export async function listPlanPayments() {
  return q(`SELECT * FROM plan_payments ORDER BY created_at DESC`);
}

export async function markPlanPaid(id: string, source: string, stripeSessionId = "", paymentIntentId = "") {
  const row = await getPlanPayment(id);
  if (!row) return { ok: false as const, message: "Plan checkout not found." };
  if (text(row.status) === "paid") return { ok: true as const, already: true };
  await run(
    `UPDATE plan_payments SET status = 'paid', paid_at = ?, failure_reason = NULL,
      stripe_session_id = COALESCE(NULLIF(?, ''), stripe_session_id),
      stripe_payment_intent_id = COALESCE(NULLIF(?, ''), stripe_payment_intent_id)
     WHERE id = ?`,
    [nowIso(), stripeSessionId, paymentIntentId, id],
  );
  await audit("ops", "plan_paid", id, { source, email: row.email });
  await logActivity({
    bot: "ops",
    department: "finance",
    action: "plan_paid",
    summary: `Business OS plan checkout for ${text(row.email)} succeeded (${source}).`,
    target: id,
  });
  return { ok: true as const };
}

export async function markPlanFailed(id: string, reason: string) {
  const row = await getPlanPayment(id);
  if (!row) return { ok: false as const, message: "Plan checkout not found." };
  if (text(row.status) === "paid") return { ok: true as const, ignored: true };
  await run(`UPDATE plan_payments SET status = 'failed', failure_reason = ? WHERE id = ?`, [reason, id]);
  await audit("ops", "plan_payment_failed", id, { reason });
  await logActivity({
    bot: "ops",
    department: "finance",
    action: "plan_payment_failed",
    summary: `Business OS plan checkout for ${text(row.email)} was declined.`,
    target: id,
  });
  return { ok: true as const };
}

export async function startPlanCheckout(id: string, origin: string) {
  const row = await getPlanPayment(id);
  if (!row) return { ok: false as const, message: "Plan checkout not found." };
  if (text(row.status) === "paid") return { ok: false as const, message: "This plan checkout is already paid." };
  const mode = stripeMode();
  if (mode === "refused") return { ok: false as const, message: stripeRefusalMessage() || "Stripe key refused." };
  if (mode === "missing") return { ok: true as const, mode: "demo" as const, url: `${origin}/pay/plan/${id}` };
  try {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!.trim());
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: text(row.email),
      success_url: `${origin}/pay/plan/${id}?checkout=success`,
      cancel_url: `${origin}/pricing?checkout=cancel`,
      metadata: { kind: "plan", planPaymentId: id },
      payment_intent_data: { metadata: { kind: "plan", planPaymentId: id } },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: PLAN.priceCents,
            product_data: { name: "Business OS monthly plan (test)" },
          },
        },
      ],
    });
    await run(`UPDATE plan_payments SET stripe_session_id = ? WHERE id = ?`, [session.id, id]);
    return { ok: true as const, mode: "stripe" as const, url: session.url || "" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stripe request failed.";
    return { ok: false as const, message: `Stripe couldn't start Checkout. ${message}` };
  }
}

export async function settleDemoCard(input: {
  target: "invoice" | "plan";
  id: string;
  card: string;
  exp: string;
  cvc: string;
  name: string;
}) {
  if (stripeMode() === "refused") return { ok: false as const, message: stripeRefusalMessage() || "Stripe key refused." };
  if (stripeMode() === "test") {
    return { ok: false as const, message: "A Stripe test key is set. Use Stripe Checkout for this payment." };
  }
  if (!input.name.trim()) return { ok: false as const, message: "Enter the name on the card." };
  const exp = input.exp.trim();
  if (!/^\d{2}\s*\/\s*\d{2}$/.test(exp)) return { ok: false as const, message: "Enter an expiry like 12/34." };
  if (!/^\d{3,4}$/.test(input.cvc.trim())) return { ok: false as const, message: "Enter a 3-digit CVC." };
  const kind = classifyDemoCard(input.card);
  if (kind === "unknown") {
    return {
      ok: false as const,
      message: "Demo mode accepts only 4242 4242 4242 4242 (succeeds) and 4000 0000 0000 0002 (declines). No charge was attempted.",
    };
  }
  if (input.target === "invoice") {
    const invoice = await getInvoice(input.id);
    if (!invoice) return { ok: false as const, message: "Invoice not found." };
    if (kind === "success") {
      await markInvoicePaid({ invoiceId: input.id, source: "demo" });
      return { ok: true as const, status: "paid" as const, message: "Payment succeeded. Demo / test mode, no real money." };
    }
    await markInvoiceFailed({ invoiceId: input.id, reason: "Your card was declined.", source: "demo" });
    return { ok: true as const, status: "failed" as const, message: "Your card was declined." };
  }
  const plan = await getPlanPayment(input.id);
  if (!plan) return { ok: false as const, message: "Plan checkout not found." };
  if (kind === "success") {
    await markPlanPaid(input.id, "demo");
    return { ok: true as const, status: "paid" as const, message: "Payment succeeded. Demo / test mode, no real money." };
  }
  await markPlanFailed(input.id, "Your card was declined.");
  return { ok: true as const, status: "failed" as const, message: "Your card was declined." };
}

export async function listLeads() {
  return q(`SELECT * FROM leads ORDER BY created_at DESC`);
}

export async function createLead(input: { name: string; email: string; source: string; notes?: string; status?: string }) {
  const name = input.name.trim().slice(0, 120);
  const email = input.email.trim().slice(0, 160);
  const source = input.source.trim().slice(0, 80) || "Manual";
  const status = LEAD_STATUSES.includes(input.status as (typeof LEAD_STATUSES)[number]) ? input.status! : "new";
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false as const, message: "Add a name and email." };
  }
  const id = rid("lead");
  await ready();
  await run(
    `INSERT INTO leads (id, name, email, source, status, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, name, email, source, status, (input.notes ?? "").trim().slice(0, 500), nowIso()],
  );
  await logActivity({ bot: "sales", department: "sales", action: "lead_created", summary: `Added lead ${name}.`, target: id });
  return { ok: true as const, id };
}

export async function setLeadStatus(id: string, status: string) {
  if (!LEAD_STATUSES.includes(status as (typeof LEAD_STATUSES)[number])) {
    return { ok: false as const, message: "That lead status is not in the pipeline." };
  }
  const lead = await q1(`SELECT * FROM leads WHERE id = ?`, [id]);
  if (!lead) return { ok: false as const, message: "Lead not found." };
  await run(`UPDATE leads SET status = ? WHERE id = ?`, [status, id]);
  await logActivity({
    bot: "sales",
    department: "sales",
    action: "lead_status",
    summary: `${text(lead.name)} moved to ${status}.`,
    target: id,
  });
  return { ok: true as const };
}

export async function listCampaigns() {
  return q(`SELECT * FROM campaigns ORDER BY created_at DESC`);
}

export async function createCampaign(input: { title: string; channel: string; body: string; status?: string; fromBot?: boolean }) {
  const title = input.title.trim().slice(0, 140);
  const channel = input.channel.trim().slice(0, 40) || "Email";
  const body = input.body.trim().slice(0, 2000);
  if (!title || !body) return { ok: false as const, message: "Add a title and the draft." };
  let status = CAMPAIGN_STATUSES.includes(input.status as (typeof CAMPAIGN_STATUSES)[number]) ? input.status! : "draft";
  if (input.fromBot && (status === "approved" || status === "scheduled")) status = "needs_approval";
  const id = rid("camp");
  await ready();
  await run(`INSERT INTO campaigns (id, title, channel, body, status, created_at) VALUES (?, ?, ?, ?, ?, ?)`, [
    id,
    title,
    channel,
    body,
    status,
    nowIso(),
  ]);
  if (status === "needs_approval") {
    await queueApproval({
      bot: "marketing",
      department: "marketing",
      kind: "campaign",
      customer: channel,
      request: `Approve campaign: ${title}`,
      recommendation: "Read the draft. Approving marks it approved. It does not publish it.",
      targetId: id,
    });
  }
  await logActivity({ bot: "marketing", department: "marketing", action: "campaign_drafted", summary: `Drafted “${title}”.`, target: id });
  return { ok: true as const, id, status };
}

export async function setCampaignStatus(id: string, status: string, fromBot = false) {
  if (!CAMPAIGN_STATUSES.includes(status as (typeof CAMPAIGN_STATUSES)[number])) {
    return { ok: false as const, message: "Unknown campaign status." };
  }
  const row = await q1(`SELECT * FROM campaigns WHERE id = ?`, [id]);
  if (!row) return { ok: false as const, message: "Campaign not found." };
  if (fromBot && (status === "approved" || status === "scheduled")) {
    await run(`UPDATE campaigns SET status = 'needs_approval' WHERE id = ?`, [id]);
    await queueApproval({
      bot: "marketing",
      department: "marketing",
      kind: "campaign",
      customer: text(row.channel),
      request: `Approve campaign: ${text(row.title)}`,
      recommendation: "A bot cannot approve its own campaign.",
      targetId: id,
    });
    return { ok: true as const, status: "needs_approval" };
  }
  await run(`UPDATE campaigns SET status = ? WHERE id = ?`, [status, id]);
  return { ok: true as const, status };
}

export async function listTickets() {
  return q(`SELECT * FROM tickets ORDER BY created_at DESC`);
}

export async function listReplies(ticketId: string) {
  return q(`SELECT * FROM ticket_replies WHERE ticket_id = ? ORDER BY created_at ASC`, [ticketId]);
}

export async function createTicket(input: { fromName: string; fromEmail: string; subject: string; body: string }) {
  const fromName = input.fromName.trim().slice(0, 120);
  const fromEmail = input.fromEmail.trim().slice(0, 160);
  const subject = input.subject.trim().slice(0, 160);
  const body = input.body.trim().slice(0, 2000);
  if (!fromName || !subject || !body || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail)) {
    return { ok: false as const, message: "Add a name, email, subject, and message." };
  }
  const id = rid("tix");
  await ready();
  await run(
    `INSERT INTO tickets (id, from_name, from_email, subject, body, status, created_at) VALUES (?, ?, ?, ?, ?, 'open', ?)`,
    [id, fromName, fromEmail, subject, body, nowIso()],
  );
  await logActivity({ bot: "support", department: "support", action: "ticket_opened", summary: `Opened “${subject}”.`, target: id });
  return { ok: true as const, id };
}

export async function replyTicket(id: string, body: string, author: string, status?: string) {
  const ticket = await q1(`SELECT * FROM tickets WHERE id = ?`, [id]);
  if (!ticket) return { ok: false as const, message: "Ticket not found." };
  const message = body.trim().slice(0, 2000);
  if (!message) return { ok: false as const, message: "Write a reply." };
  const next = status && TICKET_STATUSES.includes(status as (typeof TICKET_STATUSES)[number]) ? status : "answered";
  await ready();
  await run(`INSERT INTO ticket_replies (id, ticket_id, author, body, created_at) VALUES (?, ?, ?, ?, ?)`, [
    rid("rep"),
    id,
    author.slice(0, 40),
    message,
    nowIso(),
  ]);
  await run(`UPDATE tickets SET status = ? WHERE id = ?`, [next, id]);
  await logActivity({
    bot: author === "founder" ? "system" : "support",
    department: "support",
    action: "ticket_replied",
    summary: `Replied on “${text(ticket.subject)}” (${next}).`,
    target: id,
  });
  return { ok: true as const };
}

export async function listJobs() {
  return q(`SELECT * FROM job_openings ORDER BY created_at DESC`);
}

export async function createJob(input: { title: string; team: string; description: string }) {
  const title = input.title.trim().slice(0, 140);
  const description = input.description.trim().slice(0, 2000);
  if (!title || !description) return { ok: false as const, message: "Add a title and a description." };
  const id = rid("job");
  await ready();
  await run(
    `INSERT INTO job_openings (id, title, team, description, status, created_at) VALUES (?, ?, ?, ?, 'open', ?)`,
    [id, title, input.team.trim().slice(0, 80) || "Delivery", description, nowIso()],
  );
  await logActivity({ bot: "hr", department: "hr", action: "job_opened", summary: `Opened “${title}”.`, target: id });
  return { ok: true as const, id };
}

export async function listApplicants() {
  return q(
    `SELECT applicants.*, job_openings.title AS job_title FROM applicants
     JOIN job_openings ON job_openings.id = applicants.job_id ORDER BY applicants.created_at DESC`,
  );
}

export async function createApplicant(input: { jobId: string; name: string; email: string; notes?: string }) {
  const name = input.name.trim().slice(0, 120);
  const email = input.email.trim().slice(0, 160);
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false as const, message: "Add the applicant name and email." };
  const job = await q1(`SELECT * FROM job_openings WHERE id = ?`, [input.jobId]);
  if (!job) return { ok: false as const, message: "Pick an open role." };
  const id = rid("app");
  await ready();
  await run(
    `INSERT INTO applicants (id, job_id, name, email, status, notes, created_at) VALUES (?, ?, ?, ?, 'new', ?, ?)`,
    [id, input.jobId, name, email, (input.notes ?? "").trim().slice(0, 500), nowIso()],
  );
  return { ok: true as const, id };
}

export async function listTimeOff() {
  return q(`SELECT * FROM time_off ORDER BY created_at DESC`);
}

export async function createTimeOff(input: { person: string; startsOn: string; endsOn: string; reason: string }) {
  const person = input.person.trim().slice(0, 120);
  const reason = input.reason.trim().slice(0, 500);
  if (!person || !reason || !input.startsOn || !input.endsOn) return { ok: false as const, message: "Add the person, dates, and reason." };
  const id = rid("pto");
  await ready();
  await run(
    `INSERT INTO time_off (id, person, starts_on, ends_on, reason, status, created_at) VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
    [id, person, input.startsOn, input.endsOn, reason, nowIso()],
  );
  await queueApproval({
    bot: "hr",
    department: "hr",
    kind: "time_off",
    customer: person,
    request: `Time off ${input.startsOn} to ${input.endsOn}: ${reason}`,
    recommendation: "Approving marks the request approved. Rejecting leaves the calendar unchanged.",
    targetId: id,
  });
  return { ok: true as const, id };
}

export async function listApprovals() {
  return q(`SELECT * FROM approvals ORDER BY created_at DESC`);
}

export async function queueApproval(
  input: {
    bot: string;
    department: string;
    kind: string;
    customer: string;
    request: string;
    recommendation?: string;
    targetId?: string | null;
  },
  opts?: { fromBot?: boolean },
) {
  if (opts?.fromBot) {
    const gate = await enforceBotsRunning("queue_approval");
    if (!gate.ok) return { ok: false as const, error: "bots_paused" as const, message: gate.message };
  }
  if (input.targetId) {
    const existing = await q1(`SELECT id FROM approvals WHERE target_id = ? AND status = 'pending'`, [input.targetId]);
    if (existing) return { ok: true as const, id: text(existing.id), already: true };
  }
  const id = rid("appr");
  const recommendation = (input.recommendation ?? "Hold. Do not change price, issue a refund, or publish.").slice(0, 500);
  await ready();
  await run(
    `INSERT INTO approvals (id, bot, customer, request, recommendation, status, department, kind, target_id, created_at)
     VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`,
    [id, input.bot, input.customer.slice(0, 160), input.request.slice(0, 500), recommendation, input.department, input.kind, input.targetId ?? null, nowIso()],
  );
  await insertOutbox({
    kind: "holding_reply",
    toEmail: input.customer.includes("@") ? input.customer : "founder@business-os.demo",
    subject: "Passed to Kodanda",
    body: HOLDING_REPLY,
    relatedId: id,
    key: `holding:${id}`,
  });
  await audit(input.bot, "approval_queued", id, { kind: input.kind, request: input.request });
  await logActivity({
    bot: input.bot,
    department: input.department,
    action: "approval_queued",
    summary: `Queued for Kodanda: ${input.request}`,
    target: id,
  });
  return { ok: true as const, id, holding_reply: HOLDING_REPLY };
}

export async function decideApproval(id: string, decision: "approved" | "rejected") {
  const row = await q1<Row>(`SELECT * FROM approvals WHERE id = ?`, [id]);
  if (!row) return { ok: false as const, message: "Approval not found." };
  if (text(row.status) !== "pending") return { ok: false as const, message: "This item was already decided.", status: text(row.status) };
  await run(`UPDATE approvals SET status = ?, decided_at = ? WHERE id = ?`, [decision, nowIso(), id]);
  const kind = text(row.kind);
  const target = text(row.target_id);
  let executed = false;
  if (decision === "approved" && target) {
    if (kind === "campaign") {
      await run(`UPDATE campaigns SET status = 'approved' WHERE id = ?`, [target]);
      executed = true;
    } else if (kind === "time_off") {
      await run(`UPDATE time_off SET status = 'approved' WHERE id = ?`, [target]);
      executed = true;
    } else if (kind === "hire") {
      await run(`UPDATE applicants SET status = 'approved' WHERE id = ?`, [target]);
      executed = true;
    }
  }
  await audit("founder", decision === "approved" ? "approval_approved" : "approval_rejected", id, {
    kind,
    side_effect: executed ? "status_updated" : "none",
  });
  await logActivity({
    bot: "system",
    department: text(row.department) || "ops",
    action: decision === "approved" ? "approval_approved" : "approval_rejected",
    summary:
      decision === "rejected"
        ? `Rejected “${text(row.request)}”. No price change, refund, or send.`
        : kind === "discount" || kind === "refund"
          ? `Approved “${text(row.request)}” as a decision only. Price and Stripe were not changed.`
          : `Approved “${text(row.request)}”.`,
    target: id,
  });
  return { ok: true as const, status: decision, executed };
}

export async function listOutbox() {
  return q(`SELECT * FROM outbox ORDER BY created_at DESC`);
}

export async function listAudit() {
  return q(`SELECT * FROM audit_log ORDER BY created_at DESC`);
}

export async function listActivity(limit = 40) {
  return q(`SELECT * FROM activity_log ORDER BY created_at DESC LIMIT ?`, [limit]);
}

function ymdSeries(rows: Row[], dateKey: string, timeZone: string, value: (row: Row) => number) {
  const today = zonedParts(new Date(), timeZone).ymd;
  const points: { label: string; value: number }[] = [];
  for (let index = 6; index >= 0; index -= 1) {
    const ymd = addDays(today, -index);
    const total = rows.reduce((sum, row) => {
      const raw = text(row[dateKey]);
      if (!raw) return sum;
      const day = zonedParts(new Date(raw), timeZone).ymd;
      return day === ymd ? sum + value(row) : sum;
    }, 0);
    points.push({ label: ymd.slice(5), value: total });
  }
  return points;
}

export async function overview() {
  await ready();
  const tutor = await q1(`SELECT * FROM tutors WHERE slug = 'maya-tutor'`);
  const timeZone = text(tutor?.timezone || "America/Chicago");
  const today = zonedParts(new Date(), timeZone).ymd;
  const sessions = await q<Row>(`SELECT * FROM sessions`);
  const invoices = await listInvoices();
  const leads = await listLeads();
  const tickets = await listTickets();
  const approvals = await listApprovals();
  const activity = await listActivity(8);
  const plans = await listPlanPayments();
  const bookingsToday = sessions.filter((row) => zonedParts(new Date(text(row.starts_at)), timeZone).ymd === today).length;
  const paid = invoices.filter((row) => text(row.status) === "paid");
  const revenueCents = paid.reduce((sum, row) => sum + Number(row.amount_cents), 0);
  return {
    tutor,
    paused: await botsPaused(),
    payments: stripeMode(),
    bookingsToday,
    revenueCents,
    openInvoices: invoices.filter((row) => text(row.status) === "open").length,
    failedInvoices: invoices.filter((row) => text(row.status) === "failed").length,
    paidInvoices: paid.length,
    openTickets: tickets.filter((row) => text(row.status) !== "answered").length,
    newLeads: leads.filter((row) => text(row.status) === "new").length,
    pendingApprovals: approvals.filter((row) => text(row.status) === "pending").length,
    series: {
      bookings: ymdSeries(sessions, "starts_at", timeZone, () => 1),
      revenue: ymdSeries(invoices.filter((row) => text(row.status) === "paid"), "paid_at", timeZone, (row) => Number(row.amount_cents) / 100),
      tickets: ymdSeries(tickets, "created_at", timeZone, () => 1),
      approvals: ymdSeries(approvals, "created_at", timeZone, () => 1),
    },
    activity,
    approvals: approvals.filter((row) => text(row.status) === "pending").slice(0, 4),
    invoices: invoices.slice(0, 5),
    plans,
    lastActivity: activity[0] ?? null,
  };
}

export async function chiefOfStaffSummary(origin: string) {
  const home = await overview();
  const recent = (home.activity as Row[]).slice(0, 8).map((row) => ({
    bot: row.bot,
    department: row.department,
    action: row.action,
    summary: row.summary,
    created_at: row.created_at,
  }));
  return {
    ok: true,
    business: { name: "Maya Chen Tutoring", slug: "maya-tutor", vertical: "tutoring" },
    payments_mode: home.payments === "test" ? "stripe_test" : home.payments === "refused" ? "refused" : "demo",
    bots_paused: home.paused,
    revenue_cents: home.revenueCents,
    bookings_today: home.bookingsToday,
    open_tickets: home.openTickets,
    new_leads: home.newLeads,
    pending_approvals: home.pendingApprovals,
    invoices: { open: home.openInvoices, paid: home.paidInvoices, failed: home.failedInvoices },
    recent_activity: recent,
    pricing: pricingPayload(origin).plan,
    digest: `Session revenue $${(home.revenueCents / 100).toFixed(2)}. ${home.bookingsToday} sessions on today's calendar. ${home.openTickets} tickets still open. ${home.newLeads} new leads. ${home.pendingApprovals} approvals waiting. Bots are ${home.paused ? "paused" : "running"}.`,
  };
}

export async function lookupFamily(email: string) {
  const family = await q1(`SELECT * FROM families WHERE lower(parent_email) = lower(?)`, [email.trim()]);
  if (!family) return null;
  const students = await q(`SELECT name, grade, subjects FROM students WHERE family_id = ?`, [family.id]);
  return { ...family, students };
}

export async function sessionsForBot(filters: { email?: string; status?: string }) {
  const rows = await listSessions();
  return rows.filter((row) => {
    if (filters.email && text(row.parent_email).toLowerCase() !== filters.email.toLowerCase()) return false;
    if (filters.status && text(row.status) !== filters.status) return false;
    return true;
  });
}

export async function paymentStatus(filters: { invoiceId?: string; email?: string }) {
  if (filters.invoiceId) {
    const invoice = await getInvoice(filters.invoiceId);
    return invoice ? [invoice] : [];
  }
  const rows = await listInvoices();
  if (!filters.email) return rows;
  return rows.filter((row) => text(row.parent_email).toLowerCase() === filters.email!.toLowerCase());
}

export async function publicPricing(origin: string) {
  return pricingPayload(origin);
}

export async function resetDemo() {
  await wipe();
  const { seed } = await import("./seed");
  await seed();
}
