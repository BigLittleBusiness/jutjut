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
  | "logs";

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

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 400);
    return () => clearTimeout(t);
  }, [query]);

  const { data } = trpc.admin.search.useQuery(
    { query: debouncedQuery },
    { enabled: debouncedQuery.length >= 2 }
  );

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Global User Search</h2>
      <Input placeholder="Search by name or email…" value={query} onChange={e => setQuery(e.target.value)} className="max-w-md" autoFocus />
      {data && (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((u: any) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{u.email}</TableCell>
                  <TableCell><Badge variant={u.role === "admin" ? "default" : "secondary"}>{u.role}</Badge></TableCell>
                  <TableCell className="text-xs">{fmt(u.createdAt)}</TableCell>
                </TableRow>
              ))}
              {data.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No users found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
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
      </main>
    </div>
  );
}
