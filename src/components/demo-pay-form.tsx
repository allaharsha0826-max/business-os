"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DemoPayForm({
  target,
  id,
  returnTo,
}: {
  target: "invoice" | "plan";
  id: string;
  returnTo: string;
}) {
  const [card, setCard] = useState("");

  return (
    <form action="/api/pay/demo" method="POST" className="grid gap-4">
      <input type="hidden" name="target" value={target} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="return" value={returnTo} />
      <div className="grid gap-1.5">
        <Label htmlFor="card_name">Name on card</Label>
        <Input id="card_name" name="card_name" autoComplete="cc-name" required defaultValue="Maya Parent" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="card_number">Card number</Label>
        <Input
          id="card_number"
          name="card_number"
          inputMode="numeric"
          autoComplete="cc-number"
          required
          value={card}
          onChange={(event) => setCard(event.target.value)}
          placeholder="4242 4242 4242 4242"
          className="font-mono"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => setCard("4242 4242 4242 4242")}>
          Fill 4242 success
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => setCard("4000 0000 0000 0002")}>
          Fill 0002 decline
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="exp">Expiry</Label>
          <Input id="exp" name="exp" autoComplete="cc-exp" required defaultValue="12/34" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="cvc">CVC</Label>
          <Input id="cvc" name="cvc" autoComplete="cc-csc" required defaultValue="123" />
        </div>
      </div>
      <Button type="submit" size="lg" className="w-full">
        Pay in demo mode
      </Button>
    </form>
  );
}
