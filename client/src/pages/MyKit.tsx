import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

export function MyKit() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [form, setForm] = useState({ voucherName: "", voucherTitle: "", voucherOrg: "", voucherEmail: "", skillName: "" });
  const { data: vouches = [], isLoading, isError } = trpc.vouches.list.useQuery(undefined, { retry: false });
  const request = trpc.vouches.request.useMutation({
    onSuccess: () => {
      toast.success("Verification request sent.");
      setForm({ voucherName: "", voucherTitle: "", voucherOrg: "", voucherEmail: "", skillName: "" });
      void utils.vouches.list.invalidate();
    },
    onError: (error) => toast.error(error.message || "We could not send that verification request."),
  });
  const cancel = trpc.vouches.delete.useMutation({
    onSuccess: () => { toast.success("Pending request cancelled."); void utils.vouches.list.invalidate(); },
    onError: (error) => toast.error(error.message || "We could not cancel that request."),
  });

  const verified = vouches.filter((v) => v.status === "verified").length;
  const pending = vouches.filter((v) => v.status === "pending").length;

  return <div className="container mx-auto max-w-5xl px-4 py-8 space-y-6">
    <header className="brutal-card brutal-shadow bg-card p-6"><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">My Kit</p><h1 className="mt-2 text-3xl font-black">Your evidence, not a polished fiction.</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">Request a verification from someone who knows your work. A request is clearly marked pending until that person responds; JutJut does not create verified skills locally.</p></header>

    <section className="grid gap-4 sm:grid-cols-2" aria-label="Verification status"><Status label="Verified evidence" value={isLoading ? "—" : String(verified)} detail="Confirmed by a real verifier" tone="teal" /><Status label="Requests in progress" value={isLoading ? "—" : String(pending)} detail="Awaiting a response" tone="amber" /></section>

    <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <form onSubmit={(event) => { event.preventDefault(); request.mutate({ ...form, voucherTitle: form.voucherTitle || undefined, voucherOrg: form.voucherOrg || undefined, skillName: form.skillName || undefined, origin: window.location.origin }); }} className="brutal-card bg-card p-5 space-y-4" aria-labelledby="request-heading">
        <div><h2 id="request-heading" className="text-xl font-black">Ask for a verification</h2><p className="mt-1 text-sm text-muted-foreground">We will email the verifier a secure response link.</p></div>
        <Field label="Verifier's name" value={form.voucherName} onChange={(value) => setForm({ ...form, voucherName: value })} required />
        <Field label="Verifier's email" type="email" value={form.voucherEmail} onChange={(value) => setForm({ ...form, voucherEmail: value })} required />
        <Field label="Their role or relationship" value={form.voucherTitle} onChange={(value) => setForm({ ...form, voucherTitle: value })} placeholder="e.g. Shift supervisor" />
        <Field label="Organisation (optional)" value={form.voucherOrg} onChange={(value) => setForm({ ...form, voucherOrg: value })} />
        <Field label="What should they verify?" value={form.skillName} onChange={(value) => setForm({ ...form, skillName: value })} placeholder="e.g. Customer service in a volunteer role" />
        <button disabled={request.isPending} className="w-full brutal-btn bg-primary py-2.5 text-sm text-primary-foreground disabled:opacity-60">{request.isPending ? "Sending request…" : "Send verification request"}</button>
        <p className="text-xs leading-5 text-muted-foreground">Only ask people who can accurately confirm the item. You can cancel a pending request; completed decisions remain an account record.</p>
      </form>

      <section className="brutal-card bg-card p-5" aria-labelledby="history-heading"><div className="flex items-start justify-between gap-3"><div><h2 id="history-heading" className="text-xl font-black">Verification history</h2><p className="mt-1 text-sm text-muted-foreground">Your actual requests and outcomes.</p></div><span className="text-xs font-bold text-muted-foreground">{user?.email || "Signed-in account"}</span></div>
        {isError ? <div role="alert" className="mt-5 rounded-xl border-2 border-rose-300 bg-rose-50 p-4 text-sm font-semibold text-rose-900">Your Kit could not be loaded right now. Please refresh and try again.</div> : isLoading ? <div className="mt-5 h-28 animate-pulse rounded-xl bg-muted" /> : vouches.length === 0 ? <div className="mt-5 rounded-xl border-2 border-dashed border-border bg-muted/30 p-7 text-center text-sm text-muted-foreground">No verification requests yet.</div> : <ul className="mt-5 divide-y-2 divide-border overflow-hidden rounded-xl border-2 border-border">{vouches.map((vouch) => <li key={vouch.id} className="p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-extrabold">{vouch.skillName || "Skills or character reference"}</p><p className="mt-1 text-sm text-muted-foreground">Requested from {vouch.voucherName}{vouch.voucherTitle ? ` · ${vouch.voucherTitle}` : ""}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${vouch.status === "verified" ? "bg-emerald-100 text-emerald-800" : vouch.status === "rejected" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-900"}`}>{vouch.status}</span></div>{vouch.status === "pending" && <button onClick={() => cancel.mutate({ vouchId: vouch.id })} disabled={cancel.isPending} className="mt-3 text-sm font-extrabold text-rose-700 underline underline-offset-4">Cancel request</button>}</li>)}</ul>}</section>
    </section>
  </div>;
}

function Status({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: "teal" | "amber" }) { return <div className={`brutal-card p-5 ${tone === "teal" ? "bg-teal-50" : "bg-amber-50"}`}><p className="text-sm font-extrabold">{label}</p><p className="mt-1 text-3xl font-black">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>; }
function Field({ label, value, onChange, required, type = "text", placeholder }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string; placeholder?: string }) { const id = `kit-${label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`; return <div className="space-y-1"><label htmlFor={id} className="text-sm font-extrabold">{label}{required ? " *" : ""}</label><input id={id} type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-lg border-2 border-border bg-background px-3 py-2.5 text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/30" /></div>; }
