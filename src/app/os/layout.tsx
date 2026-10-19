import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { OsShell } from "@/components/os-shell";
import { isAdmin } from "@/lib/auth";
import { safeNextPath } from "@/lib/secrets";
import { botsPaused, listApprovals } from "@/lib/store";

export default async function OsLayout({ children }: { children: React.ReactNode }) {
  const path = safeNextPath((await headers()).get("x-bos-path"));
  if (!(await isAdmin())) redirect(`/login?next=${encodeURIComponent(path || "/os")}`);
  const approvals = await listApprovals();
  const pending = approvals.filter((row) => String(row.status) === "pending").length;
  return (
    <OsShell pending={pending} paused={await botsPaused()}>
      <div id="main">{children}</div>
    </OsShell>
  );
}
