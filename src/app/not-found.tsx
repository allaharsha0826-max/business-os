import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-lg px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold">That page is not here</h1>
      <p className="mt-2 text-sm text-neutral-700">The link may be old, or the record was reset with the demo seed.</p>
      <Button asChild className="mt-6">
        <Link href="/">Back home</Link>
      </Button>
    </main>
  );
}
