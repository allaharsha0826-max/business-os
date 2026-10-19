import { SiteHeader } from "@/components/site-header";
import { ENDPOINTS } from "@/lib/openapi";

export default function DocsPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-[800px] px-4 py-16">
        <h1 className="text-4xl font-bold tracking-tight">Bot API</h1>
        <p className="mt-4 text-neutral-700">
          Send header <code className="rounded bg-neutral-100 px-1 font-mono text-sm">x-bot-api-key</code>. Locally the key is{" "}
          <code className="font-mono text-sm">dev-bot-key</code> until you set <code className="font-mono text-sm">BOT_API_KEY</code>. The machine-readable spec is{" "}
          <code className="font-mono text-sm">GET /api/bot/v1/openapi.json</code>.
        </p>
        <p className="mt-3 text-sm text-neutral-700">
          Bots can read and draft. They cannot approve their own campaigns, change the $19 price, or refund an invoice. If bots are paused, every call is refused and logged.
        </p>
        <div className="mt-8 overflow-x-auto rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Path</th>
                <th className="px-4 py-3">What it does</th>
              </tr>
            </thead>
            <tbody>
              {ENDPOINTS.map((endpoint) => (
                <tr key={`${endpoint.method}${endpoint.path}`} className="border-b border-neutral-100 last:border-0">
                  <td className="px-4 py-3 font-mono text-xs">{endpoint.method}</td>
                  <td className="px-4 py-3 font-mono text-xs">{endpoint.path}</td>
                  <td className="px-4 py-3 text-neutral-700">{endpoint.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
