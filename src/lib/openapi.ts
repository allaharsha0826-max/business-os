export const ENDPOINTS = [
  { method: "GET", path: "/api/bot/v1/summary", summary: "Cross-department digest for the chief of staff." },
  { method: "GET", path: "/api/bot/v1/pricing", summary: "Published plan and FAQ. $19/mo, 14-day trial, no card." },
  { method: "GET", path: "/api/bot/v1/families?email=", summary: "Look up a family by parent email." },
  { method: "GET", path: "/api/bot/v1/leads", summary: "List the sales pipeline." },
  { method: "POST", path: "/api/bot/v1/leads", summary: "Create a lead. Body: name, email, source, notes." },
  { method: "POST", path: "/api/bot/v1/leads/{id}/status", summary: "Update lead status: new, contacted, trial, won, lost." },
  { method: "GET", path: "/api/bot/v1/campaigns", summary: "List campaign drafts." },
  { method: "POST", path: "/api/bot/v1/campaigns", summary: "Create a draft. approved/scheduled is queued instead." },
  { method: "GET", path: "/api/bot/v1/tickets", summary: "List support tickets." },
  { method: "POST", path: "/api/bot/v1/tickets/{id}/replies", summary: "Reply to a ticket. Body: body, status." },
  { method: "GET", path: "/api/bot/v1/jobs", summary: "List job openings." },
  { method: "POST", path: "/api/bot/v1/jobs", summary: "Open a role. Body: title, team, description." },
  { method: "GET", path: "/api/bot/v1/applicants", summary: "List applicants." },
  { method: "GET", path: "/api/bot/v1/bookings", summary: "List sessions. Optional email and status." },
  { method: "POST", path: "/api/bot/v1/bookings", summary: "Create a booking with the same fields as the public form." },
  { method: "GET", path: "/api/bot/v1/invoices", summary: "List invoices." },
  { method: "GET", path: "/api/bot/v1/payments", summary: "Payment status by invoice_id or email." },
  { method: "POST", path: "/api/bot/v1/approvals", summary: "queue_approval. Does not execute the request." },
  { method: "POST", path: "/api/bot/v1/activity", summary: "log_activity. Body: bot, department, action, summary." },
  { method: "GET", path: "/api/bot/v1/openapi.json", summary: "This document. Requires the bot key." },
] as const;

export function openApiDocument(origin: string) {
  return {
    openapi: "3.0.3",
    info: {
      title: "Business OS bot API",
      version: "1.0.0",
      description: "Read and draft work for one demo business. Risky actions go to approvals and do not execute.",
    },
    servers: [{ url: origin }],
    components: {
      securitySchemes: {
        botKey: { type: "apiKey", in: "header", name: "x-bot-api-key" },
      },
    },
    security: [{ botKey: [] }],
    paths: ENDPOINTS.reduce<Record<string, Record<string, unknown>>>((paths, endpoint) => {
      const path = endpoint.path.split("?")[0];
      paths[path] = {
        ...(paths[path] ?? {}),
        [endpoint.method.toLowerCase()]: {
          summary: endpoint.summary,
          responses: { "200": { description: "JSON body with ok: true, or an error." } },
        },
      };
      return paths;
    }, {}),
  };
}
