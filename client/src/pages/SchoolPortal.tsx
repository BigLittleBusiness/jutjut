/**
 * SchoolPortal — Careers & Pathways Staff Dashboard
 *
 * Tabs:
 *   1. Students     — searchable list with kit completeness + application count
 *   2. Employers    — directory of employers visible to schools
 *   3. Placements   — full placement workflow (create, track, sign)
 *
 * Access gate:
 *   - If the user's email domain is not registered → show registration form
 *   - If registered but pending approval → show pending screen
 *   - If approved → show full dashboard
 */

import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "students" | "employers" | "placements";

const PLACEMENT_STATUS_LABELS: Record<string, { label: string; colour: string }> = {
  draft: { label: "Draft", colour: "bg-gray-100 text-gray-700" },
  pending_employer: { label: "Awaiting Employer", colour: "bg-amber-100 text-amber-700" },
  approved_by_employer: { label: "Employer Approved", colour: "bg-blue-100 text-blue-700" },
  approved_by_school: { label: "School Approved", colour: "bg-teal-100 text-teal-700" },
  completed: { label: "Completed", colour: "bg-green-100 text-green-700" },
  rejected: { label: "Rejected", colour: "bg-red-100 text-red-700" },
};

// ─── Registration gate ────────────────────────────────────────────────────────

