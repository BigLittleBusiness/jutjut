import React from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

export function Dashboard({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { user, loading } = useAuth();
  const vouches = trpc.vouches.list.useQuery(undefined, { retry: false });

  const firstName = user?.name?.trim().split(/\s+/)[0] || "there";
  const vouchCount = vouches.data?.filter((v) => v.status === "verified").length ?? 0;

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 space-y-7">
      <section className="brutal-card brutal-shadow bg-gradient-to-br from-teal-50 via-card to-amber-50 p-6 md:p-8" aria-labelledby="dashboard-heading">
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-primary">Your JutJut workspace</p>
        <h1 id="dashboard-heading" className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
          {loading ? "Preparing your workspace" : `Welcome, ${firstName}.`}
        </h1>
        <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-muted-foreground">
          Build evidence at your own pace, explore live opportunities, and choose what you share. JutJut does not present sample activity as your account history.
        </p>
      </section>

      <section aria-labelledby="next-heading">
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.15em] text-muted-foreground">A clear next step</p>
            <h2 id="next-heading" className="text-2xl font-black">Choose what matters today</h2>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <ActionCard icon="fa-briefcase" title="Build your Kit" body="Request a real person to vouch for a skill or achievement." action="Open My Kit" onClick={() => onNavigate("my-kit")} />
          <ActionCard icon="fa-clipboard-list" title="Explore live jobs" body="See only current employer-posted listings. No sample roles are mixed in." action="Browse jobs" onClick={() => onNavigate("jobs")} />
          <ActionCard icon="fa-handshake" title="Plan a practical" body="If your course has a required real-world component, start with your institution's approved pathway." action="Open Practicals" onClick={() => onNavigate("practicals")} />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]" aria-label="Account evidence and safety">
        <div className="brutal-card bg-card p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-black">Your evidence</h2>
              <p className="mt-1 text-sm text-muted-foreground">Only server-recorded verification requests are shown here.</p>
            </div>
            <span className="rounded-full border-2 border-primary/30 bg-primary/5 px-3 py-1 text-xs font-extrabold text-primary">
              {vouches.isLoading ? "Loading" : `${vouchCount} verified`}
            </span>
          </div>
          {vouches.isError ? (
            <div role="alert" className="mt-4 rounded-lg border-2 border-rose-300 bg-rose-50 p-3 text-sm font-semibold text-rose-900">
              We could not load your verification history. Try again from My Kit.
            </div>
          ) : vouches.data?.length ? (
            <ul className="mt-4 divide-y-2 divide-border rounded-xl border-2 border-border">
              {vouches.data.slice(0, 3).map((vouch) => (
                <li key={vouch.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span className="min-w-0 font-bold">{vouch.skillName || "Character or skills reference"}</span>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-extrabold ${vouch.status === "verified" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>{vouch.status}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-4 rounded-xl border-2 border-dashed border-border bg-muted/30 p-5 text-sm text-muted-foreground">
              No verification requests yet. Start with one person who can speak to a real skill, project or contribution.
            </div>
          )}
        </div>
        <aside className="brutal-card bg-amber-50 p-5" aria-labelledby="privacy-heading">
          <i className="fa-solid fa-shield-halved text-2xl text-amber-700" aria-hidden="true" />
          <h2 id="privacy-heading" className="mt-3 text-lg font-black">You stay in control</h2>
          <p className="mt-2 text-sm leading-6 text-amber-950/80">Review contact-sharing preferences before applying. Course completion and university admission decisions remain with your institution.</p>
          <button onClick={() => onNavigate("privacy-settings")} className="mt-4 brutal-btn bg-card px-4 py-2 text-sm text-foreground">Review privacy settings</button>
        </aside>
      </section>
    </div>
  );
}

function ActionCard({ icon, title, body, action, onClick }: { icon: string; title: string; body: string; action: string; onClick: () => void }) {
  return <article className="brutal-card bg-card p-5"><i className={`fa-solid ${icon} text-2xl text-primary`} aria-hidden="true" /><h3 className="mt-3 text-lg font-black">{title}</h3><p className="mt-2 min-h-12 text-sm leading-6 text-muted-foreground">{body}</p><button onClick={onClick} className="mt-4 font-extrabold text-primary underline underline-offset-4">{action} <span aria-hidden="true">→</span></button></article>;
}
