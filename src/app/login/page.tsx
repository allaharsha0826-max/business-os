import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usingDefaultAdminPassword, safeNextPath } from "@/lib/secrets";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const query = await searchParams;
  const next = safeNextPath(query.next);
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-md px-4 py-16">
        <Card className="p-6">
          <h1 className="text-2xl font-semibold">Founder desk</h1>
          <p className="mt-2 text-sm leading-6 text-neutral-700">One password. There are no user accounts.</p>
          {usingDefaultAdminPassword() ? (
            <p className="mt-3 rounded-md bg-neutral-50 px-3 py-2 text-sm">Local password: demo</p>
          ) : null}
          {query.error ? <p className="mt-3 text-sm text-error-600">{query.error}</p> : null}
          <form action="/api/auth/login" method="POST" className="mt-6 grid gap-3">
            <input type="hidden" name="next" value={next} />
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
            <Button type="submit">Enter</Button>
          </form>
        </Card>
      </main>
    </>
  );
}