function SchoolRegistrationForm() {
  const [form, setForm] = useState({
    name: "",
    domain: "",
    careersContactName: "",
    careersContactEmail: "",
    phone: "",
    state: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const register = trpc.school.auth.register.useMutation({
    onSuccess: () => setSubmitted(true),
    onError: (e) => toast.error(e.message),
  });

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center">
        <div className="text-5xl mb-4">🏫</div>
        <h2 className="text-2xl font-extrabold mb-2">Registration submitted!</h2>
        <p className="text-muted-foreground">
          Your school has been registered. A JutJut admin will review and approve your access
          shortly. You will be notified by email.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto mt-10 px-4">
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">🏫</div>
        <h1 className="text-3xl font-extrabold mb-2">Register Your School</h1>
        <p className="text-muted-foreground">
          Connect your school to JutJut to track student progress, manage work experience
          placements, and browse local employers.
        </p>
      </div>

      <Card className="border-2 border-teal-500">
        <CardContent className="pt-6 space-y-4">
          <div>
            <label className="text-sm font-bold mb-1 block">School name *</label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Brisbane State High School"
            />
          </div>
          <div>
            <label className="text-sm font-bold mb-1 block">School email domain *</label>
            <Input
              value={form.domain}
              onChange={(e) => setForm({ ...form, domain: e.target.value })}
              placeholder="e.g. brisbaneshs.eq.edu.au"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Staff with an email ending in this domain will be granted access.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-bold mb-1 block">Careers contact name</label>
              <Input
                value={form.careersContactName}
                onChange={(e) => setForm({ ...form, careersContactName: e.target.value })}
                placeholder="Jane Smith"
              />
            </div>
            <div>
              <label className="text-sm font-bold mb-1 block">Careers contact email</label>
              <Input
                type="email"
                value={form.careersContactEmail}
                onChange={(e) => setForm({ ...form, careersContactEmail: e.target.value })}
                placeholder="careers@school.edu.au"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-bold mb-1 block">Phone</label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="07 3000 0000"
              />
            </div>
            <div>
              <label className="text-sm font-bold mb-1 block">State</label>
              <Select
                value={form.state}
                onValueChange={(v) => setForm({ ...form, state: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {["QLD", "NSW", "VIC", "WA", "SA", "TAS", "ACT", "NT"].map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            className="w-full font-extrabold"
            disabled={!form.name || !form.domain || register.isPending}
            onClick={() => register.mutate(form)}
          >
            {register.isPending ? "Submitting…" : "Submit Registration"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Students tab ─────────────────────────────────────────────────────────────

function StudentsTab({ schoolId }: { schoolId: number }) {
  const [search, setSearch] = useState("");
  const [incompleteOnly, setIncompleteOnly] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);

  const { data: students, isLoading } = trpc.school.students.list.useQuery({
    search: search || undefined,
    incompleteOnly,
  });

  const { data: kit, isLoading: kitLoading } = trpc.school.students.kit.useQuery(
    { studentId: selectedStudentId! },
    { enabled: selectedStudentId !== null }
  );

  if (selectedStudentId !== null) {
    return (
      <div>
        <button
          onClick={() => setSelectedStudentId(null)}
          className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <i className="fa-solid fa-arrow-left text-xs"></i> Back to students
        </button>

        {kitLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading student kit…</div>
        ) : kit ? (
          <StudentKitView kit={kit} />
        ) : (
          <div className="text-center py-12 text-muted-foreground">Student not found.</div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Input
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <label className="flex items-center gap-2 text-sm font-bold cursor-pointer select-none">
          <input
            type="checkbox"
            checked={incompleteOnly}
            onChange={(e) => setIncompleteOnly(e.target.checked)}
            className="rounded"
          />
          Show incomplete kits only
        </label>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading students…</div>
      ) : !students?.length ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">🎓</div>
          <p className="text-muted-foreground font-bold">No students found.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Students are automatically enrolled when they sign up with your school's email domain.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-border">
                <th className="text-left py-2 px-3 font-extrabold uppercase text-xs">Student</th>
                <th className="text-left py-2 px-3 font-extrabold uppercase text-xs">Year</th>
                <th className="text-center py-2 px-3 font-extrabold uppercase text-xs">Verified items</th>
                <th className="text-center py-2 px-3 font-extrabold uppercase text-xs">Applications</th>
                <th className="text-center py-2 px-3 font-extrabold uppercase text-xs">Kit status</th>
                <th className="py-2 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-b border-border hover:bg-accent/30 transition-colors">
                  <td className="py-2.5 px-3">
                    <div className="font-bold">{s.name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{s.email}</div>
                  </td>
                  <td className="py-2.5 px-3 text-muted-foreground">{s.grade ?? "—"}</td>
                  <td className="py-2.5 px-3 text-center font-bold">{s.verifiedItems}</td>
                  <td className="py-2.5 px-3 text-center font-bold">{s.applicationCount}</td>
                  <td className="py-2.5 px-3 text-center">
                    {s.verifiedItems >= 3 ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                        <i className="fa-solid fa-circle-check text-[10px]"></i> Strong
                      </span>
                    ) : s.verifiedItems >= 1 ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                        <i className="fa-solid fa-circle-half-stroke text-[10px]"></i> Building
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                        <i className="fa-solid fa-circle-xmark text-[10px]"></i> Empty
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedStudentId(s.id)}
                    >
                      View Kit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

type StudentKit = {
  user: { id: number; name: string | null; email: string | null; createdAt: Date };
  profile: { school: string | null; grade: string | null; avatarUrl: string | null } | null;
  credentials: Array<{ id: number; title: string; issuer: string | null }>;
  vouches: Array<{ id: number; voucherName: string; voucherTitle: string | null; voucherOrg: string | null; status: string }>;
  reportCards: Array<{ id: number; fileUrl: string; fileKey: string; aiGrade: string | null; verified: boolean; createdAt: Date }>;
  applications: Array<{ id: number; status: string; createdAt: Date; jobTitle: string | null; employer: string | null }>;
};

function StudentKitView({ kit }: { kit: StudentKit }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-full bg-teal-100 border-2 border-teal-400 flex items-center justify-center text-2xl font-extrabold text-teal-700">
          {kit.user.name?.charAt(0) ?? "?"}
        </div>
        <div>
          <h2 className="text-xl font-extrabold">{kit.user.name ?? "Unknown student"}</h2>
          <p className="text-sm text-muted-foreground">{kit.user.email}</p>
          {kit.profile?.school && (
            <p className="text-xs text-muted-foreground mt-0.5">{kit.profile.school} · Year {kit.profile.grade ?? "—"}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Credentials */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-extrabold uppercase tracking-wider flex items-center gap-2">
              <i className="fa-solid fa-certificate text-amber-500"></i> Credentials ({kit.credentials.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {kit.credentials.length === 0 ? (
              <p className="text-sm text-muted-foreground">No credentials added yet.</p>
            ) : (
              <ul className="space-y-2">
                {kit.credentials.map((c) => (
                  <li key={c.id} className="flex items-start gap-2 text-sm">
                    <i className="fa-solid fa-check-circle text-teal-500 mt-0.5 text-xs"></i>
                    <div>
                      <span className="font-bold">{c.title}</span>
                      {c.issuer && <span className="text-muted-foreground"> · {c.issuer}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Vouches */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-extrabold uppercase tracking-wider flex items-center gap-2">
              <i className="fa-solid fa-handshake text-blue-500"></i> Vouches ({kit.vouches.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {kit.vouches.length === 0 ? (
              <p className="text-sm text-muted-foreground">No vouches yet.</p>
            ) : (
              <ul className="space-y-2">
                {kit.vouches.map((v) => (
                  <li key={v.id} className="flex items-start gap-2 text-sm">
                    <i className={`fa-solid fa-circle text-xs mt-1 ${v.status === "verified" ? "text-green-500" : "text-amber-400"}`}></i>
                    <div>
                      <span className="font-bold">{v.voucherName}</span>
                      {v.voucherTitle && <span className="text-muted-foreground"> · {v.voucherTitle}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Report cards */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-extrabold uppercase tracking-wider flex items-center gap-2">
              <i className="fa-solid fa-file-lines text-purple-500"></i> Report Cards ({kit.reportCards.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {kit.reportCards.length === 0 ? (
              <p className="text-sm text-muted-foreground">No report cards uploaded.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {kit.reportCards.map((r) => (
                  <li key={r.id} className="flex items-center gap-2">
                    <i className="fa-solid fa-file text-xs text-muted-foreground"></i>
                    <span className="font-bold">{new Date(r.createdAt).toLocaleDateString()}</span>
                    {r.aiGrade && <span className="text-muted-foreground text-xs">Grade: {r.aiGrade}</span>}
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${r.verified ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                      {r.verified ? "Verified" : "Pending"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Job applications */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-extrabold uppercase tracking-wider flex items-center gap-2">
              <i className="fa-solid fa-briefcase text-teal-500"></i> Applications ({kit.applications.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {kit.applications.length === 0 ? (
              <p className="text-sm text-muted-foreground">No job applications yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {kit.applications.map((a) => (
                  <li key={a.id} className="flex items-center justify-between">
                    <span className="font-bold">{a.jobTitle ?? "Unknown role"}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                      a.status === "accepted" ? "bg-green-100 text-green-700" :
                      a.status === "rejected" ? "bg-red-100 text-red-700" :
                      "bg-amber-100 text-amber-700"
                    }`}>
                      {a.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Employers tab ────────────────────────────────────────────────────────────

function EmployersTab() {
  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState("");
  const [workExpOnly, setWorkExpOnly] = useState(false);

  const { data: employers, isLoading } = trpc.school.employers.list.useQuery({
    search: search || undefined,
    industry: industry || undefined,
    acceptsWorkExperienceOnly: workExpOnly || undefined,
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Input
          placeholder="Search employers…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Input
          placeholder="Filter by industry…"
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          className="max-w-xs"
        />
        <label className="flex items-center gap-2 text-sm font-bold cursor-pointer select-none">
          <input
            type="checkbox"
            checked={workExpOnly}
            onChange={(e) => setWorkExpOnly(e.target.checked)}
            className="rounded"
          />
          Work experience only
        </label>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading employers…</div>
      ) : !employers?.length ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">🏢</div>
          <p className="text-muted-foreground font-bold">No employers found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {employers.map((emp) => (
            <Card key={emp.id} className="border-2 border-border hover:border-teal-400 transition-colors">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-extrabold text-base">{emp.businessName}</h3>
                    {emp.industry && (
                      <p className="text-xs text-muted-foreground">{emp.industry}</p>
                    )}
                  </div>
                  {emp.acceptsWorkExperience && (
                    <span className="text-xs bg-teal-100 text-teal-700 font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                      Work exp
                    </span>
                  )}
                </div>

                {emp.postcode && (
                  <p className="text-xs text-muted-foreground mb-2">
                    <i className="fa-solid fa-location-dot mr-1"></i>{emp.postcode}
                  </p>
                )}

                <div className="space-y-1 text-xs">
                  {emp.contactEmail && (
                    <a href={`mailto:${emp.contactEmail}`} className="flex items-center gap-1.5 text-teal-600 hover:underline">
                      <i className="fa-solid fa-envelope text-[10px]"></i>{emp.contactEmail}
                    </a>
                  )}
                  {emp.contactPhone && (
                    <a href={`tel:${emp.contactPhone}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                      <i className="fa-solid fa-phone text-[10px]"></i>{emp.contactPhone}
                    </a>
                  )}
                </div>

                {emp.activeJobs.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-border">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                      Active jobs ({emp.activeJobs.length})
                    </p>
                    <ul className="space-y-0.5">
                      {emp.activeJobs.slice(0, 3).map((j) => (
                        <li key={j.id} className="text-xs flex items-center gap-1.5">
                          <i className="fa-solid fa-circle text-[6px] text-teal-400"></i>
                          {j.title}
                          {j.wage && <span className="text-muted-foreground">· {j.wage}</span>}
                        </li>
                      ))}
                      {emp.activeJobs.length > 3 && (
                        <li className="text-xs text-muted-foreground">+{emp.activeJobs.length - 3} more</li>
                      )}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Placements tab ───────────────────────────────────────────────────────────

function PlacementsTab({ schoolId }: { schoolId: number }) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedPlacement, setSelectedPlacement] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const { data: placements, isLoading } = trpc.school.placements.list.useQuery({
    status: statusFilter !== "all" ? (statusFilter as any) : undefined,
  });

  const signAsSchool = trpc.school.placements.signAsSchool.useMutation({
    onSuccess: () => {
      toast.success("Placement signed by school.");
      utils.school.placements.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const statusOptions = [
    { value: "all", label: "All statuses" },
    { value: "pending_employer", label: "Awaiting Employer" },
    { value: "approved_by_employer", label: "Employer Approved" },
    { value: "approved_by_school", label: "School Approved" },
    { value: "completed", label: "Completed" },
    { value: "rejected", label: "Rejected" },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4 items-start sm:items-center">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          className="ml-auto font-extrabold"
          onClick={() => setCreateOpen(true)}
        >
          <i className="fa-solid fa-plus mr-2 text-xs"></i>
          New Placement
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading placements…</div>
      ) : !placements?.length ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-muted-foreground font-bold">No placements yet.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Create a placement to start the digital approval workflow.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-border">
                <th className="text-left py-2 px-3 font-extrabold uppercase text-xs">Student</th>
                <th className="text-left py-2 px-3 font-extrabold uppercase text-xs">Dates</th>
                <th className="text-left py-2 px-3 font-extrabold uppercase text-xs">Hrs/wk</th>
                <th className="text-left py-2 px-3 font-extrabold uppercase text-xs">Status</th>
                <th className="text-left py-2 px-3 font-extrabold uppercase text-xs">Signatures</th>
                <th className="py-2 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {placements.map((p) => {
                const statusInfo = PLACEMENT_STATUS_LABELS[p.status] ?? { label: p.status, colour: "bg-gray-100 text-gray-700" };
                const empSig = p.employerSignature ? JSON.parse(p.employerSignature) : null;
                const schoolSig = p.schoolSignature ? JSON.parse(p.schoolSignature) : null;
                const studentSig = p.studentSignature ? JSON.parse(p.studentSignature) : null;

                return (
                  <tr key={p.id} className="border-b border-border hover:bg-accent/30 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="font-bold">{p.studentName ?? `Student #${p.studentId}`}</div>
                      <div className="text-xs text-muted-foreground">{p.studentEmail}</div>
                    </td>
                    <td className="py-2.5 px-3 text-xs">
                      <div>{p.startDate}</div>
                      <div className="text-muted-foreground">→ {p.endDate}</div>
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold">{p.hoursPerWeek}</td>
                    <td className="py-2.5 px-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusInfo.colour}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex gap-1">
                        <span title="Employer" className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${empSig ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>E</span>
                        <span title="School" className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${schoolSig ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>S</span>
                        <span title="Student" className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${studentSig ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>T</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {p.status === "approved_by_employer" && (
                        <Button
                          size="sm"
                          className="font-bold text-xs"
                          disabled={signAsSchool.isPending}
                          onClick={() =>
                            signAsSchool.mutate({ placementId: p.id, signerName: "School Staff" })
                          }
                        >
                          Sign
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <CreatePlacementDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          utils.school.placements.list.invalidate();
          setCreateOpen(false);
        }}
      />
    </div>
  );
}

// ─── Create placement dialog ──────────────────────────────────────────────────

function CreatePlacementDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    studentId: "",
    employerId: "",
    startDate: "",
    endDate: "",
    hoursPerWeek: "5",
    notes: "",
  });

  const create = trpc.school.placements.create.useMutation({
    onSuccess: (data) => {
      toast.success("Placement created! Employer approval link generated.");
      onCreated();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-extrabold">New Work Experience Placement</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-bold mb-1 block">Student ID *</label>
              <Input
                type="number"
                value={form.studentId}
                onChange={(e) => setForm({ ...form, studentId: e.target.value })}
                placeholder="e.g. 42"
              />
            </div>
            <div>
              <label className="text-sm font-bold mb-1 block">Employer ID *</label>
              <Input
                type="number"
                value={form.employerId}
                onChange={(e) => setForm({ ...form, employerId: e.target.value })}
                placeholder="e.g. 7"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-bold mb-1 block">Start date *</label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-bold mb-1 block">End date *</label>
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-bold mb-1 block">Hours per week *</label>
            <Input
              type="number"
              min={1}
              max={40}
              value={form.hoursPerWeek}
              onChange={(e) => setForm({ ...form, hoursPerWeek: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-bold mb-1 block">Notes</label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Any special requirements or context…"
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="flex-1 font-extrabold"
              disabled={
                !form.studentId ||
                !form.employerId ||
                !form.startDate ||
                !form.endDate ||
                create.isPending
              }
              onClick={() =>
                create.mutate({
                  studentId: parseInt(form.studentId),
                  employerId: parseInt(form.employerId),
                  startDate: form.startDate,
                  endDate: form.endDate,
                  hoursPerWeek: parseInt(form.hoursPerWeek),
                  notes: form.notes || undefined,
                })
              }
            >
              {create.isPending ? "Creating…" : "Create Placement"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main portal ──────────────────────────────────────────────────────────────

interface SchoolPortalProps {
  onNavigate: (page: string) => void;
}

export default function SchoolPortal({ onNavigate }: SchoolPortalProps) {
  const [activeTab, setActiveTab] = useState<Tab>("students");

  const { data: school, isLoading, error } = trpc.school.auth.me.useQuery();

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "students", label: "Students", icon: "fa-graduation-cap" },
    { id: "employers", label: "Employers", icon: "fa-building" },
    { id: "placements", label: "Placements", icon: "fa-clipboard-list" },
  ];

  // Loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <i className="fa-solid fa-spinner fa-spin mr-2"></i> Loading school portal…
      </div>
    );
  }

  // Not registered or pending
  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("pending admin approval")) {
      return (
        <div className="max-w-lg mx-auto mt-16 text-center px-4">
          <div className="text-5xl mb-4">⏳</div>
          <h2 className="text-2xl font-extrabold mb-2">Registration pending</h2>
          <p className="text-muted-foreground">
            Your school registration is under review. A JutJut admin will approve your access
            shortly.
          </p>
          <Button variant="outline" className="mt-6" onClick={() => onNavigate("dashboard")}>
            Back to Dashboard
          </Button>
        </div>
      );
    }
    // Not registered — show registration form
    return <SchoolRegistrationForm />;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <button
            onClick={() => onNavigate("dashboard")}
            className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground mb-3 transition-colors"
          >
            <i className="fa-solid fa-arrow-left text-xs"></i> Dashboard
          </button>
          <h1 className="text-3xl font-extrabold flex items-center gap-3">
            <i className="fa-solid fa-school text-teal-500"></i>
            {school?.name ?? "School Portal"}
          </h1>
          <p className="text-muted-foreground mt-1">
            Careers & Pathways Dashboard
            {school?.state && <span className="ml-2 text-xs font-bold bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">{school.state}</span>}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b-2 border-border mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-extrabold uppercase tracking-wider transition-all border-b-2 -mb-[2px] ${
              activeTab === tab.id
                ? "border-teal-500 text-teal-600"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <i className={`fa-solid ${tab.icon} text-xs`}></i>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "students" && school && <StudentsTab schoolId={school.id} />}
      {activeTab === "employers" && <EmployersTab />}
      {activeTab === "placements" && school && <PlacementsTab schoolId={school.id} />}
    </div>
  );
}
