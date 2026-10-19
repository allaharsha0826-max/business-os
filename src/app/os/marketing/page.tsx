import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CAMPAIGN_STATUSES, listCampaigns } from "@/lib/store";

export default async function MarketingPage() {
  const campaigns = await listCampaigns();
  return (
    <div className="grid gap-4">
      <Card className="p-4">
        <h2 className="font-semibold">New draft</h2>
        <form action="/api/admin/action" method="POST" className="mt-3 grid gap-2 md:grid-cols-2">
          <input type="hidden" name="type" value="create_campaign" />
          <input type="hidden" name="return" value="/os/marketing" />
          <Input name="title" required placeholder="Title" aria-label="Campaign title" />
          <Input name="channel" placeholder="Email or Instagram" aria-label="Channel" />
          <Textarea name="body" required placeholder="Draft copy" className="md:col-span-2" aria-label="Campaign body" />
          <select name="status" defaultValue="draft" aria-label="Campaign status" className="h-10 rounded-sm border border-neutral-200 bg-white px-3 text-sm">
            <option value="draft">Draft</option>
            <option value="needs_approval">Needs approval</option>
          </select>
          <Button type="submit" className="w-fit">
            Save draft
          </Button>
        </form>
      </Card>
      <div className="grid gap-3">
        {campaigns.length === 0 ? <p className="text-sm text-neutral-500">No drafts yet.</p> : null}
        {campaigns.map((campaign) => (
          <Card key={String(campaign.id)} className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">{String(campaign.title)}</h3>
              <StatusBadge status={String(campaign.status)} />
            </div>
            <p className="mt-1 text-xs text-neutral-500">{String(campaign.channel)}</p>
            <p className="mt-2 text-sm leading-6 text-neutral-700">{String(campaign.body)}</p>
            <form action="/api/admin/action" method="POST" className="mt-3 flex flex-wrap gap-2">
              <input type="hidden" name="type" value="set_campaign_status" />
              <input type="hidden" name="id" value={String(campaign.id)} />
              <input type="hidden" name="return" value="/os/marketing" />
              <select name="status" defaultValue={String(campaign.status)} aria-label={`Status for ${String(campaign.title)}`} className="h-8 rounded-sm border border-neutral-200 bg-white px-2 text-xs">
                {CAMPAIGN_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
              <Button type="submit" size="sm" variant="secondary">
                Update status
              </Button>
            </form>
          </Card>
        ))}
      </div>
    </div>
  );
}
