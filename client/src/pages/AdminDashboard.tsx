/**
 * AdminDashboard — full admin control panel for JutJut.
 * Sections: Overview, School Management, Promo Codes, The Drop Queue,
 * Employer Moderation, Student Support, Payments, Admin Management,
 * Global Search, System Logs.
 */

import React, { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

// ─── Sidebar navigation ───────────────────────────────────────────────────────

type Section =
  | "overview"
  | "schools"
  | "promos"
  | "drops"
  | "employers"
  | "students"
  | "payments"
  | "admins"
  | "search"
  | "logs"
  | "emailLogs"
  | "emailPreview";

const NAV: { id: Section; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: "📊" },
  { id: "schools", label: "School Management", icon: "🏫" },
  { id: "promos", label: "Promo Codes", icon: "🎟️" },
  { id: "drops", label: "The Drop Queue", icon: "⚡" },
  { id: "employers", label: "Employer Moderation", icon: "🏢" },
  { id: "students", label: "Student Support", icon: "🎓" },
  { id: "payments", label: "Payments", icon: "💳" },
  { id: "admins", label: "Admin Management", icon: "🔑" },
  { id: "search", label: "Global Search", icon: "🔍" },
  { id: "logs", label: "System Logs", icon: "📋" },
  { id: "emailLogs", label: "Email Logs", icon: "📨" },
  { id: "emailPreview", label: "Email Previewer", icon: "🖼️" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

// ─── Overview section ─────────────────────────────────────────────────────────

function OverviewSection() {
  const { data, isLoading } = trpc.admin.overview.metrics.useQuery();

  if (isLoading) return <p className="text-muted-foreground">Loading metrics…</p>;
  if (!data) return <p className="text-destructive">Failed to load metrics.</p>;

  const stats = [
    { label: "Students", value: data.totalStudents, icon: "🎓" },
    { label: "Employers", value: data.totalEmployers, icon: "🏢" },
    { label: "Approved Schools", value: data.approvedSchools, icon: "🏫" },
    { label: "Active Jobs", value: data.activeJobs, icon: "💼" },
    { label: "Drop Claims (30d)", value: data.dropClaimsThisMonth, icon: "⚡" },
    { label: "Revenue (30d)", value: fmtMoney(data.revenueThisMonthCents ?? 0), icon: "💰" },
    { label: "Waitlist Total", value: data.waitlistTotal, icon: "📋" },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Platform Overview</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <Card key={s.label} className="border-2">
            <CardContent className="pt-4 pb-4">
              <div className="text-3xl mb-1">{s.icon}</div>
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      {data.signupsLast30Days && data.signupsLast30Days.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">New Signups — Last 30 Days</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Signups</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.signupsLast30Days.map((row: { date: string; signups: number }) => (
                    <TableRow key={row.date}>
                      <TableCell>{row.date}</TableCell>
                      <TableCell>{row.signups}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── School management section ────────────────────────────────────────────────

function SchoolsSection() {
  const [tab, setTab] = useState<"requests" | "approved" | "groups">("requests");
  const [requestFilter, setRequestFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [search, setSearch] = useState("");
  const [selectedSchoolId, setSelectedSchoolId] = useState<number | null>(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [createSchoolOpen, setCreateSchoolOpen] = useState(false);
  const [newSchool, setNewSchool] = useState({ name: "", domain: "", careersContactName: "", careersContactEmail: "", phone: "", state: "" });

  const utils = trpc.useUtils();

  const requestsQuery = trpc.admin.schools.requests.list.useQuery({
    status: requestFilter === "all" ? undefined : requestFilter,
  });
  const schoolsQuery = trpc.admin.schools.list.useQuery({ search });
  const groupsQuery = trpc.admin.schools.groups.list.useQuery(
    { schoolId: selectedSchoolId! },
    { enabled: selectedSchoolId !== null }
  );

  const approveMut = trpc.admin.schools.requests.approve.useMutation({
    onSuccess: () => { toast.success("Request approved"); utils.admin.schools.requests.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const rejectMut = trpc.admin.schools.requests.reject.useMutation({
    onSuccess: () => { toast.success("Request rejected"); utils.admin.schools.requests.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const createSchoolMut = trpc.admin.schools.create.useMutation({
    onSuccess: () => { toast.success("School created"); setCreateSchoolOpen(false); utils.admin.schools.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const createGroupMut = trpc.admin.schools.groups.create.useMutation({
    onSuccess: () => { toast.success("Group created"); setNewGroupName(""); utils.admin.schools.groups.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteGroupMut = trpc.admin.schools.groups.delete.useMutation({
    onSuccess: () => { toast.success("Group deleted"); utils.admin.schools.groups.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">School Management</h2>
      <div className="flex gap-2">
        {(["requests", "approved", "groups"] as const).map(t => (
          <Button key={t} variant={tab === t ? "default" : "outline"} size="sm" onClick={() => setTab(t)}>
            {t === "requests" ? "Access Requests" : t === "approved" ? "Approved Schools" : "Student Groups"}
          </Button>
        ))}
      </div>

      {tab === "requests" && (
        <div className="space-y-3">
          <div className="flex gap-2">
            {(["pending", "approved", "rejected", "all"] as const).map(s => (
              <Button key={s} variant={requestFilter === s ? "default" : "outline"} size="sm" onClick={() => setRequestFilter(s)}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Button>
            ))}
          </div>
          {requestsQuery.isLoading && <p className="text-muted-foreground">Loading…</p>}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>School</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(requestsQuery.data ?? []).map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.schoolName}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.domain}</TableCell>
                    <TableCell>
                      <div className="text-sm">{r.contactName}</div>
                      <div className="text-xs text-muted-foreground">{r.contactEmail}</div>
                    </TableCell>
                    <TableCell className="text-xs">{fmt(r.createdAt)}</TableCell>
                    <TableCell>
                      <Badge variant={r.status === "pending" ? "secondary" : r.status === "approved" ? "default" : "destructive"}>
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {r.status === "pending" && (
                        <div className="flex gap-1">
                          <Button size="sm" onClick={() => approveMut.mutate({ id: r.id })}>Approve</Button>
                          <Button size="sm" variant="destructive" onClick={() => rejectMut.mutate({ id: r.id })}>Reject</Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {(requestsQuery.data ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No requests found.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {tab === "approved" && (
        <div className="space-y-3">
          <div className="flex gap-2 items-center">
            <Input placeholder="Search schools…" value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
            <Dialog open={createSchoolOpen} onOpenChange={setCreateSchoolOpen}>
              <DialogTrigger asChild>
                <Button size="sm">+ Add School</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add School</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  {(["name", "domain", "careersContactName", "careersContactEmail", "phone", "state"] as const).map(f => (
                    <div key={f}>
                      <Label>{f}</Label>
                      <Input value={newSchool[f]} onChange={e => setNewSchool(p => ({ ...p, [f]: e.target.value }))} />
                    </div>
                  ))}
                  <Button className="w-full" onClick={() => createSchoolMut.mutate(newSchool)} disabled={createSchoolMut.isPending}>
                    {createSchoolMut.isPending ? "Creating…" : "Create School"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Approved</TableHead>
                  <TableHead>Groups</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(schoolsQuery.data ?? []).map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{s.domain}</TableCell>
                    <TableCell>
                      <div className="text-sm">{s.careersContactName ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{s.careersContactEmail ?? "—"}</div>
                    </TableCell>
                    <TableCell>{s.state ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={s.approved ? "default" : "secondary"}>{s.approved ? "Yes" : "Pending"}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => { setSelectedSchoolId(s.id); setTab("groups"); }}>
                        Manage Groups
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {tab === "groups" && (
        <div className="space-y-3">
          {selectedSchoolId === null ? (
            <p className="text-muted-foreground">Select a school from the Approved Schools tab to manage its groups.</p>
          ) : (
            <>
              <div className="flex gap-2 items-center">
                <Input placeholder="New group name…" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} className="max-w-xs" />
                <Button size="sm" onClick={() => createGroupMut.mutate({ schoolId: selectedSchoolId, groupName: newGroupName })} disabled={!newGroupName.trim()}>
                  + Add Group
                </Button>
                <Button size="sm" variant="outline" onClick={() => setSelectedSchoolId(null)}>← Back</Button>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Group Name</TableHead>
                      <TableHead>Members</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(groupsQuery.data ?? []).map((g: any) => (
                      <TableRow key={g.group.id}>
                        <TableCell className="font-medium">{g.group.groupName}</TableCell>
                        <TableCell>{g.memberCount}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="destructive" onClick={() => deleteGroupMut.mutate({ id: g.group.id })}>Delete</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(groupsQuery.data ?? []).length === 0 && (
                      <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">No groups yet.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Promo codes section ──────────────────────────────────────────────────────

function PromosSection() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.admin.promoCodes.list.useQuery();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code: "", discountType: "fixed" as "fixed" | "percentage", discountValue: 0, bonusCredits: 0, maxUses: "", expiresAt: "" });

  const createMut = trpc.admin.promoCodes.create.useMutation({
    onSuccess: () => { toast.success("Promo code created"); setOpen(false); utils.admin.promoCodes.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.admin.promoCodes.update.useMutation({
    onSuccess: () => { toast.success("Updated"); utils.admin.promoCodes.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Promo Codes</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm">+ New Code</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Promo Code</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Code</Label><Input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} /></div>
              <div>
                <Label>Discount Type</Label>
                <Select value={form.discountType} onValueChange={(v: "fixed" | "percentage") => setForm(p => ({ ...p, discountType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed ($)</SelectItem>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Discount Value</Label><Input type="number" value={form.discountValue} onChange={e => setForm(p => ({ ...p, discountValue: +e.target.value }))} /></div>
              <div><Label>Bonus Credits</Label><Input type="number" value={form.bonusCredits} onChange={e => setForm(p => ({ ...p, bonusCredits: +e.target.value }))} /></div>
              <div><Label>Max Uses (blank = unlimited)</Label><Input type="number" value={form.maxUses} onChange={e => setForm(p => ({ ...p, maxUses: e.target.value }))} /></div>
              <div><Label>Expires At (blank = never)</Label><Input type="datetime-local" value={form.expiresAt} onChange={e => setForm(p => ({ ...p, expiresAt: e.target.value }))} /></div>
              <Button className="w-full" disabled={createMut.isPending} onClick={() => createMut.mutate({
                code: form.code, discountType: form.discountType, discountValue: form.discountValue,
                bonusCredits: form.bonusCredits,
                maxUses: form.maxUses ? parseInt(form.maxUses) : null,
                expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
              })}>
                {createMut.isPending ? "Creating…" : "Create"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Bonus Credits</TableHead>
              <TableHead>Uses</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Active</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data ?? []).map((p: any) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono font-bold">{p.code}</TableCell>
                <TableCell>{p.discountType === "fixed" ? `$${p.discountValue}` : `${p.discountValue}%`}</TableCell>
                <TableCell>{p.bonusCredits}</TableCell>
                <TableCell>{p.usedCount}{p.maxUses ? ` / ${p.maxUses}` : ""}</TableCell>
                <TableCell className="text-xs">{fmt(p.expiresAt)}</TableCell>
                <TableCell><Badge variant={p.isActive ? "default" : "secondary"}>{p.isActive ? "Active" : "Inactive"}</Badge></TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" onClick={() => updateMut.mutate({ id: p.id, isActive: !p.isActive })}>
                    {p.isActive ? "Deactivate" : "Activate"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─── The Drop queue section ───────────────────────────────────────────────────

function DropsSection() {
  const utils = trpc.useUtils();
  const [statusFilter, setStatusFilter] = useState<"draft" | "active" | "expired" | "all">("draft");
  const { data, isLoading } = trpc.admin.drops.list.useQuery({
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const publishMut = trpc.admin.drops.publish.useMutation({
    onSuccess: () => { toast.success("Drop published"); utils.admin.drops.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const rejectMut = trpc.admin.drops.reject.useMutation({
    onSuccess: () => { toast.success("Drop rejected"); utils.admin.drops.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">The Drop Queue</h2>
      <div className="flex gap-2">
        {(["draft", "active", "expired", "all"] as const).map(s => (
          <Button key={s} size="sm" variant={statusFilter === s ? "default" : "outline"} onClick={() => setStatusFilter(s)}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Button>
        ))}
      </div>
      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Scheduled</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data ?? []).map((d: any) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{d.title ?? `Drop #${d.id}`}</TableCell>
                <TableCell>
                  <Badge variant={d.status === "active" ? "default" : d.status === "draft" ? "secondary" : "outline"}>{d.status}</Badge>
                </TableCell>
                <TableCell className="text-xs">{fmt(d.scheduledDate)}</TableCell>
                <TableCell className="text-xs">{fmt(d.createdAt)}</TableCell>
                <TableCell>
                  {d.status === "draft" && (
                    <div className="flex gap-1">
                      <Button size="sm" onClick={() => publishMut.mutate({ id: d.id })}>Publish</Button>
                      <Button size="sm" variant="destructive" onClick={() => rejectMut.mutate({ id: d.id })}>Reject</Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {(data ?? []).length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No drops found.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─── Employer moderation section ──────────────────────────────────────────────

function EmployersSection() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "suspended" | "all">("all");
  const [suspendReason, setSuspendReason] = useState("");
  const [suspendId, setSuspendId] = useState<number | null>(null);
  const [creditEmployerId, setCreditEmployerId] = useState<number | null>(null);
  const [creditDelta, setCreditDelta] = useState(0);
  const [creditReason, setCreditReason] = useState("");

  const { data, isLoading } = trpc.admin.employers.list.useQuery({
    search: search || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
  });
  const flaggedQuery = trpc.admin.employers.flaggedJobs.useQuery();

  const suspendMut = trpc.admin.employers.suspend.useMutation({
    onSuccess: () => { toast.success("Employer suspended"); setSuspendId(null); utils.admin.employers.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const reinstateMut = trpc.admin.employers.reinstate.useMutation({
    onSuccess: () => { toast.success("Employer reinstated"); utils.admin.employers.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const creditMut = trpc.admin.employers.adjustCredits.useMutation({
    onSuccess: () => { toast.success("Credits adjusted"); setCreditEmployerId(null); utils.admin.employers.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const resolveJobMut = trpc.admin.employers.resolveJob.useMutation({
    onSuccess: () => { toast.success("Job updated"); utils.admin.employers.flaggedJobs.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Employer Moderation</h2>

      {/* Employer list */}
      <Card>
        <CardHeader><CardTitle>Employers</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <Input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
            {(["all", "active", "suspended"] as const).map(s => (
              <Button key={s} size="sm" variant={statusFilter === s ? "default" : "outline"} onClick={() => setStatusFilter(s)}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Button>
            ))}
          </div>
          {isLoading && <p className="text-muted-foreground">Loading…</p>}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data ?? []).map((row: any) => (
                  <TableRow key={row.employer.id}>
                    <TableCell className="font-medium">{row.employer.businessName}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{row.employer.contactEmail}</TableCell>
                    <TableCell>{row.credits?.creditBalance ?? 0}</TableCell>
                    <TableCell>
                      <Badge variant={row.employer.status === "active" ? "default" : "destructive"}>{row.employer.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {row.employer.status === "active" ? (
                          <Button size="sm" variant="destructive" onClick={() => setSuspendId(row.employer.id)}>Suspend</Button>
                        ) : (
                          <Button size="sm" onClick={() => reinstateMut.mutate({ id: row.employer.id })}>Reinstate</Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => { setCreditEmployerId(row.employer.id); setCreditDelta(0); setCreditReason(""); }}>
                          Credits
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Flagged jobs */}
      <Card>
        <CardHeader><CardTitle>Flagged Jobs</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job</TableHead>
                  <TableHead>Employer</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(flaggedQuery.data ?? []).map((row: any) => (
                  <TableRow key={row.job.id}>
                    <TableCell className="font-medium">{row.job.title}</TableCell>
                    <TableCell className="text-xs">{row.employer?.businessName ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{row.job.reportReason ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => resolveJobMut.mutate({ jobId: row.job.id, action: "clear_flag" })}>Clear Flag</Button>
                        <Button size="sm" variant="destructive" onClick={() => resolveJobMut.mutate({ jobId: row.job.id, action: "deactivate" })}>Deactivate</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(flaggedQuery.data ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No flagged jobs.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Suspend dialog */}
      <Dialog open={suspendId !== null} onOpenChange={open => { if (!open) setSuspendId(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Suspend Employer</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>Reason for suspension</Label>
            <Input value={suspendReason} onChange={e => setSuspendReason(e.target.value)} placeholder="Describe the reason…" />
            <Button className="w-full" variant="destructive" disabled={!suspendReason.trim() || suspendMut.isPending}
              onClick={() => suspendId && suspendMut.mutate({ id: suspendId, reason: suspendReason })}>
              {suspendMut.isPending ? "Suspending…" : "Confirm Suspension"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Credit adjustment dialog */}
      <Dialog open={creditEmployerId !== null} onOpenChange={open => { if (!open) setCreditEmployerId(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adjust Credits</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>Delta (positive = add, negative = deduct)</Label>
            <Input type="number" value={creditDelta} onChange={e => setCreditDelta(+e.target.value)} />
            <Label>Reason</Label>
            <Input value={creditReason} onChange={e => setCreditReason(e.target.value)} placeholder="Reason…" />
            <Button className="w-full" disabled={!creditReason.trim() || creditMut.isPending}
              onClick={() => creditEmployerId && creditMut.mutate({ employerId: creditEmployerId, delta: creditDelta, reason: creditReason })}>
              {creditMut.isPending ? "Adjusting…" : "Apply"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Student support section ──────────────────────────────────────────────────

function StudentsSection() {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState("");

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 400);
    return () => clearTimeout(t);
  }, [query]);

  const searchQuery = trpc.admin.students.search.useQuery(
    { query: debouncedQuery },
    { enabled: debouncedQuery.length >= 2 }
  );
  const detailQuery = trpc.admin.students.get.useQuery(
    { id: selectedId! },
    { enabled: selectedId !== null }
  );

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Student Support</h2>
      <Input placeholder="Search by name or email…" value={query} onChange={e => setQuery(e.target.value)} className="max-w-md" />

      {searchQuery.data && (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Year Level</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {searchQuery.data.map((u: any) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{u.email}</TableCell>
                  <TableCell>{u.yearLevel ?? "—"}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => setSelectedId(u.id)}>View</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {selectedId !== null && detailQuery.data && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>{detailQuery.data.user.name}</span>
              <Button size="sm" variant="outline" onClick={() => setSelectedId(null)}>← Back</Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">Email:</span> {detailQuery.data.user.email}</div>
              <div><span className="text-muted-foreground">Year Level:</span> {(detailQuery.data.user as any).yearLevel ?? "—"}</div>
              <div><span className="text-muted-foreground">Role:</span> {detailQuery.data.user.role}</div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Applications ({detailQuery.data.applications.length})</h4>
              {detailQuery.data.applications.length === 0 ? (
                <p className="text-muted-foreground text-sm">No applications.</p>
              ) : (
                <div className="space-y-1">
                  {detailQuery.data.applications.map((a: any) => (
                    <div key={a.id} className="text-sm flex justify-between border-b pb-1">
                      <span>Job #{a.jobId}</span>
                      <Badge variant="secondary">{a.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <h4 className="font-semibold mb-2">Placements ({detailQuery.data.placements.length})</h4>
              {detailQuery.data.placements.length === 0 ? (
                <p className="text-muted-foreground text-sm">No placements.</p>
              ) : (
                <div className="space-y-1">
                  {detailQuery.data.placements.map((p: any) => (
                    <div key={p.id} className="text-sm flex justify-between border-b pb-1">
                      <span>{p.startDate} → {p.endDate}</span>
                      <Badge variant="secondary">{p.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Payments section ─────────────────────────────────────────────────────────

function PaymentsSection() {
  const utils = trpc.useUtils();
  const [statusFilter, setStatusFilter] = useState<"pending" | "succeeded" | "refunded" | "all">("all");
  const [gatewayKey, setGatewayKey] = useState("");
  const [gatewayValue, setGatewayValue] = useState("");

  const txQuery = trpc.admin.payments.transactions.useQuery({
    status: statusFilter === "all" ? undefined : statusFilter,
  });
  const gatewayQuery = trpc.admin.payments.gatewaySettings.useQuery();

  const refundMut = trpc.admin.payments.refund.useMutation({
    onSuccess: () => { toast.success("Marked as refunded"); utils.admin.payments.transactions.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const setGatewayMut = trpc.admin.payments.setGatewaySetting.useMutation({
    onSuccess: () => { toast.success("Gateway setting saved"); setGatewayKey(""); setGatewayValue(""); utils.admin.payments.gatewaySettings.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Payment Management</h2>

      <Card>
        <CardHeader><CardTitle>Transactions</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            {(["all", "pending", "succeeded", "refunded"] as const).map(s => (
              <Button key={s} size="sm" variant={statusFilter === s ? "default" : "outline"} onClick={() => setStatusFilter(s)}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Button>
            ))}
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Employer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(txQuery.data ?? []).map((row: any) => (
                  <TableRow key={row.transaction.id}>
                    <TableCell className="font-mono text-xs">{row.transaction.id}</TableCell>
                    <TableCell className="text-sm">{row.employer?.businessName ?? "—"}</TableCell>
                    <TableCell>{fmtMoney(row.transaction.amountCents)}</TableCell>
                    <TableCell>
                      <Badge variant={row.transaction.status === "succeeded" ? "default" : row.transaction.status === "refunded" ? "secondary" : "outline"}>
                        {row.transaction.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{fmt(row.transaction.createdAt)}</TableCell>
                    <TableCell>
                      {row.transaction.status === "succeeded" && (
                        <Button size="sm" variant="outline" onClick={() => refundMut.mutate({ transactionId: row.transaction.id })}>
                          Refund
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {(txQuery.data ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No transactions.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Gateway Settings (Encrypted)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key Name</TableHead>
                  <TableHead>Value (masked)</TableHead>
                  <TableHead>Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(gatewayQuery.data ?? []).map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-sm">{s.keyName}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">{s.maskedValue}</TableCell>
                    <TableCell className="text-xs">{fmt(s.updatedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="border-t pt-4 space-y-3">
            <h4 className="font-semibold text-sm">Set / Update a Key</h4>
            <div className="flex gap-2 flex-wrap">
              <Input placeholder="Key name (e.g. pin_secret_key)" value={gatewayKey} onChange={e => setGatewayKey(e.target.value)} className="max-w-xs" />
              <Input type="password" placeholder="Value" value={gatewayValue} onChange={e => setGatewayValue(e.target.value)} className="max-w-xs" />
              <Button disabled={!gatewayKey.trim() || !gatewayValue.trim() || setGatewayMut.isPending}
                onClick={() => setGatewayMut.mutate({ keyName: gatewayKey, plainValue: gatewayValue })}>
                {setGatewayMut.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Admin management section ─────────────────────────────────────────────────

function AdminsSection({ currentUserId }: { currentUserId: number }) {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.admin.admins.list.useQuery();
  const [promoteEmail, setPromoteEmail] = useState("");

  const promoteMut = trpc.admin.admins.promote.useMutation({
    onSuccess: () => { toast.success("User promoted to admin"); setPromoteEmail(""); utils.admin.admins.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const demoteMut = trpc.admin.admins.demote.useMutation({
    onSuccess: () => { toast.success("Admin demoted"); utils.admin.admins.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Admin Management</h2>
      <Card>
        <CardHeader><CardTitle>Promote User to Admin</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input placeholder="User email…" value={promoteEmail} onChange={e => setPromoteEmail(e.target.value)} className="max-w-xs" />
            <Button disabled={!promoteEmail.trim() || promoteMut.isPending}
              onClick={() => promoteMut.mutate({ email: promoteEmail })}>
              {promoteMut.isPending ? "Promoting…" : "Promote"}
            </Button>
          </div>
        </CardContent>
      </Card>
      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data ?? []).map((u: any) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{u.email}</TableCell>
                <TableCell>
                  {u.id !== currentUserId && (
                    <Button size="sm" variant="destructive" onClick={() => demoteMut.mutate({ userId: u.id })}>Demote</Button>
                  )}
                  {u.id === currentUserId && <span className="text-xs text-muted-foreground">You</span>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─── Global search section ────────────────────────────────────────────────────

function SearchSection() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 400);
    return () => clearTimeout(t);
  }, [query]);

  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.admin.search.useQuery(
    { query: debouncedQuery },
    { enabled: debouncedQuery.length >= 2 }
  );

  const detailQuery = trpc.admin.students.get.useQuery(
    { id: selectedUser?.id ?? 0 },
    { enabled: detailOpen && !!selectedUser }
  );

  const suspendMutation = trpc.admin.students.suspend.useMutation({
    onSuccess: () => {
      toast.success(`${selectedUser?.name ?? "User"} suspended.`);
      setSuspendOpen(false);
      setSuspendReason("");
      utils.admin.search.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const reinstateMutation = trpc.admin.students.reinstate.useMutation({
    onSuccess: () => {
      toast.success(`${selectedUser?.name ?? "User"} reinstated.`);
      utils.admin.search.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const promoteMutation = trpc.admin.admins.promote.useMutation({
    onSuccess: () => {
      toast.success(`${selectedUser?.name ?? "User"} promoted to admin.`);
      utils.admin.search.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const demoteMutation = trpc.admin.admins.demote.useMutation({
    onSuccess: () => {
      toast.success(`${selectedUser?.name ?? "User"} demoted to user.`);
      utils.admin.search.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  function openSuspend(u: any) {
    setSelectedUser(u);
    setSuspendReason("");
    setSuspendOpen(true);
  }

  function openDetail(u: any) {
    setSelectedUser(u);
    setDetailOpen(true);
  }

  const statusBadge = (u: any) => {
    const s = (u as any).status ?? "active";
    return (
      <Badge variant={s === "suspended" ? "destructive" : "secondary"}
        className="text-[10px] px-1.5 py-0">
        {s}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Global User Search</h2>
      <p className="text-sm text-muted-foreground">Search by name or email. Quick actions are available inline for each result.</p>
      <Input
        placeholder="Search by name or email…"
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="max-w-md"
        autoFocus
      />

      {isLoading && debouncedQuery.length >= 2 && (
        <p className="text-sm text-muted-foreground animate-pulse">Searching…</p>
      )}

      {data && (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Quick Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((u: any) => (
                <TableRow key={u.id} className="group hover:bg-muted/30 transition-colors">
                  {/* User identity */}
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm">{u.name ?? "—"}</span>
                      <span className="text-xs text-muted-foreground">{u.email}</span>
                      <span className="text-[10px] text-muted-foreground/60">ID #{u.id}</span>
                    </div>
                  </TableCell>

                  {/* Role badge */}
                  <TableCell>
                    <Badge variant={u.role === "admin" ? "default" : "outline"} className="text-xs">
                      {u.role === "admin" ? "🔑 Admin" : "👤 User"}
                    </Badge>
                  </TableCell>

                  {/* Status badge */}
                  <TableCell>{statusBadge(u)}</TableCell>

                  {/* Joined date */}
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {fmt(u.createdAt)}
                  </TableCell>

                  {/* Quick action buttons */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5 flex-wrap">
                      {/* View Details */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs px-2 gap-1"
                        onClick={() => openDetail(u)}
                      >
                        🔍 View Details
                      </Button>

                      {/* Suspend / Reinstate */}
                      {(u as any).status === "suspended" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs px-2 gap-1 border-emerald-500 text-emerald-700 hover:bg-emerald-50"
                          disabled={reinstateMutation.isPending}
                          onClick={() => {
                            setSelectedUser(u);
                            reinstateMutation.mutate({ id: u.id });
                          }}
                        >
                          ✅ Reinstate
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs px-2 gap-1 border-red-400 text-red-600 hover:bg-red-50"
                          onClick={() => openSuspend(u)}
                        >
                          🚫 Suspend
                        </Button>
                      )}

                      {/* Promote / Demote admin */}
                      {u.role === "user" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs px-2 gap-1 border-violet-400 text-violet-700 hover:bg-violet-50"
                          disabled={promoteMutation.isPending}
                          onClick={() => {
                            setSelectedUser(u);
                            if (u.email) promoteMutation.mutate({ email: u.email });
                          }}
                        >
                          🔑 Make Admin
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs px-2 gap-1 border-amber-400 text-amber-700 hover:bg-amber-50"
                          disabled={demoteMutation.isPending}
                          onClick={() => {
                            setSelectedUser(u);
                            demoteMutation.mutate({ userId: u.id });
                          }}
                        >
                          ↓ Remove Admin
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No users found for &ldquo;{debouncedQuery}&rdquo;.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Suspend dialog ──────────────────────────────────────────────── */}
      <Dialog open={suspendOpen} onOpenChange={setSuspendOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Suspend {selectedUser?.name ?? "User"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              The user will be marked as suspended. Provide a reason for the audit log.
            </p>
            <div className="space-y-1">
              <Label>Reason <span className="text-red-500">*</span></Label>
              <Input
                placeholder="e.g. Violation of community guidelines"
                value={suspendReason}
                onChange={e => setSuspendReason(e.target.value)}
                maxLength={500}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setSuspendOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={!suspendReason.trim() || suspendMutation.isPending}
              onClick={() => suspendMutation.mutate({ id: selectedUser.id, reason: suspendReason.trim() })}
            >
              {suspendMutation.isPending ? "Suspending…" : "Confirm Suspend"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── View Details dialog ─────────────────────────────────────────── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Details — {selectedUser?.name ?? ""}</DialogTitle>
          </DialogHeader>
          {detailQuery.isLoading && <p className="text-muted-foreground py-4">Loading…</p>}
          {detailQuery.data && (
            <div className="space-y-4 py-2">
              {/* Identity card */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Identity</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">ID:</span> #{detailQuery.data.user.id}</div>
                  <div><span className="text-muted-foreground">Name:</span> {detailQuery.data.user.name ?? "—"}</div>
                  <div><span className="text-muted-foreground">Email:</span> {detailQuery.data.user.email ?? "—"}</div>
                  <div><span className="text-muted-foreground">Role:</span> <Badge variant={detailQuery.data.user.role === "admin" ? "default" : "secondary"}>{detailQuery.data.user.role}</Badge></div>
                  <div><span className="text-muted-foreground">Status:</span> {statusBadge(detailQuery.data.user)}</div>
                  <div><span className="text-muted-foreground">Joined:</span> {fmt(detailQuery.data.user.createdAt)}</div>
                  <div><span className="text-muted-foreground">Year Level:</span> {(detailQuery.data.user as any).yearLevel ?? "—"}</div>
                  {(detailQuery.data.user as any).suspendedReason && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Suspension reason:</span>{" "}
                      <span className="text-red-600 text-xs">{(detailQuery.data.user as any).suspendedReason}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Applications */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Job Applications ({detailQuery.data.applications.length})</CardTitle></CardHeader>
                <CardContent>
                  {detailQuery.data.applications.length === 0
                    ? <p className="text-xs text-muted-foreground">No applications.</p>
                    : (
                      <div className="space-y-1">
                        {detailQuery.data.applications.map((a: any) => (
                          <div key={a.id} className="flex justify-between text-xs border-b pb-1">
                            <span>{a.jobTitle ?? `Job #${a.jobId}`}</span>
                            <Badge variant="outline" className="text-[10px]">{a.status}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                </CardContent>
              </Card>

              {/* Placements */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Placements ({detailQuery.data.placements.length})</CardTitle></CardHeader>
                <CardContent>
                  {detailQuery.data.placements.length === 0
                    ? <p className="text-xs text-muted-foreground">No placements.</p>
                    : (
                      <div className="space-y-1">
                        {detailQuery.data.placements.map((p: any) => (
                          <div key={p.id} className="flex justify-between text-xs border-b pb-1">
                            <span>Employer #{p.employerId}</span>
                            <Badge variant="outline" className="text-[10px]">{p.status}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                </CardContent>
              </Card>

              {/* Inline quick actions inside detail dialog */}
              <div className="flex gap-2 pt-2 border-t flex-wrap">
                {(detailQuery.data.user as any).status === "suspended" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-emerald-500 text-emerald-700 hover:bg-emerald-50"
                    disabled={reinstateMutation.isPending}
                    onClick={() => {
                      setSelectedUser(detailQuery.data!.user);
                      reinstateMutation.mutate({ id: detailQuery.data!.user.id });
                      setDetailOpen(false);
                    }}
                  >
                    ✅ Reinstate User
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-400 text-red-600 hover:bg-red-50"
                    onClick={() => {
                      setDetailOpen(false);
                      openSuspend(detailQuery.data!.user);
                    }}
                  >
                    🚫 Suspend User
                  </Button>
                )}
                {detailQuery.data.user.role === "user" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-violet-400 text-violet-700 hover:bg-violet-50"
                    disabled={promoteMutation.isPending}
                    onClick={() => {
                      if (detailQuery.data!.user.email) promoteMutation.mutate({ email: detailQuery.data!.user.email! });
                      setDetailOpen(false);
                    }}
                  >
                    🔑 Make Admin
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-amber-400 text-amber-700 hover:bg-amber-50"
                    disabled={demoteMutation.isPending}
                    onClick={() => {
                      demoteMutation.mutate({ userId: detailQuery.data!.user.id });
                      setDetailOpen(false);
                    }}
                  >
                    ↓ Remove Admin
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── System logs section ──────────────────────────────────────────────────────

function LogsSection() {
  const [actionFilter, setActionFilter] = useState("");
  const { data, isLoading } = trpc.admin.logs.list.useQuery({ action: actionFilter || undefined, limit: 200 });

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">System / Audit Logs</h2>
      <Input placeholder="Filter by action…" value={actionFilter} onChange={e => setActionFilter(e.target.value)} className="max-w-xs" />
      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Admin</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data ?? []).map((row: any) => (
              <TableRow key={row.log.id}>
                <TableCell className="text-xs whitespace-nowrap">{fmt(row.log.createdAt)}</TableCell>
                <TableCell className="text-sm">{row.adminName ?? "—"}</TableCell>
                <TableCell className="font-mono text-xs">{row.log.action}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {row.log.targetType ? `${row.log.targetType} #${row.log.targetId}` : "—"}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                  {row.log.details ?? "—"}
                </TableCell>
              </TableRow>
            ))}
            {(data ?? []).length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No logs yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─── Email logs section ──────────────────────────────────────────────────────

function EmailLogsSection() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [templateId, setTemplateId] = useState<string>("all");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const { data: stats } = trpc.admin.emailLogs.stats.useQuery();
  const { data: templateIds } = trpc.admin.emailLogs.templateIds.useQuery();
  const { data, isLoading } = trpc.admin.emailLogs.list.useQuery({
    search: search || undefined,
    status: (status !== "all" ? status : undefined) as any,
    templateId: templateId !== "all" ? templateId : undefined,
    from: fromDate || undefined,
    to: toDate || undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  const STATUS_COLOURS: Record<string, string> = {
    sent: "bg-blue-100 text-blue-700",
    delivered: "bg-green-100 text-green-700",
    bounced: "bg-red-100 text-red-700",
    complaint: "bg-orange-100 text-orange-700",
    failed: "bg-gray-100 text-gray-700",
  };

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold">Email Logs</h2>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {Object.entries(stats as Record<string, number>).map(([key, val]) => (
            <Card key={key}>
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-2xl font-bold">{val}</p>
                <p className="text-xs text-muted-foreground capitalize">{key}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Search</Label>
          <Input
            placeholder="Email address or subject…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            className="max-w-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select value={status} onValueChange={v => { setStatus(v); setPage(0); }}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {["sent", "delivered", "bounced", "complaint", "failed"].map(s => (
                <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Template</Label>
          <Select value={templateId} onValueChange={v => { setTemplateId(v); setPage(0); }}>
            <SelectTrigger className="w-52"><SelectValue placeholder="Template" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All templates</SelectItem>
              {(templateIds ?? []).map((t: string) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">From date</Label>
          <Input
            type="date"
            value={fromDate}
            onChange={e => { setFromDate(e.target.value); setPage(0); }}
            className="w-36"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">To date</Label>
          <Input
            type="date"
            value={toDate}
            onChange={e => { setToDate(e.target.value); setPage(0); }}
            className="w-36"
          />
        </div>
        {(fromDate || toDate || search || status !== "all" || templateId !== "all") && (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground opacity-0">Clear</Label>
            <Button variant="outline" size="sm" onClick={() => { setSearch(""); setStatus("all"); setTemplateId("all"); setFromDate(""); setToDate(""); setPage(0); }}>Clear filters</Button>
          </div>
        )}
      </div>

      {/* Table */}
      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Template</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>SES ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data?.rows ?? []).map((row: any) => (
              <TableRow key={row.id}>
                <TableCell className="text-xs whitespace-nowrap">{fmt(row.sentAt ?? row.createdAt)}</TableCell>
                <TableCell className="text-sm">{row.toEmail}</TableCell>
                <TableCell className="text-sm max-w-xs truncate">{row.subject ?? "—"}</TableCell>
                <TableCell className="font-mono text-xs">{row.templateId ?? "—"}</TableCell>
                <TableCell>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOURS[row.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {row.status}
                  </span>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground truncate max-w-[120px]">
                  {row.sesMessageId ?? "—"}
                </TableCell>
              </TableRow>
            ))}
            {(data?.rows ?? []).length === 0 && !isLoading && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No email logs found.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>← Prev</Button>
        <span className="text-sm text-muted-foreground">Page {page + 1}</span>
        <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={(data?.rows ?? []).length < PAGE_SIZE}>Next →</Button>
      </div>
    </div>
  );
}

// ─── Email template preview section ───────────────────────────────────────────

const SAMPLE_DATA: Record<string, Record<string, string>> = {
  job_post_confirmation: { employer_name: "Acme Corp", job_title: "Barista", job_type: "Part-time", expires_date: "30 Jun 2026", job_url: "#", dashboard_url: "#", new_balance: "4" },
  credit_purchase_receipt: { employer_name: "Acme Corp", pack_name: "Starter Pack", credits: "5", amount: "$49.00", charge_token: "ch_test_abc123", new_balance: "5", dashboard_url: "#" },
  application_received: { employer_name: "Acme Corp", job_title: "Barista", applicant_name: "Alex Smith", applicant_email: "alex@example.com", application_url: "#", dashboard_url: "#" },
  waitlist_confirmation: { first_name: "Alex", role: "student", school: "Riverside High", platform_url: "#" },
  school_request_autoreply: { contact_name: "Ms Johnson", school_name: "Riverside High", portal_url: "#" },
  school_approved: { school_name: "Riverside High", contact_name: "Ms Johnson", portal_url: "#", dashboard_url: "#" },
  school_rejected: { school_name: "Riverside High", contact_name: "Ms Johnson", reason: "Duplicate registration detected.", support_url: "#" },
  school_placement_request_confirmation: { school_name: "Riverside High", student_name: "Alex Smith", employer_name: "Acme Corp", start_date: "1 Jul 2026", end_date: "31 Jul 2026", hours_per_week: "15", portal_url: "#" },
  school_placement_status_update: { school_name: "Riverside High", student_name: "Alex Smith", employer_name: "Acme Corp", status: "Approved", portal_url: "#" },
  admin_daily_summary: { date: "2 Jun 2026", pending_schools: "3", pending_drops: "1", flagged_jobs: "0", low_credit_employers: "2", new_waitlist: "14", new_users_7d: "42", dashboard_url: "#" },
  admin_ses_error: { error_message: "Bounce rate exceeded threshold", timestamp: "2 Jun 2026 07:00", details: "5 bounces in last 24h", dashboard_url: "#" },
};

function EmailPreviewSection() {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [format, setFormat] = useState<"html" | "text">("html");

  const { data: templateList } = trpc.admin.emailPreview.listTemplates.useQuery();

  const sampleData: Record<string, string> = selectedTemplate ? (SAMPLE_DATA[selectedTemplate] ?? {}) : {};
  const sampleKeys = Object.keys(sampleData);

  const { data: preview, isLoading } = trpc.admin.emailPreview.render.useQuery(
    { templateId: selectedTemplate, format, sampleData },
    { enabled: !!selectedTemplate }
  );

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold">Email Template Previewer</h2>
      <p className="text-muted-foreground text-sm">Select a template to see a live preview rendered with sample data. Unreplaced placeholders appear as <code className="bg-muted px-1 rounded">&#123;&#123;variable&#125;&#125;</code>.</p>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label>Template</Label>
          <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
            <SelectTrigger className="w-72"><SelectValue placeholder="Choose a template…" /></SelectTrigger>
            <SelectContent>
              {(templateList ?? []).map((t: string) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Format</Label>
          <Select value={format} onValueChange={v => setFormat(v as "html" | "text")}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="html">HTML</SelectItem>
              <SelectItem value="text">Plain text</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Sample data badge list */}
      {sampleKeys.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Sample data used for this template</p>
          <div className="flex flex-wrap gap-2">
            {sampleKeys.map(k => (
              <span key={k} className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded font-mono">
                {k}: <span className="text-foreground">{sampleData[k]}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Preview */}
      {isLoading && <p className="text-muted-foreground">Rendering…</p>}
      {preview && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Subject:</span>
            <span className="text-sm font-semibold">{preview.subject}</span>
          </div>
          {format === "html" ? (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted px-4 py-2 text-xs text-muted-foreground font-medium border-b">HTML Preview</div>
              <iframe
                srcDoc={preview.html}
                className="w-full"
                style={{ height: "600px", border: "none" }}
                title={`Preview: ${preview.templateId}`}
                sandbox="allow-same-origin"
              />
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted px-4 py-2 text-xs text-muted-foreground font-medium border-b">Plain Text Preview</div>
              <pre className="p-4 text-sm whitespace-pre-wrap font-mono bg-background">{preview.text}</pre>
            </div>
          )}
        </div>
      )}
      {!selectedTemplate && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-4xl mb-3">🖼️</p>
          <p>Select a template above to see a preview.</p>
        </div>
      )}
    </div>
  );
}

// ─── Main AdminDashboard component ────────────────────────────────────────────

interface AdminDashboardProps {
  onNavigate: (page: string) => void;
}

export default function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const { user, isAuthenticated } = useAuth();
  const [section, setSection] = useState<Section>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-sm w-full text-center p-8">
          <div className="text-4xl mb-4">🔒</div>
          <h2 className="text-xl font-bold mb-2">Admin Access Required</h2>
          <p className="text-muted-foreground mb-4">You must be an admin to view this page.</p>
          <Button onClick={() => onNavigate("dashboard")}>← Back to Dashboard</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? "w-60" : "w-14"} transition-all duration-200 bg-card border-r-2 border-border flex flex-col shrink-0`}>
        <div className="flex items-center justify-between p-3 border-b border-border">
          {sidebarOpen && <span className="font-bold text-sm uppercase tracking-wider text-primary">Admin Panel</span>}
          <button
            onClick={() => setSidebarOpen(p => !p)}
            className="text-muted-foreground hover:text-foreground transition-colors ml-auto"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? "◀" : "▶"}
          </button>
        </div>
        <nav className="flex-1 py-2">
          {NAV.map(item => (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors
                ${section === item.id
                  ? "bg-primary/10 text-primary font-semibold border-r-2 border-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
            >
              <span className="text-base shrink-0">{item.icon}</span>
              {sidebarOpen && <span className="truncate">{item.label}</span>}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-border">
          <button
            onClick={() => onNavigate("dashboard")}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="shrink-0">🏠</span>
            {sidebarOpen && <span>Back to App</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-6 bg-background">
        {section === "overview" && <OverviewSection />}
        {section === "schools" && <SchoolsSection />}
        {section === "promos" && <PromosSection />}
        {section === "drops" && <DropsSection />}
        {section === "employers" && <EmployersSection />}
        {section === "students" && <StudentsSection />}
        {section === "payments" && <PaymentsSection />}
        {section === "admins" && <AdminsSection currentUserId={user.id} />}
        {section === "search" && <SearchSection />}
        {section === "logs" && <LogsSection />}
        {section === "emailLogs" && <EmailLogsSection />}
        {section === "emailPreview" && <EmailPreviewSection />}
      </main>
    </div>
  );
}
