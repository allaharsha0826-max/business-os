"use client";

import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-lg px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-sm text-neutral-700">{error.message}</p>
      <Button className="mt-6" onClick={() => reset()}>
        Try again
      </Button>
    </main>
  );
}
