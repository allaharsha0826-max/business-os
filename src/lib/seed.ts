import { one, run } from "./db";
import { parentUpdateBody } from "./messages";
import { SESSION_OFFER } from "./plan";
import { addDays, zonedLocalToUtc, zonedParts } from "./time";

const TUTOR_ID = "tutor_maya";
const TZ = "America/Chicago";

function isoDaysFromToday(days: number, hm: string) {
  const today = zonedParts(new Date(), TZ).ymd;
  let ymd = addDays(today, days);
  const weekday = zonedParts(zonedLocalToUtc(ymd, "12:00", TZ), TZ).weekday;
  if (weekday === "Sat") ymd = addDays(ymd, 2);
  if (weekday === "Sun") ymd = addDays(ymd, 1);
  return zonedLocalToUtc(ymd, hm, TZ).toISOString();
}

async function insertFamily(input: {
  id: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  studentId: string;
  studentName: string;
  grade: string;
}) {
  await run(
    `INSERT INTO families (id, tutor_id, parent_name, parent_email, parent_phone) VALUES (?, ?, ?, ?, ?)`,
    [input.id, TUTOR_ID, input.parentName, input.parentEmail, input.parentPhone],
  );
  await run(
    `INSERT INTO students (id, family_id, tutor_id, name, grade, subjects) VALUES (?, ?, ?, ?, ?, ?)`,
    [input.studentId, input.id, TUTOR_ID, input.studentName, input.grade, "SAT Math"],
  );
}

