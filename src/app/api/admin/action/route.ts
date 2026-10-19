import { isAdmin } from "@/lib/auth";
import { redirectBack } from "@/lib/http";
import { requestOrigin } from "@/lib/origin";
import {
  createApplicant,
  createCampaign,
  createJob,
  createLead,
  createTicket,
  createTimeOff,
  decideApproval,
  markSessionDone,
  replyTicket,
  setBotsPaused,
  setCampaignStatus,
  setLeadStatus,
} from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await isAdmin())) return redirectBack("/login", { error: "Log in first." });
  const form = await request.formData();
  const type = String(form.get("type") ?? "");
  const back = String(form.get("return") ?? "/os");
  const fail = (message: string) => redirectBack(back, { error: message });
  const ok = (toast: string) => redirectBack(back, { toast });

  if (type === "mark_done") {
    const result = await markSessionDone(
      String(form.get("session_id") ?? ""),
      {
        covered: String(form.get("covered") ?? ""),
        wentWell: String(form.get("went_well") ?? ""),
        nextFocus: String(form.get("next_focus") ?? ""),
      },
      await requestOrigin(),
    );
    if (!result.ok) return fail(result.message);
    return ok(result.already ? "That session was already done." : `Invoice ${result.number} created. Update saved to the Outbox.`);
  }
  if (type === "create_lead") {
    const result = await createLead({
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      source: String(form.get("source") ?? ""),
      notes: String(form.get("notes") ?? ""),
    });
    return result.ok ? ok("Lead added.") : fail(result.message);
  }
  if (type === "set_lead_status") {
    const result = await setLeadStatus(String(form.get("id") ?? ""), String(form.get("status") ?? ""));
    return result.ok ? ok("Lead updated.") : fail(result.message);
  }
  if (type === "create_campaign") {
    const result = await createCampaign({
      title: String(form.get("title") ?? ""),
      channel: String(form.get("channel") ?? ""),
      body: String(form.get("body") ?? ""),
      status: String(form.get("status") ?? "draft"),
    });
    return result.ok ? ok("Draft saved.") : fail(result.message);
  }
  if (type === "set_campaign_status") {
    const result = await setCampaignStatus(String(form.get("id") ?? ""), String(form.get("status") ?? ""));
    return result.ok ? ok("Campaign updated.") : fail(result.message);
  }
  if (type === "create_ticket") {
    const result = await createTicket({
      fromName: String(form.get("from_name") ?? ""),
      fromEmail: String(form.get("from_email") ?? ""),
      subject: String(form.get("subject") ?? ""),
      body: String(form.get("body") ?? ""),
    });
    return result.ok ? ok("Ticket opened.") : fail(result.message);
  }
  if (type === "reply_ticket") {
    const result = await replyTicket(String(form.get("id") ?? ""), String(form.get("body") ?? ""), "founder", String(form.get("status") ?? ""));
    return result.ok ? ok("Reply saved.") : fail(result.message);
  }
  if (type === "create_job") {
    const result = await createJob({
      title: String(form.get("title") ?? ""),
      team: String(form.get("team") ?? ""),
      description: String(form.get("description") ?? ""),
    });
    return result.ok ? ok("Role posted.") : fail(result.message);
  }
  if (type === "create_applicant") {
    const result = await createApplicant({
      jobId: String(form.get("job_id") ?? ""),
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
    });
    return result.ok ? ok("Applicant added.") : fail(result.message);
  }
  if (type === "create_time_off") {
    const result = await createTimeOff({
      person: String(form.get("person") ?? ""),
      startsOn: String(form.get("starts_on") ?? ""),
      endsOn: String(form.get("ends_on") ?? ""),
      reason: String(form.get("reason") ?? ""),
    });
    return result.ok ? ok("Time off queued for approval.") : fail(result.message);
  }
  if (type === "decide_approval") {
    const decision = String(form.get("decision") ?? "");
    if (decision !== "approved" && decision !== "rejected") return fail("Choose approve or reject.");
    const result = await decideApproval(String(form.get("id") ?? ""), decision);
    if (!result.ok) return fail(result.message);
    return ok(decision === "approved" ? "Approved. Money actions were not executed." : "Rejected. No side effect.");
  }
  if (type === "kill_switch") {
    await setBotsPaused(String(form.get("paused") ?? "") === "1");
    return ok(String(form.get("paused")) === "1" ? "Bots paused." : "Bots are running.");
  }
  return fail("Unknown action.");
}
