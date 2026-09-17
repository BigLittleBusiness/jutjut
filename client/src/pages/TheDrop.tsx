import React, { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { DropQRDisplay } from "@/components/DropQRDisplay";

/**
 * Student-facing The Drop surface. Business campaign management lives in the
 * Business Dashboard so students never encounter an editable provider form.
 */
export const TheDrop: React.FC = () => {
  const [qrDrop, setQrDrop] = useState<{ id: number; title: string } | null>(null);
  const { data: drops = [], isLoading, error, refetch } = trpc.student.drops.list.useQuery();
  const recordView = trpc.business.drops.recordView.useMutation();

  const openRedemption = (drop: typeof drops[number]) => {
    if (drop.isSoldOut) {
      toast.info("This Drop has reached its claim limit.");
      return;
    }
    recordView.mutate({ dropId: drop.id });
    setQrDrop({ id: drop.id, title: drop.title });
  };

  if (isLoading) {
    return <div className="container mx-auto max-w-6xl px-4 py-8 space-y-5"><div className="h-36 rounded-2xl bg-muted animate-pulse" /><div className="grid gap-4 md:grid-cols-2"><div className="h-64 rounded-2xl bg-muted animate-pulse" /><div className="h-64 rounded-2xl bg-muted animate-pulse" /></div></div>;
  }

  if (error) {
    return <div className="container mx-auto max-w-3xl px-4 py-12"><div role="alert" className="rounded-2xl border-2 border-rose-300 bg-rose-50 p-6 text-center dark:bg-rose-950/30"><p className="font-black text-lg">We could not load The Drop</p><p className="mt-2 text-sm text-muted-foreground">No offers are shown until the current list is available.</p><button onClick={() => refetch()} className="mt-5 brutal-btn bg-primary text-primary-foreground px-4 py-2 text-sm">Try again</button></div></div>;
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 space-y-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-secondary/50 bg-secondary/10 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-secondary-foreground"><i className="fa-solid fa-fire" aria-hidden="true" /> Student perks</div>
          <h1 className="mt-3 text-3xl font-black tracking-tight">The Drop</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">Live offers from JutJut business partners. Claim a listed offer once, then show its time-limited QR code to staff.</p>
        </div>
        <div className="rounded-xl border-2 border-primary/20 bg-primary/5 px-4 py-3 text-sm"><span className="font-black text-primary">{drops.length}</span> live {drops.length === 1 ? "offer" : "offers"}</div>
      </header>

      <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:bg-amber-950/30 dark:text-amber-100 flex gap-3"><i className="fa-solid fa-qrcode mt-0.5 text-amber-700" aria-hidden="true" /><p><strong>How it works:</strong> choose a live offer, generate your QR code when you are ready to redeem, and have staff scan it at the counter. Each listing has its own claim eligibility.</p></div>

      {drops.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border bg-card/50 px-6 py-16 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary/10 text-2xl">🎁</div><h2 className="mt-4 text-xl font-black">No Drops are live right now</h2><p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">New offers appear here only after a business campaign is approved and live. Check back soon.</p></div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {drops.map(drop => {
            const remaining = drop.maxClaims === null ? null : Math.max(0, drop.maxClaims - drop.claimCount);
            const redeemed = drop.claimStatus === "redeemed";
            const claimed = drop.claimStatus === "claimed";
            return <article key={drop.id} className="brutal-card brutal-shadow bg-card flex flex-col overflow-hidden">
              {drop.imageUrl ? <img src={drop.imageUrl} alt="" className="h-40 w-full object-cover border-b-2 border-border" /> : <div className="flex h-40 items-center justify-center bg-gradient-to-br from-secondary/20 via-amber-100 to-primary/10 text-5xl" aria-hidden="true">🎁</div>}
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-start justify-between gap-3"><span className="rounded-full border border-emerald-300 bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-800">Live Drop</span>{drop.isSoldOut ? <span className="text-xs font-bold text-rose-700">Fully claimed</span> : remaining !== null ? <span className="text-xs font-bold text-muted-foreground">{remaining} left</span> : <span className="text-xs font-bold text-muted-foreground">Limited offer</span>}</div>
                <h2 className="mt-4 text-xl font-black leading-tight">{drop.title}</h2>
                {drop.description && <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{drop.description}</p>}
                <div className="mt-5 border-t-2 border-border pt-4"><p className="text-xs font-semibold text-muted-foreground">{drop.maxClaims === null ? "Available while this Drop is live." : `${drop.claimCount} of ${drop.maxClaims} claimed.`}</p>{redeemed ? <div className="mt-3 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800">Redeemed successfully</div> : <button onClick={() => openRedemption(drop)} disabled={drop.isSoldOut || recordView.isPending} className="mt-3 w-full brutal-btn bg-secondary text-secondary-foreground px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60">{claimed ? "Open my QR code" : drop.isSoldOut ? "Fully claimed" : "Claim this Drop"}</button>}</div>
              </div>
            </article>;
          })}
        </div>
      )}

      <DropQRDisplay dropId={qrDrop?.id ?? 0} dropTitle={qrDrop?.title ?? ""} open={qrDrop !== null} onClose={() => { setQrDrop(null); void refetch(); }} />
    </div>
  );
};