export async function seed() {
  const now = new Date().toISOString();
  await run(
    `INSERT INTO tutors (id, name, slug, email, bio, timezone, subjects, cancel_policy_hours)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      TUTOR_ID,
      "Maya Chen",
      "maya-tutor",
      "maya.chen@example.com",
      "SAT math tutor in Austin. I work with high-school students who want a calmer score, not a thicker stack of worksheets.",
      TZ,
      "SAT Math",
      24,
    ],
  );

  await insertFamily({
    id: "fam_okonkwo",
    parentName: "Elena Okonkwo",
    parentEmail: "elena.okonkwo@example.com",
    parentPhone: "(512) 555-0148",
    studentId: "stu_jordan",
    studentName: "Jordan Okonkwo",
    grade: "10",
  });
  await insertFamily({
    id: "fam_alvarez",
    parentName: "David Alvarez",
    parentEmail: "david.alvarez@example.com",
    parentPhone: "(512) 555-0172",
    studentId: "stu_camila",
    studentName: "Camila Alvarez",
    grade: "12",
  });
  await insertFamily({
    id: "fam_shah",
    parentName: "Priya Shah",
    parentEmail: "priya.shah@example.com",
    parentPhone: "(512) 555-0194",
    studentId: "stu_aarav",
    studentName: "Aarav Shah",
    grade: "11",
  });
  await insertFamily({
    id: "fam_brooks",
    parentName: "Hannah Brooks",
    parentEmail: "hannah.brooks@example.com",
    parentPhone: "(512) 555-0116",
    studentId: "stu_leo",
    studentName: "Leo Brooks",
    grade: "9",
  });

  const jordanStart = isoDaysFromToday(-1, "16:00");
  const jordanEnd = new Date(new Date(jordanStart).getTime() + 60 * 60 * 1000).toISOString();
  await run(
    `INSERT INTO sessions (
      id, tutor_id, family_id, student_id, session_type, starts_at, ends_at, price_cents, status,
      parent_name, parent_email, parent_phone, student_name, student_grade, notes,
      covered, went_well, next_focus, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "ses_jordan",
      TUTOR_ID,
      "fam_okonkwo",
      "stu_jordan",
      SESSION_OFFER.name,
      jordanStart,
      jordanEnd,
      SESSION_OFFER.priceCents,
      "done",
      "Elena Okonkwo",
      "elena.okonkwo@example.com",
      "(512) 555-0148",
      "Jordan Okonkwo",
      "10",
      "",
      "Factoring quadratics, then two official SAT problems.",
      "Jordan set up the second problem without a hint.",
      "Timed word problems, a set of eight.",
      jordanStart,
    ],
  );

  const due = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString();
  await run(
    `INSERT INTO invoices (
      id, tutor_id, family_id, session_id, number, amount_cents, status, due_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "inv_jordan",
      TUTOR_ID,
      "fam_okonkwo",
      "ses_jordan",
      "INV-1001",
      SESSION_OFFER.priceCents,
      "open",
      due,
      jordanStart,
    ],
  );

  await run(
    `INSERT INTO outbox (id, kind, to_email, subject, body, related_id, idempotency_key, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "out_jordan",
      "parent_update",
      "elena.okonkwo@example.com",
      "Maya's SAT Math session: today's update",
      parentUpdateBody({
        parentName: "Elena",
        studentName: "Jordan",
        sessionType: SESSION_OFFER.name,
        startsAt: jordanStart,
        timeZone: TZ,
        covered: "Factoring quadratics, then two official SAT problems.",
        wentWell: "Jordan set up the second problem without a hint.",
        nextFocus: "Timed word problems, a set of eight.",
        tutorName: "Maya Chen",
        payUrl: "/invoice/inv_jordan",
      }),
      "ses_jordan",
      "update:ses_jordan",
      jordanStart,
    ],
  );

  const upcoming = [
    ["ses_camila", "fam_alvarez", "stu_camila", "David Alvarez", "david.alvarez@example.com", "(512) 555-0172", "Camila Alvarez", "12", 1, "16:00"],
    ["ses_aarav", "fam_shah", "stu_aarav", "Priya Shah", "priya.shah@example.com", "(512) 555-0194", "Aarav Shah", "11", 2, "17:00"],
    ["ses_leo", "fam_brooks", "stu_leo", "Hannah Brooks", "hannah.brooks@example.com", "(512) 555-0116", "Leo Brooks", "9", 3, "18:00"],
  ] as const;

  for (const row of upcoming) {
    const starts = isoDaysFromToday(row[8], row[9]);
    const ends = new Date(new Date(starts).getTime() + 60 * 60 * 1000).toISOString();
    await run(
      `INSERT INTO sessions (
        id, tutor_id, family_id, student_id, session_type, starts_at, ends_at, price_cents, status,
        parent_name, parent_email, parent_phone, student_name, student_grade, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        row[0],
        TUTOR_ID,
        row[1],
        row[2],
        SESSION_OFFER.name,
        starts,
        ends,
        SESSION_OFFER.priceCents,
        "booked",
        row[3],
        row[4],
        row[5],
        row[6],
        row[7],
        "",
        now,
      ],
    );
  }

  await run(
    `INSERT INTO settings (key, value) VALUES ('bots_paused', '0')`,
  );
  await run(
    `INSERT INTO audit_log (id, actor, action, target, details_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      "aud_seed",
      "system",
      "seed_loaded",
      TUTOR_ID,
      JSON.stringify({ tutor: "maya-tutor", open_invoice: "INV-1001" }),
      now,
    ],
  );
  await seedDepartments();
}

function minutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

async function seedDepartments() {
  const leads = [
    ["lead_ada", "Ada Okoye", "ada.okoye@example.com", "Website", "new", "Asked what the 14-day trial includes.", 40],
    ["lead_ben", "Ben Park", "ben.park@example.com", "Referral", "contacted", "Referred by a parent at Jordan's school.", 180],
    ["lead_cio", "Cio Alvarez", "cio.alvarez@example.com", "Demo", "trial", "Started the demo and booked a look at Saturday spots.", 26 * 60],
    ["lead_dee", "Dee Nguyen", "dee.nguyen@example.com", "Instagram", "won", "Teaching piano. Wants the same desk Maya uses.", 3 * 24 * 60],
  ] as const;
  for (const lead of leads) {
    await run(
      `INSERT INTO leads (id, name, email, source, status, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [lead[0], lead[1], lead[2], lead[3], lead[4], lead[5], minutesAgo(lead[6])],
    );
  }

  await run(
    `INSERT INTO campaigns (id, title, channel, body, status, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      "camp_spots",
      "Saturday SAT spots",
      "Email",
      "Three Saturday seats are open for 60-min SAT Math. Reply with a time and I'll send Maya's booking link.",
      "draft",
      minutesAgo(90),
    ],
  );
  await run(
    `INSERT INTO campaigns (id, title, channel, body, status, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      "camp_tips",
      "3 algebra mistakes that cost easy points",
      "Instagram",
      "A short post naming three algebra slips Maya sees every week, with the booking link in the bio. Needs founder approval before it goes out.",
      "needs_approval",
      minutesAgo(70),
    ],
  );

  await run(
    `INSERT INTO tickets (id, from_name, from_email, subject, body, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      "tix_move",
      "David Alvarez",
      "david.alvarez@example.com",
      "Can we move Thursday?",
      "Camila has a school concert. Can her session move to Friday at 4?",
      "open",
      minutesAgo(50),
    ],
  );
  await run(
    `INSERT INTO tickets (id, from_name, from_email, subject, body, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      "tix_how",
      "Priya Shah",
      "priya.shah@example.com",
      "How do parent updates work?",
      "Where do the notes after a session show up?",
      "answered",
      minutesAgo(300),
    ],
  );
  await run(
    `INSERT INTO ticket_replies (id, ticket_id, author, body, created_at) VALUES (?, ?, ?, ?, ?)`,
    [
      "rep_how",
      "tix_how",
      "support",
      "1. Open Bookings. 2. Mark the session done. 3. Fill Covered, Went well, and Next focus. 4. The note is saved in the Outbox and an invoice is created.",
      minutesAgo(280),
    ],
  );
  await run(
    `INSERT INTO tickets (id, from_name, from_email, subject, body, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      "tix_refund",
      "Elena Okonkwo",
      "elena.okonkwo@example.com",
      "Please refund last month",
      "I want a refund for a session Jordan missed.",
      "escalated",
      minutesAgo(30),
    ],
  );

  await run(
    `INSERT INTO job_openings (id, title, team, description, status, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      "job_proctor",
      "Saturday proctor",
      "Delivery",
      "Sit with students during a practice test. Four hours, one Saturday a month. Contract, not a hire-to-start.",
      "open",
      minutesAgo(2 * 24 * 60),
    ],
  );
  await run(
    `INSERT INTO applicants (id, job_id, name, email, status, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ["app_nina", "job_proctor", "Nina Shah", "nina.shah@example.com", "new", "Available Saturdays.", minutesAgo(400)],
  );
  await run(
    `INSERT INTO applicants (id, job_id, name, email, status, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ["app_omar", "job_proctor", "Omar Haddad", "omar.haddad@example.com", "interview", "Practice-test proctor last spring.", minutesAgo(800)],
  );
  await run(
    `INSERT INTO applicants (id, job_id, name, email, status, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ["app_lina", "job_proctor", "Lina Brooks", "lina.brooks@example.com", "new", "Asked to start before the founder decides.", minutesAgo(20)],
  );

  await run(
    `INSERT INTO time_off (id, person, starts_on, ends_on, reason, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ["pto_maya", "Maya Chen", "2026-11-26", "2026-11-27", "Thanksgiving. No sessions those two days.", "pending", minutesAgo(15)],
  );

  const approvals = [
    ["appr_discount", "sales", "ada.okoye@example.com", "Customer asked for 50% off", "Reject. The published price stays $19/mo until you change it yourself.", "sales", "discount", null, 35],
    ["appr_campaign", "marketing", "Instagram draft", "Approve the post “3 algebra mistakes that cost easy points”", "Read the draft. Approving marks the campaign approved. It does not post it.", "marketing", "campaign", "camp_tips", 65],
    ["appr_pto", "hr", "Maya Chen", "Time off Nov 26–27", "Block those dates on the booking page yourself if you approve.", "hr", "time_off", "pto_maya", 15],
    ["appr_hire", "hr", "Lina Brooks", "Hire Lina Brooks as Saturday proctor", "Approving marks the applicant approved. It does not send an offer.", "hr", "hire", "app_lina", 18],
    ["appr_refund", "support", "elena.okonkwo@example.com", "Refund a missed session", "Hold. Do not refund. There is no refund action in this demo.", "support", "refund", "tix_refund", 28],
  ] as const;
  for (const row of approvals) {
    await run(
      `INSERT INTO approvals (id, bot, customer, request, recommendation, status, department, kind, target_id, created_at)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`,
      [row[0], row[1], row[2], row[3], row[4], row[5], row[6], row[7], minutesAgo(row[8])],
    );
  }

  await run(
    `INSERT INTO outbox (id, kind, to_email, subject, body, related_id, idempotency_key, created_at)
     VALUES (?, 'holding_reply', ?, ?, ?, ?, ?, ?)`,
    [
      "out_discount",
      "ada.okoye@example.com",
      "Passed to Kodanda",
      "Thanks, I've passed this to Kodanda and you'll hear back within 1 business day.",
      "appr_discount",
      "holding:appr_discount",
      minutesAgo(35),
    ],
  );

  const activity = [
    ["sales", "sales", "lead_logged", "Logged Ada Okoye from the website. She asked about the trial.", "lead_ada", 39],
    ["sales", "sales", "holding_reply", "Queued a 50% off request and sent the holding reply. No discount was offered.", "appr_discount", 34],
    ["support", "support", "ticket_answered", "Answered Priya Shah with the steps for a parent update.", "tix_how", 280],
    ["support", "support", "escalated", "Elena asked for a refund. Queued it. No refund was issued.", "tix_refund", 29],
    ["marketing", "marketing", "draft_saved", "Drafted an Instagram post and left it for approval.", "camp_tips", 68],
    ["ops", "finance", "watch", "Watching demo payments. No card has been charged.", "invoices", 10],
  ] as const;
  for (const row of activity) {
    await run(
      `INSERT INTO activity_log (id, bot, department, action, summary, target, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [`act_${row[2]}`, row[0], row[1], row[2], row[3], row[4], minutesAgo(row[5])],
    );
  }
}

export async function seedIfEmpty() {
  const existing = await one<{ id: string }>("SELECT id FROM tutors LIMIT 1");
  if (!existing) await seed();
}
