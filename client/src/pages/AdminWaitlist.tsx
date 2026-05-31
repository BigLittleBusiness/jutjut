/**
 * AdminWaitlist — admin-only view of all waitlist signups.
 * Shows a table with name, email, role, school, source, and date.
 * Includes a CSV export button and a total count badge.
 */

import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface AdminWaitlistProps {
  onNavigate: (page: string) => void;
}

const ROLE_LABELS: Record<string, string> = {
  student: "🎓 Student",
  employer: "💼 Employer",
  other: "👤 Other",
};

const ROLE_COLOURS: Record<string, string> = {
  student: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300",
  employer: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  other: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

export const AdminWaitlist: React.FC<AdminWaitlistProps> = ({ onNavigate }) => {
  const { data: signups, isLoading, error } = trpc.waitlist.list.useQuery();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "student" | "employer" | "other">("all");

  const filtered = (signups ?? []).filter((s) => {
    const matchesSearch =
      !search ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      (s.firstName ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (s.school ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || s.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleExportCsv = () => {
    if (!signups?.length) {
      toast.error("No signups to export.");
      return;
    }
    const headers = ["ID", "First Name", "Email", "Role", "School", "Source", "Date"];
    const rows = signups.map((s) => [
      s.id,
      s.firstName ?? "",
      s.email,
      s.role,
      s.school ?? "",
      s.source,
      new Date(s.createdAt).toISOString(),
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jutjut-waitlist-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${signups.length} signups.`);
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate("dashboard")}
            className="p-2 rounded-lg border-2 border-border bg-background hover:bg-accent transition-all"
            title="Back to Dashboard"
          >
            <i className="fa-solid fa-arrow-left text-sm"></i>
          </button>
          <div>
            <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
              <i className="fa-solid fa-list-check text-primary"></i>
              Waitlist Signups
            </h1>
            <p className="text-sm text-muted-foreground">
              {isLoading ? "Loading…" : `${signups?.length ?? 0} total signup${(signups?.length ?? 0) !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
        <button
          onClick={handleExportCsv}
          disabled={!signups?.length}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-primary bg-primary/10 hover:bg-primary/20 text-primary font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <i className="fa-solid fa-download"></i>
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="brutal-card brutal-shadow-teal bg-card mb-5 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm"></i>
          <input
            type="text"
            placeholder="Search by name, email, or school…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border-2 border-border bg-background text-sm font-medium focus:outline-none focus:border-primary transition-colors"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["all", "student", "employer", "other"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-lg border-2 text-xs font-bold transition-all ${
                roleFilter === r
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:bg-accent"
              }`}
            >
              {r === "all" ? "All roles" : ROLE_LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      {/* Summary stats */}
      {signups && signups.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          {(["student", "employer", "other"] as const).map((r) => {
            const count = signups.filter((s) => s.role === r).length;
            return (
              <div key={r} className="brutal-card bg-card text-center py-3">
                <div className="text-2xl font-black text-foreground">{count}</div>
                <div className="text-xs font-bold text-muted-foreground mt-0.5">{ROLE_LABELS[r]}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table / states */}
      {isLoading ? (
        <div className="brutal-card bg-card flex items-center justify-center py-16 text-muted-foreground gap-3">
          <i className="fa-solid fa-spinner fa-spin"></i>
          <span className="font-bold">Loading signups…</span>
        </div>
      ) : error ? (
        <div className="brutal-card bg-red-50 dark:bg-red-950/30 border-red-400 text-red-700 dark:text-red-400 py-10 text-center">
          <i className="fa-solid fa-triangle-exclamation text-2xl mb-2 block"></i>
          <p className="font-bold">Failed to load waitlist signups.</p>
          <p className="text-sm mt-1">{error.message}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="brutal-card bg-card py-16 text-center text-muted-foreground">
          <i className="fa-solid fa-inbox text-4xl mb-3 block opacity-30"></i>
          <p className="font-bold text-lg">
            {signups?.length === 0 ? "No signups yet" : "No results match your filters"}
          </p>
          <p className="text-sm mt-1">
            {signups?.length === 0
              ? "Share the landing page to start collecting signups."
              : "Try adjusting your search or role filter."}
          </p>
        </div>
      ) : (
        <div className="brutal-card bg-card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-border">
                <th className="text-left px-4 py-3 font-extrabold text-xs uppercase tracking-wider text-muted-foreground">#</th>
                <th className="text-left px-4 py-3 font-extrabold text-xs uppercase tracking-wider text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-extrabold text-xs uppercase tracking-wider text-muted-foreground">Email</th>
                <th className="text-left px-4 py-3 font-extrabold text-xs uppercase tracking-wider text-muted-foreground">Role</th>
                <th className="text-left px-4 py-3 font-extrabold text-xs uppercase tracking-wider text-muted-foreground">School</th>
                <th className="text-left px-4 py-3 font-extrabold text-xs uppercase tracking-wider text-muted-foreground">Source</th>
                <th className="text-left px-4 py-3 font-extrabold text-xs uppercase tracking-wider text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((signup, idx) => (
                <tr
                  key={signup.id}
                  className="border-b border-border last:border-0 hover:bg-accent/40 transition-colors"
                >
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{signup.id}</td>
                  <td className="px-4 py-3 font-bold text-foreground">
                    {signup.firstName || <span className="text-muted-foreground italic text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-foreground font-mono text-xs">{signup.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${ROLE_COLOURS[signup.role] ?? ""}`}>
                      {ROLE_LABELS[signup.role] ?? signup.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-foreground text-xs">
                    {signup.school || <span className="text-muted-foreground italic">—</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs font-mono">{signup.source}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                    {new Date(signup.createdAt).toLocaleDateString("en-AU", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length < (signups?.length ?? 0) && (
            <div className="px-4 py-2 text-xs text-muted-foreground border-t border-border">
              Showing {filtered.length} of {signups?.length} signups
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminWaitlist;
