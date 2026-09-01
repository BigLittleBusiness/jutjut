import { useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  GraduationCap,
  Handshake,
  HeartHandshake,
  Loader2,
  MapPin,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";

type HubRole = "student" | "business" | "institution";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800 border-emerald-300",
  completed: "bg-teal-100 text-teal-800 border-teal-300",
  approved: "bg-blue-100 text-blue-800 border-blue-300",
  open: "bg-emerald-100 text-emerald-800 border-emerald-300",
  submitted: "bg-amber-100 text-amber-800 border-amber-300",
  finding: "bg-amber-100 text-amber-800 border-amber-300",
  applying: "bg-amber-100 text-amber-800 border-amber-300",
  needs_information: "bg-amber-100 text-amber-800 border-amber-300",
  pending: "bg-amber-100 text-amber-800 border-amber-300",
  declined: "bg-rose-100 text-rose-800 border-rose-300",
  cancelled: "bg-rose-100 text-rose-800 border-rose-300",
  paused: "bg-slate-100 text-slate-700 border-slate-300",
};

function prettyStatus(status?: string | null) {
  if (!status) return "Not started";
  return status.replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase());
}

function StatusBadge({ status }: { status?: string | null }) {
  return <Badge variant="outline" className={`font-bold ${STATUS_STYLES[status ?? ""] ?? "bg-slate-100 text-slate-700 border-slate-300"}`}>{prettyStatus(status)}</Badge>;
}

function formatDate(value?: Date | string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function SectionEmpty({ icon: Icon, title, description, action }: { icon: typeof Search; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="border-2 border-dashed border-border rounded-2xl px-6 py-10 text-center bg-card/40">
      <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3"><Icon className="w-6 h-6 text-primary" /></div>
      <h3 className="font-extrabold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function PageHeader({ role, title, description, action }: { role: string; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-primary">
          <Sparkles className="h-3.5 w-3.5" /> {role}
        </div>
        <h1 className="mt-3 text-3xl md:text-4xl font-black tracking-tight">{title}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

function LinkRequirementDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: pathways = [], isLoading } = trpc.practicals.student.pathwayDirectory.useQuery();
  const utils = trpc.useUtils();
  const [pathwayId, setPathwayId] = useState("");
  const [completionDate, setCompletionDate] = useState("");
  const link = trpc.practicals.student.linkRequirement.useMutation({
    onSuccess: result => {
      toast.success(result.existing ? "This practical requirement is already linked to your account." : "Your practical requirement is now linked.");
      utils.practicals.student.requirements.invalidate();
      utils.practicals.student.opportunities.invalidate();
      onOpenChange(false);
      setPathwayId("");
      setCompletionDate("");
    },
    onError: error => toast.error(error.message),
  });

  const submit = () => {
    if (!pathwayId) return toast.error("Select the course pathway that applies to your practical requirement.");
    link.mutate({ coursePathwayId: Number(pathwayId), plannedCompletionAt: completionDate ? new Date(`${completionDate}T00:00:00`) : undefined });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Link a course practical requirement</DialogTitle>
          <DialogDescription>Only your institution can determine whether an individual opportunity will count toward your course. Linking your requirement helps JutJut show the relevant approved opportunities.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2"><Label htmlFor="pathway">Course pathway</Label>
            <select id="pathway" value={pathwayId} onChange={event => setPathwayId(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" disabled={isLoading}>
              <option value="">{isLoading ? "Loading available pathways…" : "Select your course pathway"}</option>
              {pathways.map(item => <option key={item.pathway.id} value={item.pathway.id}>{item.institution.name} — {item.pathway.title}</option>)}
            </select>
          </div>
          <div className="space-y-2"><Label htmlFor="completion">Planned completion date <span className="text-muted-foreground">(optional)</span></Label><Input id="completion" type="date" value={completionDate} onChange={event => setCompletionDate(event.target.value)} /></div>
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 flex gap-2"><ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" /><span>This does not replace your coordinator’s final approval of a placement, project or arrangement.</span></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={submit} disabled={link.isPending}>{link.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Link requirement</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SelfSourcedDialog({ open, onOpenChange, requirementId }: { open: boolean; onOpenChange: (open: boolean) => void; requirementId?: number }) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState({ hostOrganisationName: "", hostContactName: "", hostContactEmail: "", proposedTitle: "", proposedDescription: "" });
  const submit = trpc.practicals.student.selfSourced.submit.useMutation({
    onSuccess: () => {
      toast.success("Your self-sourced practical has been submitted for institution review.");
      utils.practicals.student.selfSourced.list.invalidate();
      onOpenChange(false);
      setForm({ hostOrganisationName: "", hostContactName: "", hostContactEmail: "", proposedTitle: "", proposedDescription: "" });
    },
    onError: error => toast.error(error.message),
  });
  const update = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }));
  const save = () => {
    if (!requirementId) return toast.error("Link your course pathway before submitting a self-sourced practical.");
    if (!form.hostOrganisationName || !form.proposedTitle || form.proposedDescription.trim().length < 40) return toast.error("Add the host organisation, a clear title and enough detail for your coordinator to assess the proposal.");
    submit.mutate({ coursePathwayId: requirementId, ...form, hostContactName: form.hostContactName || undefined, hostContactEmail: form.hostContactEmail || undefined });
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Submit a practical opportunity you found</DialogTitle><DialogDescription>JutJut will record the proposal for your course coordinator. The organisation still needs to be suitable and your individual arrangement still needs institutional approval.</DialogDescription></DialogHeader>
        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2"><Label>Host organisation</Label><Input value={form.hostOrganisationName} onChange={e => update("hostOrganisationName", e.target.value)} placeholder="Organisation name" /></div>
          <div className="space-y-2"><Label>Contact name <span className="text-muted-foreground">(optional)</span></Label><Input value={form.hostContactName} onChange={e => update("hostContactName", e.target.value)} /></div>
          <div className="space-y-2"><Label>Contact email <span className="text-muted-foreground">(optional)</span></Label><Input type="email" value={form.hostContactEmail} onChange={e => update("hostContactEmail", e.target.value)} /></div>
          <div className="space-y-2 sm:col-span-2"><Label>Proposed practical title</Label><Input value={form.proposedTitle} onChange={e => update("proposedTitle", e.target.value)} placeholder="e.g. Develop a local campaign plan" /></div>
          <div className="space-y-2 sm:col-span-2"><Label>What work or project is proposed?</Label><Textarea value={form.proposedDescription} onChange={e => update("proposedDescription", e.target.value)} placeholder="Describe the host, the learning-related work, likely deliverables and how it relates to your course." className="min-h-32" /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={save} disabled={submit.isPending}>{submit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Submit for review</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ApplicationDialog({ open, onOpenChange, opportunity }: { open: boolean; onOpenChange: (open: boolean) => void; opportunity?: any }) {
  const utils = trpc.useUtils();
  const [availability, setAvailability] = useState("");
  const [statement, setStatement] = useState("");
  const [skillsSummary, setSkillsSummary] = useState("");
  const submit = trpc.practicals.student.submitApplication.useMutation({
    onSuccess: () => {
      toast.success("Application submitted. Your institution will review the match before the practical can proceed.");
      utils.practicals.student.applications.invalidate();
      utils.practicals.student.requirements.invalidate();
      onOpenChange(false);
      setAvailability(""); setStatement(""); setSkillsSummary("");
    },
    onError: error => toast.error(error.message),
  });
  if (!opportunity) return null;
  const save = () => {
    if (statement.trim().length < 30) return toast.error("Add a short statement of at least 30 characters so the coordinator can review your match.");
    submit.mutate({ opportunityId: opportunity.opportunity.id, coursePathwayId: opportunity.pathway.id, availability: availability || undefined, statement, skillsSummary: skillsSummary || undefined });
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>Apply for {opportunity.opportunity.title}</DialogTitle><DialogDescription>Submit your interest for this approved course pathway. The business may be involved in matching, but your institution makes the final course approval decision.</DialogDescription></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2"><Label>Availability</Label><Textarea value={availability} onChange={event => setAvailability(event.target.value)} placeholder="Share your availability, including any course dates or timing constraints." /></div>
          <div className="space-y-2"><Label>Why are you a good fit?</Label><Textarea value={statement} onChange={event => setStatement(event.target.value)} placeholder="Describe your interest, relevant learning and how you would approach this practical." className="min-h-28" /></div>
          <div className="space-y-2"><Label>Relevant skills or evidence <span className="text-muted-foreground">(optional)</span></Label><Textarea value={skillsSummary} onChange={event => setSkillsSummary(event.target.value)} placeholder="List relevant skills, coursework or portfolio items." /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={save} disabled={submit.isPending}>{submit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Submit application</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MilestoneDialog({ open, onOpenChange, milestone }: { open: boolean; onOpenChange: (open: boolean) => void; milestone?: any }) {
  const utils = trpc.useUtils();
  const [note, setNote] = useState("");
  const [url, setUrl] = useState("");
  const submit = trpc.practicals.student.submitMilestone.useMutation({
    onSuccess: () => { toast.success("Milestone submitted for supervisor confirmation."); utils.practicals.student.arrangements.invalidate(); onOpenChange(false); setNote(""); setUrl(""); },
    onError: error => toast.error(error.message),
  });
  if (!milestone) return null;
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Submit milestone: {milestone.title}</DialogTitle><DialogDescription>Share progress or a deliverable link. Your supervisor can then confirm or request revisions.</DialogDescription></DialogHeader><div className="space-y-4 py-2"><div className="space-y-2"><Label>Update</Label><Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Describe what you completed and anything requiring feedback." /></div><div className="space-y-2"><Label>Evidence link <span className="text-muted-foreground">(optional)</span></Label><Input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" /></div></div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={() => submit.mutate({ milestoneId: milestone.id, studentNote: note || undefined, evidenceUrl: url || undefined })} disabled={submit.isPending}>{submit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Submit update</Button></DialogFooter></DialogContent></Dialog>;
}

function CompletionDialog({ open, onOpenChange, arrangement }: { open: boolean; onOpenChange: (open: boolean) => void; arrangement?: any }) {
  const utils = trpc.useUtils();
  const [reflection, setReflection] = useState("");
  const submit = trpc.practicals.student.submitCompletion.useMutation({
    onSuccess: () => { toast.success("Completion reflection submitted. Your supervisor will be asked to confirm the practical."); utils.practicals.student.arrangements.invalidate(); onOpenChange(false); setReflection(""); },
    onError: error => toast.error(error.message),
  });
  if (!arrangement) return null;
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Submit completion reflection</DialogTitle><DialogDescription>Explain what you completed, what you learned and how the work met the agreed practical scope.</DialogDescription></DialogHeader><Textarea value={reflection} onChange={e => setReflection(e.target.value)} className="min-h-40" placeholder="Your completion reflection…" /><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={() => submit.mutate({ arrangementId: arrangement.arrangement.id, studentReflection: reflection })} disabled={submit.isPending}>{submit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Submit reflection</Button></DialogFooter></DialogContent></Dialog>;
}

function ConcernDialog({ open, onOpenChange, arrangement }: { open: boolean; onOpenChange: (open: boolean) => void; arrangement?: any }) {
  const [category, setCategory] = useState("other");
  const [description, setDescription] = useState("");
  const submit = trpc.practicals.student.raiseConcern.useMutation({
    onSuccess: () => { toast.success("Your concern has been recorded for your institution’s practicals support process."); onOpenChange(false); setDescription(""); },
    onError: error => toast.error(error.message),
  });
  if (!arrangement) return null;
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Raise a practical concern</DialogTitle><DialogDescription>Use this route for safety, wellbeing, conduct or material scope concerns. For immediate danger, contact emergency services first.</DialogDescription></DialogHeader><div className="space-y-4 py-2"><div className="space-y-2"><Label>Concern type</Label><select value={category} onChange={e => setCategory(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="safety">Safety</option><option value="wellbeing">Wellbeing</option><option value="conduct">Conduct</option><option value="scope_change">Scope change</option><option value="other">Other</option></select></div><div className="space-y-2"><Label>What happened?</Label><Textarea className="min-h-32" value={description} onChange={e => setDescription(e.target.value)} placeholder="Provide enough detail for your course team to respond appropriately." /></div></div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button variant="destructive" onClick={() => submit.mutate({ arrangementId: arrangement.arrangement.id, category: category as any, description })} disabled={submit.isPending || description.trim().length < 20}>{submit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Submit concern</Button></DialogFooter></DialogContent></Dialog>;
}

function StudentPracticals() {
  const { isAuthenticated, loading } = useAuth();
  const { data: requirements = [], isLoading: requirementsLoading } = trpc.practicals.student.requirements.useQuery(undefined, { enabled: isAuthenticated });
  const { data: opportunities = [], isLoading: opportunitiesLoading } = trpc.practicals.student.opportunities.useQuery(undefined, { enabled: isAuthenticated });
  const { data: applications = [] } = trpc.practicals.student.applications.useQuery(undefined, { enabled: isAuthenticated });
  const { data: arrangements = [] } = trpc.practicals.student.arrangements.useQuery(undefined, { enabled: isAuthenticated });
  const { data: sourced = [] } = trpc.practicals.student.selfSourced.list.useQuery(undefined, { enabled: isAuthenticated });
  const utils = trpc.useUtils();
  const confirmCommencement = trpc.practicals.student.confirmCommencement.useMutation({ onSuccess: () => { toast.success("Commencement checklist confirmed. Your host can now start the practical."); utils.practicals.student.arrangements.invalidate(); }, onError: error => toast.error(error.message) });
  const [requirementOpen, setRequirementOpen] = useState(false);
  const [selfSourcedOpen, setSelfSourcedOpen] = useState(false);
  const [applicationTarget, setApplicationTarget] = useState<any>();
  const [milestoneTarget, setMilestoneTarget] = useState<any>();
  const [completionTarget, setCompletionTarget] = useState<any>();
  const [concernTarget, setConcernTarget] = useState<any>();

  const primaryRequirement = requirements[0];
  const requirementPathwayId = primaryRequirement?.pathway.id;
  const activeArrangement = arrangements.find(item => ["approved", "ready_to_commence", "active", "completion_pending"].includes(item.arrangement.status));

  if (loading) return <div className="container mx-auto py-12"><div className="h-44 rounded-2xl bg-muted animate-pulse" /></div>;
  if (!isAuthenticated) return <div className="container mx-auto py-12 text-center"><p className="text-muted-foreground">Sign in to view your JutJut Practicals workspace.</p></div>;

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 space-y-8">
      <PageHeader role="For students" title="My Practicals" description="Find and complete a course-linked real-world project, placement or cohort brief — with approval and progress evidence in one place." action={<div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setSelfSourcedOpen(true)} className="gap-2"><Building2 className="w-4 h-4" />Submit one I found</Button><Button onClick={() => setRequirementOpen(true)} className="gap-2"><Plus className="w-4 h-4" />Link requirement</Button></div>} />

      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card overflow-hidden">
        <CardContent className="p-6 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-4"><div className="h-12 w-12 shrink-0 rounded-xl bg-primary text-primary-foreground flex items-center justify-center"><GraduationCap className="w-6 h-6" /></div><div>{requirementsLoading ? <div className="h-10 w-72 bg-muted animate-pulse rounded" /> : primaryRequirement ? <><p className="text-xs font-extrabold uppercase tracking-wider text-primary">Your current requirement</p><h2 className="mt-1 text-xl font-black">{primaryRequirement.pathway.title}</h2><p className="mt-1 text-sm text-muted-foreground">{primaryRequirement.institution.name} · {primaryRequirement.pathway.courseName}{primaryRequirement.pathway.requiredHours ? ` · ${primaryRequirement.pathway.requiredHours} required hours` : ""}</p></> : <><p className="text-xs font-extrabold uppercase tracking-wider text-primary">Start here</p><h2 className="mt-1 text-xl font-black">Link your course practical requirement</h2><p className="mt-1 text-sm text-muted-foreground">This lets JutJut match you with approved opportunities for the correct course pathway.</p></>}</div></div>
          <div className="flex items-center gap-3"><StatusBadge status={primaryRequirement?.requirement.status ?? "not_started"} />{primaryRequirement && <Button onClick={() => document.getElementById("practical-discovery")?.scrollIntoView({ behavior: "smooth" })}>Find practicals <ArrowRight className="ml-2 w-4 h-4" /></Button>}</div>
        </CardContent>
      </Card>

      {activeArrangement && <Card className="border-2 border-teal-300 bg-teal-50/60 dark:bg-teal-950/20"><CardHeader className="pb-3"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><CardTitle className="flex items-center gap-2"><ClipboardCheck className="w-5 h-5 text-teal-600" />Active practical workspace</CardTitle><CardDescription className="mt-1">{activeArrangement.opportunity.title} with {activeArrangement.employer.businessName}</CardDescription></div><StatusBadge status={activeArrangement.arrangement.status} /></div></CardHeader><CardContent className="space-y-5">
        {activeArrangement.arrangement.status === "approved" && <div className="rounded-xl bg-card p-4 border border-teal-200 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><p className="font-bold">Confirm your commencement checklist</p><p className="text-sm text-muted-foreground">Confirm that you understand the scope, supervisor and support route before your host starts the practical.</p></div><Button onClick={() => confirmCommencement.mutate({ arrangementId: activeArrangement.arrangement.id })} disabled={confirmCommencement.isPending}>{confirmCommencement.isPending && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}Confirm commencement</Button></div>}
        <div className="grid gap-3 md:grid-cols-2">{activeArrangement.milestones.map((milestone: any) => <div key={milestone.id} className="rounded-xl border bg-card p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-sm">{milestone.title}</p><p className="mt-1 text-xs text-muted-foreground">{milestone.description}</p></div><StatusBadge status={milestone.status} /></div>{activeArrangement.arrangement.status === "active" && ["not_started", "in_progress", "needs_revision"].includes(milestone.status) && <Button variant="outline" size="sm" className="mt-3" onClick={() => setMilestoneTarget(milestone)}>Submit update</Button>}</div>)}</div>
        <div className="flex flex-wrap gap-2 border-t pt-4"><Button variant="outline" className="gap-2" onClick={() => setConcernTarget(activeArrangement)}><AlertTriangle className="w-4 h-4" />Raise a concern</Button>{activeArrangement.arrangement.status === "active" && <Button className="gap-2" onClick={() => setCompletionTarget(activeArrangement)}><FileCheck2 className="w-4 h-4" />Submit completion reflection</Button>}</div>
      </CardContent></Card>}

      <section id="practical-discovery" className="space-y-4"><div className="flex items-end justify-between gap-3"><div><h2 className="text-2xl font-black">Approved opportunities for you</h2><p className="mt-1 text-sm text-muted-foreground">Only opportunities approved for a pathway you have linked appear here.</p></div>{primaryRequirement && <StatusBadge status="approved" />}</div>
        {!primaryRequirement ? <SectionEmpty icon={BookOpenCheck} title="Link your requirement to see relevant practicals" description="Your coordinator’s pathway determines which projects and placements can be considered for your course." action={<Button onClick={() => setRequirementOpen(true)}>Link course requirement</Button>} /> : opportunitiesLoading ? <div className="grid gap-4 md:grid-cols-2">{[1, 2].map(item => <div key={item} className="h-56 rounded-2xl bg-muted animate-pulse" />)}</div> : opportunities.length === 0 ? <SectionEmpty icon={Search} title="No approved opportunities are open yet" description="You can return later, or submit an opportunity you found yourself for your coordinator to assess." action={<Button variant="outline" onClick={() => setSelfSourcedOpen(true)}>Submit one I found</Button>} /> : <div className="grid gap-4 lg:grid-cols-2">{opportunities.map((item: any) => <Card key={item.opportunity.id} className="border hover:border-primary/50 transition-colors"><CardHeader className="pb-3"><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap gap-2"><StatusBadge status="approved" /><Badge variant="secondary">{prettyStatus(item.opportunity.type)}</Badge></div><CardTitle className="mt-3 text-xl">{item.opportunity.title}</CardTitle><CardDescription className="mt-1 font-medium">{item.employer.businessName}</CardDescription></div><BriefcaseBusiness className="w-6 h-6 text-primary shrink-0" /></div></CardHeader><CardContent className="space-y-4"><p className="text-sm text-muted-foreground line-clamp-3">{item.opportunity.businessNeed}</p><div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium text-muted-foreground"><span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{prettyStatus(item.opportunity.deliveryMode)}{item.opportunity.location ? ` · ${item.opportunity.location}` : ""}</span>{item.opportunity.estimatedHours && <span className="flex items-center gap-1.5"><Clock3 className="w-3.5 h-3.5" />{item.opportunity.estimatedHours} hours</span>}</div><div className="rounded-lg bg-muted/70 p-3 text-xs"><strong>Course fit:</strong> {item.pathway.title}</div><Button className="w-full" onClick={() => setApplicationTarget(item)}>View & apply <ArrowRight className="ml-2 w-4 h-4" /></Button></CardContent></Card>)}</div>}</section>

      <section className="grid gap-6 lg:grid-cols-2"><Card><CardHeader><CardTitle className="flex gap-2 items-center"><Send className="w-5 h-5 text-primary" />Applications</CardTitle><CardDescription>Current application outcomes and next steps.</CardDescription></CardHeader><CardContent className="space-y-3">{applications.length === 0 ? <p className="text-sm text-muted-foreground">No applications yet.</p> : applications.map((item: any) => <div key={item.application.id} className="flex items-center justify-between gap-3 rounded-xl border p-3"><div><p className="font-bold text-sm">{item.opportunity.title}</p><p className="text-xs text-muted-foreground">{item.employer.businessName} · {item.pathway.title}</p></div><StatusBadge status={item.application.status} /></div>)}</CardContent></Card>
        <Card><CardHeader><CardTitle className="flex gap-2 items-center"><Handshake className="w-5 h-5 text-primary" />Self-sourced opportunities</CardTitle><CardDescription>Projects or hosts you have asked your coordinator to assess.</CardDescription></CardHeader><CardContent className="space-y-3">{sourced.length === 0 ? <SectionEmpty icon={Building2} title="Have you found a host yourself?" description="Submit it here so the same institutional review process applies." action={<Button variant="outline" size="sm" onClick={() => setSelfSourcedOpen(true)}>Submit a host or project</Button>} /> : sourced.map((item: any) => <div key={item.proposal.id} className="flex items-center justify-between gap-3 rounded-xl border p-3"><div><p className="font-bold text-sm">{item.proposal.proposedTitle}</p><p className="text-xs text-muted-foreground">{item.proposal.hostOrganisationName} · {item.institution.name}</p></div><StatusBadge status={item.proposal.status} /></div>)}</CardContent></Card></section>

      <LinkRequirementDialog open={requirementOpen} onOpenChange={setRequirementOpen} />
      <SelfSourcedDialog open={selfSourcedOpen} onOpenChange={setSelfSourcedOpen} requirementId={requirementPathwayId} />
      <ApplicationDialog open={Boolean(applicationTarget)} onOpenChange={open => !open && setApplicationTarget(undefined)} opportunity={applicationTarget} />
      <MilestoneDialog open={Boolean(milestoneTarget)} onOpenChange={open => !open && setMilestoneTarget(undefined)} milestone={milestoneTarget} />
      <CompletionDialog open={Boolean(completionTarget)} onOpenChange={open => !open && setCompletionTarget(undefined)} arrangement={completionTarget} />
      <ConcernDialog open={Boolean(concernTarget)} onOpenChange={open => !open && setConcernTarget(undefined)} arrangement={concernTarget} />
    </div>
  );
}

function OpportunityBuilderDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: pathways = [] } = trpc.practicals.institution.pathways.activeDirectory.useQuery();
  const utils = trpc.useUtils();
  const [form, setForm] = useState({ coursePathwayId: "", type: "project", title: "", businessNeed: "", description: "", deliveryMode: "hybrid", location: "", estimatedHours: "", maxParticipants: "1", suggestedCourseAreas: "", deliverables: "", scopeExclusions: "", toolsProvided: "", supervisorName: "", supervisorTitle: "", supervisorEmail: "", supervisionCadence: "weekly", accessibilityInfo: "", paymentDetails: "", safetyAcknowledged: false });
  const update = (key: keyof typeof form, value: string | boolean) => setForm(current => ({ ...current, [key]: value }));
  const submit = trpc.practicals.host.submitOpportunity.useMutation({ onSuccess: () => { toast.success("Practical opportunity submitted for institution review."); utils.practicals.host.dashboard.invalidate(); onOpenChange(false); }, onError: error => toast.error(error.message) });
  const save = () => {
    if (!form.coursePathwayId || !form.safetyAcknowledged) return toast.error("Select a pathway and acknowledge safe supervision before submitting.");
    submit.mutate({ coursePathwayId: Number(form.coursePathwayId), type: form.type as any, title: form.title, businessNeed: form.businessNeed, description: form.description, deliveryMode: form.deliveryMode as any, location: form.location || undefined, estimatedHours: form.estimatedHours ? Number(form.estimatedHours) : undefined, maxParticipants: Number(form.maxParticipants || 1), suggestedCourseAreas: form.suggestedCourseAreas.split(",").map(v => v.trim()).filter(Boolean), deliverables: form.deliverables, scopeExclusions: form.scopeExclusions || undefined, toolsProvided: form.toolsProvided || undefined, supervisorName: form.supervisorName, supervisorTitle: form.supervisorTitle || undefined, supervisorEmail: form.supervisorEmail, supervisionCadence: form.supervisionCadence, accessibilityInfo: form.accessibilityInfo || undefined, paymentDetails: form.paymentDetails || undefined, safetyAcknowledged: true });
  };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Submit a Practical Opportunity</DialogTitle><DialogDescription>Describe a genuine, defined business need. JutJut will send it to the selected institution for course suitability review before students can apply.</DialogDescription></DialogHeader><div className="grid gap-4 py-2 sm:grid-cols-2"><div className="space-y-2 sm:col-span-2"><Label>Target course pathway</Label><select value={form.coursePathwayId} onChange={e => update("coursePathwayId", e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Select a participating course pathway</option>{pathways.map(item => <option key={item.pathway.id} value={item.pathway.id}>{item.institution.name} — {item.pathway.title}</option>)}</select></div><div className="space-y-2"><Label>Opportunity type</Label><select value={form.type} onChange={e => update("type", e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="project">Industry project</option><option value="placement">Supervised placement</option><option value="cohort_brief">Cohort brief</option></select></div><div className="space-y-2"><Label>Delivery</Label><select value={form.deliveryMode} onChange={e => update("deliveryMode", e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="hybrid">Hybrid</option><option value="remote">Remote</option><option value="on_site">On-site</option></select></div><div className="space-y-2 sm:col-span-2"><Label>Opportunity title</Label><Input value={form.title} onChange={e => update("title", e.target.value)} placeholder="e.g. Create a local customer insight plan" /></div><div className="space-y-2 sm:col-span-2"><Label>What genuine business need will the student work on?</Label><Textarea className="min-h-28" value={form.businessNeed} onChange={e => update("businessNeed", e.target.value)} placeholder="Describe the business problem and the reason this work matters." /></div><div className="space-y-2 sm:col-span-2"><Label>Practical scope and learning context</Label><Textarea className="min-h-28" value={form.description} onChange={e => update("description", e.target.value)} placeholder="Explain the work, learning context and what the student will do." /></div><div className="space-y-2 sm:col-span-2"><Label>Defined deliverables</Label><Textarea value={form.deliverables} onChange={e => update("deliverables", e.target.value)} placeholder="List the agreed outputs, handover or evidence of completion." /></div><div className="space-y-2"><Label>Location <span className="text-muted-foreground">(optional)</span></Label><Input value={form.location} onChange={e => update("location", e.target.value)} placeholder="Suburb, state or remote" /></div><div className="space-y-2"><Label>Estimated hours <span className="text-muted-foreground">(optional)</span></Label><Input type="number" min="1" value={form.estimatedHours} onChange={e => update("estimatedHours", e.target.value)} /></div><div className="space-y-2"><Label>Course areas</Label><Input value={form.suggestedCourseAreas} onChange={e => update("suggestedCourseAreas", e.target.value)} placeholder="e.g. Marketing, business" /></div><div className="space-y-2"><Label>Maximum students or teams</Label><Input type="number" min="1" value={form.maxParticipants} onChange={e => update("maxParticipants", e.target.value)} /></div><div className="space-y-2 sm:col-span-2"><Label>Named supervisor</Label><div className="grid gap-3 sm:grid-cols-3"><Input value={form.supervisorName} onChange={e => update("supervisorName", e.target.value)} placeholder="Name" /><Input value={form.supervisorTitle} onChange={e => update("supervisorTitle", e.target.value)} placeholder="Role" /><Input type="email" value={form.supervisorEmail} onChange={e => update("supervisorEmail", e.target.value)} placeholder="Email" /></div></div><div className="space-y-2"><Label>Supervision cadence</Label><Input value={form.supervisionCadence} onChange={e => update("supervisionCadence", e.target.value)} placeholder="e.g. Weekly check-in" /></div><div className="space-y-2"><Label>Payment or expenses <span className="text-muted-foreground">(optional)</span></Label><Input value={form.paymentDetails} onChange={e => update("paymentDetails", e.target.value)} placeholder="State any payment or expense support" /></div><div className="space-y-2 sm:col-span-2"><Label>Accessibility or working-condition information <span className="text-muted-foreground">(optional)</span></Label><Textarea value={form.accessibilityInfo} onChange={e => update("accessibilityInfo", e.target.value)} placeholder="Share relevant access, location or working-condition information." /></div><label className="sm:col-span-2 flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 cursor-pointer"><input type="checkbox" checked={form.safetyAcknowledged} onChange={e => update("safetyAcknowledged", e.target.checked)} className="mt-0.5" /><span><strong>I confirm the opportunity has a defined educational scope and that the named supervisor can provide the stated supervision.</strong> Institution approval is still required before a student can use it for a course practical.</span></label></div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={save} disabled={submit.isPending}>{submit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Submit for review</Button></DialogFooter></DialogContent></Dialog>;
}

function BusinessPracticals() {
  const { isAuthenticated } = useAuth();
  const { data, isLoading, error } = trpc.practicals.host.dashboard.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const utils = trpc.useUtils();
  const [builderOpen, setBuilderOpen] = useState(false);
  const start = trpc.practicals.host.startArrangement.useMutation({ onSuccess: () => { toast.success("Practical started. The student can now submit milestones."); utils.practicals.host.dashboard.invalidate(); }, onError: e => toast.error(e.message) });
  const confirm = trpc.practicals.host.confirmMilestone.useMutation({ onSuccess: () => { toast.success("Milestone confirmed."); utils.practicals.host.dashboard.invalidate(); }, onError: e => toast.error(e.message) });
  const completion = trpc.practicals.host.confirmCompletion.useMutation({ onSuccess: () => { toast.success("Completion confirmed and sent to the institution for final approval."); utils.practicals.host.dashboard.invalidate(); }, onError: e => toast.error(e.message) });

  if (isLoading) return <div className="container mx-auto py-12"><div className="h-64 rounded-2xl bg-muted animate-pulse" /></div>;
  if (error || !data) return <div className="container mx-auto max-w-4xl px-4 py-10"><PageHeader role="For businesses" title="Host a Practical" description="Turn a genuine, well-scoped business need into a course-linked student project, placement or cohort brief." /><Card className="mt-8 border-2 border-amber-300 bg-amber-50"><CardContent className="p-6 flex gap-4"><BriefcaseBusiness className="w-7 h-7 text-amber-700 shrink-0" /><div><h2 className="font-black">Set up your business profile first</h2><p className="mt-1 text-sm text-amber-950">A JutJut business profile is needed before you can submit a practical opportunity, name a supervisor or host a student. Once your profile is active, return here to submit your brief.</p></div></CardContent></Card></div>;
  return <div className="container mx-auto max-w-7xl px-4 py-8 space-y-8"><PageHeader role="For businesses" title="Host a Practical" description="Submit a defined opportunity. Your selected institution reviews it for course fit before students can apply." action={<Button onClick={() => setBuilderOpen(true)} className="gap-2"><Plus className="w-4 h-4" />Submit a Practical Opportunity</Button>} />
    <div className="grid gap-4 md:grid-cols-3"><Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Submitted opportunities</p><p className="mt-1 text-3xl font-black">{data.opportunities.length}</p></CardContent></Card><Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Active practicals</p><p className="mt-1 text-3xl font-black">{data.arrangements.filter(item => item.arrangement.status === "active").length}</p></CardContent></Card><Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Next step</p><p className="mt-1 text-sm font-bold">{data.opportunities.some(item => item.opportunity.status === "needs_information") ? "Respond to an institution request" : "Submit a well-scoped practical brief"}</p></CardContent></Card></div>
    <section><div className="flex items-end justify-between gap-3 mb-4"><div><h2 className="text-2xl font-black">Your opportunity pipeline</h2><p className="text-sm text-muted-foreground mt-1">Every submission has a visible review state and is not available to students until approved.</p></div></div>{data.opportunities.length === 0 ? <SectionEmpty icon={BriefcaseBusiness} title="No practical opportunities yet" description="Start with a real business problem, a defined deliverable and a named supervisor." action={<Button onClick={() => setBuilderOpen(true)}>Create opportunity</Button>} /> : <div className="grid gap-4 lg:grid-cols-2">{data.opportunities.map((item: any) => <Card key={item.opportunity.id}><CardHeader className="pb-3"><div className="flex justify-between gap-3"><div><CardTitle>{item.opportunity.title}</CardTitle><CardDescription className="mt-1">{prettyStatus(item.opportunity.type)} · submitted {formatDate(item.opportunity.createdAt)}</CardDescription></div><StatusBadge status={item.opportunity.status} /></div></CardHeader><CardContent className="space-y-3"><p className="text-sm text-muted-foreground line-clamp-2">{item.opportunity.businessNeed}</p>{item.reviews.map((review: any) => <div key={review.review.id} className="rounded-xl bg-muted/70 p-3"><div className="flex items-center justify-between gap-2"><p className="text-xs font-extrabold uppercase tracking-wide">{review.institution.name}</p><StatusBadge status={review.review.status} /></div><p className="mt-1 text-sm font-medium">{review.pathway.title}</p>{review.review.reviewNotes && <p className="mt-2 text-xs text-muted-foreground"><strong>Reviewer note:</strong> {review.review.reviewNotes}</p>}</div>)}</CardContent></Card>)}</div>}</section>
    <section><div className="mb-4"><h2 className="text-2xl font-black">Students and active practicals</h2><p className="text-sm text-muted-foreground mt-1">Start only after a student confirms commencement. Confirm submitted milestones and completion feedback here.</p></div>{data.arrangements.length === 0 ? <SectionEmpty icon={UsersRound} title="No student arrangements yet" description="When an institution approves a student for an opportunity, the arrangement and its milestone checklist appear here." /> : <div className="space-y-3">{data.arrangements.map((item: any) => <Card key={item.arrangement.id}><CardContent className="p-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex gap-2 flex-wrap"><StatusBadge status={item.arrangement.status} /><Badge variant="secondary">{item.pathway.title}</Badge></div><h3 className="mt-2 font-black">{item.student.name ?? "Student"} — {item.opportunity.title}</h3><p className="mt-1 text-sm text-muted-foreground">Supervisor: {item.arrangement.supervisorName} · {item.arrangement.supervisorEmail}</p></div><div className="flex flex-wrap gap-2">{item.arrangement.status === "ready_to_commence" && <Button onClick={() => start.mutate({ arrangementId: item.arrangement.id })} disabled={start.isPending}>Start practical</Button>}{item.arrangement.status === "active" && <Button variant="outline" onClick={() => { const submitted = item.milestones?.find((m: any) => m.status === "submitted"); if (submitted) confirm.mutate({ milestoneId: submitted.id }); else toast.message("No submitted milestone is awaiting confirmation."); }} disabled={confirm.isPending}>Confirm submitted milestone</Button>}{item.arrangement.status === "completion_pending" && <Button onClick={() => completion.mutate({ arrangementId: item.arrangement.id })} disabled={completion.isPending}>Confirm completion</Button>}</div></CardContent></Card>)}</div>}</section><OpportunityBuilderDialog open={builderOpen} onOpenChange={setBuilderOpen} /></div>;
}

function InstitutionRegistration({ onComplete }: { onComplete: () => void }) {
  const [form, setForm] = useState({ name: "", domain: "", providerType: "university", contactName: "", contactEmail: "", state: "" });
  const register = trpc.practicals.institution.auth.register.useMutation({ onSuccess: result => { toast.success(result.alreadyExists ? "This institution is already registered." : "Institution registration submitted for JutJut approval."); onComplete(); }, onError: e => toast.error(e.message) });
  const update = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }));
  return <Card className="mt-8 max-w-2xl border-2 border-primary/20"><CardHeader><CardTitle>Register your institution</CardTitle><CardDescription>Create your institution’s Practicals Hub. JutJut reviews registrations before course pathways can be published.</CardDescription></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2"><div className="space-y-2 sm:col-span-2"><Label>Institution name</Label><Input value={form.name} onChange={e => update("name", e.target.value)} /></div><div className="space-y-2"><Label>Institution email domain</Label><Input value={form.domain} onChange={e => update("domain", e.target.value)} placeholder="example.edu.au" /></div><div className="space-y-2"><Label>Provider type</Label><select value={form.providerType} onChange={e => update("providerType", e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="university">University</option><option value="tafe">TAFE / RTO</option><option value="school">School</option><option value="other">Other authorised provider</option></select></div><div className="space-y-2"><Label>Contact name</Label><Input value={form.contactName} onChange={e => update("contactName", e.target.value)} /></div><div className="space-y-2"><Label>Contact email</Label><Input type="email" value={form.contactEmail} onChange={e => update("contactEmail", e.target.value)} /></div><div className="space-y-2"><Label>State <span className="text-muted-foreground">(optional)</span></Label><Input value={form.state} onChange={e => update("state", e.target.value)} placeholder="QLD" maxLength={3} /></div><div className="flex items-end"><Button className="w-full" onClick={() => register.mutate({ ...form, state: form.state || undefined, providerType: form.providerType as any })} disabled={register.isPending}>{register.isPending && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}Submit registration</Button></div></CardContent></Card>;
}

function PathwayDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState({ title: "", courseName: "", unitName: "", discipline: "", level: "", practicalType: "project", description: "", learningOutcomes: "", eligibilitySummary: "", requiredHours: "", requiredDeliverables: "", status: "draft" });
  const create = trpc.practicals.institution.pathways.create.useMutation({ onSuccess: () => { toast.success("Course pathway created."); utils.practicals.institution.pathways.list.invalidate(); onOpenChange(false); }, onError: e => toast.error(e.message) });
  const update = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }));
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Create a course pathway</DialogTitle><DialogDescription>Define the reusable course rules used to assess business opportunities and student arrangements.</DialogDescription></DialogHeader><div className="grid gap-4 py-2 sm:grid-cols-2"><div className="space-y-2 sm:col-span-2"><Label>Pathway title</Label><Input value={form.title} onChange={e => update("title", e.target.value)} placeholder="e.g. Marketing Industry Project — Semester 2" /></div><div className="space-y-2"><Label>Course name</Label><Input value={form.courseName} onChange={e => update("courseName", e.target.value)} /></div><div className="space-y-2"><Label>Unit or subject <span className="text-muted-foreground">(optional)</span></Label><Input value={form.unitName} onChange={e => update("unitName", e.target.value)} /></div><div className="space-y-2"><Label>Discipline</Label><Input value={form.discipline} onChange={e => update("discipline", e.target.value)} placeholder="Marketing" /></div><div className="space-y-2"><Label>Level <span className="text-muted-foreground">(optional)</span></Label><Input value={form.level} onChange={e => update("level", e.target.value)} placeholder="Undergraduate Year 2" /></div><div className="space-y-2"><Label>Practical model</Label><select value={form.practicalType} onChange={e => update("practicalType", e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="project">Industry project</option><option value="placement">Supervised placement</option><option value="cohort_brief">Cohort brief</option><option value="mixed">Mixed</option></select></div><div className="space-y-2"><Label>Required hours <span className="text-muted-foreground">(optional)</span></Label><Input type="number" min="1" value={form.requiredHours} onChange={e => update("requiredHours", e.target.value)} /></div><div className="space-y-2 sm:col-span-2"><Label>Learning alignment</Label><Textarea value={form.learningOutcomes} onChange={e => update("learningOutcomes", e.target.value)} placeholder="Set the learning outcomes a host opportunity must support." /></div><div className="space-y-2 sm:col-span-2"><Label>Student eligibility summary</Label><Textarea value={form.eligibilitySummary} onChange={e => update("eligibilitySummary", e.target.value)} placeholder="Explain who is eligible and any course-specific requirements." /></div><div className="space-y-2 sm:col-span-2"><Label>Required deliverables</Label><Textarea value={form.requiredDeliverables} onChange={e => update("requiredDeliverables", e.target.value)} placeholder="State the evidence, hours or deliverables required for completion." /></div></div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={() => create.mutate({ ...form, practicalType: form.practicalType as any, status: form.status as any, unitName: form.unitName || undefined, level: form.level || undefined, description: form.description || undefined, learningOutcomes: form.learningOutcomes || undefined, eligibilitySummary: form.eligibilitySummary || undefined, requiredHours: form.requiredHours ? Number(form.requiredHours) : undefined, requiredDeliverables: form.requiredDeliverables || undefined, allowedDeliveryModes: ["on_site", "remote", "hybrid"] })} disabled={create.isPending}>{create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create pathway</Button></DialogFooter></DialogContent></Dialog>;
}

function InstitutionPracticals() {
  const { data: status, isLoading, refetch } = trpc.practicals.institution.auth.status.useQuery();
  const [pathwayOpen, setPathwayOpen] = useState(false);
  const utils = trpc.useUtils();
  const { data: pathways = [] } = trpc.practicals.institution.pathways.list.useQuery(undefined, { enabled: Boolean(status?.isApprovedMember) });
  const { data: reviews = [] } = trpc.practicals.institution.review.opportunities.useQuery(undefined, { enabled: Boolean(status?.isApprovedMember) });
  const { data: applications = [] } = trpc.practicals.institution.review.applications.useQuery(undefined, { enabled: Boolean(status?.isApprovedMember) });
  const { data: sourced = [] } = trpc.practicals.institution.review.selfSourced.useQuery(undefined, { enabled: Boolean(status?.isApprovedMember) });
  const { data: arrangements = [] } = trpc.practicals.institution.review.arrangements.useQuery(undefined, { enabled: Boolean(status?.isApprovedMember) });
  const publish = trpc.practicals.institution.pathways.setStatus.useMutation({ onSuccess: () => { toast.success("Course pathway updated."); utils.practicals.institution.pathways.list.invalidate(); }, onError: e => toast.error(e.message) });
  const decideOpportunity = trpc.practicals.institution.review.decideOpportunity.useMutation({ onSuccess: () => { toast.success("Opportunity review recorded."); utils.practicals.institution.review.opportunities.invalidate(); }, onError: e => toast.error(e.message) });
  const decideApplication = trpc.practicals.institution.review.decideApplication.useMutation({ onSuccess: () => { toast.success("Student matching decision recorded."); utils.practicals.institution.review.applications.invalidate(); utils.practicals.institution.review.arrangements.invalidate(); }, onError: e => toast.error(e.message) });
  const decideSourced = trpc.practicals.institution.review.decideSelfSourced.useMutation({ onSuccess: () => { toast.success("Student-sourced proposal review recorded."); utils.practicals.institution.review.selfSourced.invalidate(); }, onError: e => toast.error(e.message) });
  const complete = trpc.practicals.institution.review.confirmCompletion.useMutation({ onSuccess: () => { toast.success("Practical completed and verified for the student."); utils.practicals.institution.review.arrangements.invalidate(); }, onError: e => toast.error(e.message) });

  if (isLoading) return <div className="container mx-auto py-12"><div className="h-56 rounded-2xl bg-muted animate-pulse" /></div>;
  if (!status?.isApprovedMember) return <div className="container mx-auto max-w-5xl px-4 py-8"><PageHeader role="For institutions" title="JutJut Practicals Hub" description="Publish course pathways, assess business opportunities and support students through a course-required practical." />{status?.institution ? <Card className="mt-8 border-2 border-amber-300 bg-amber-50"><CardContent className="p-6 flex gap-4"><Clock3 className="w-7 h-7 shrink-0 text-amber-700" /><div><h2 className="font-black">Institution approval is pending</h2><p className="mt-1 text-sm text-amber-950">{status.institution.name} is registered. JutJut will confirm the institution before course pathways can be published and opportunities can be assessed.</p></div></CardContent></Card> : <InstitutionRegistration onComplete={() => refetch()} />}</div>;

  return <div className="container mx-auto max-w-7xl px-4 py-8 space-y-8"><PageHeader role="For institutions" title="JutJut Practicals Hub" description="Control the course rules, opportunity review and completion approvals that make practical learning legitimate and evidence-led." action={<Button onClick={() => setPathwayOpen(true)} className="gap-2"><Plus className="w-4 h-4" />Create course pathway</Button>} />
    <div className="grid gap-4 md:grid-cols-4"><Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Active pathways</p><p className="mt-1 text-3xl font-black">{pathways.filter(item => item.status === "active").length}</p></CardContent></Card><Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Opportunity reviews</p><p className="mt-1 text-3xl font-black">{reviews.filter((item: any) => item.review.status === "submitted").length}</p></CardContent></Card><Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Student matching</p><p className="mt-1 text-3xl font-black">{applications.filter((item: any) => item.application.status === "submitted").length}</p></CardContent></Card><Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Completion pending</p><p className="mt-1 text-3xl font-black">{arrangements.filter((item: any) => item.completion?.status === "supervisor_confirmed").length}</p></CardContent></Card></div>
    <section className="space-y-4"><div className="flex items-end justify-between"><div><h2 className="text-2xl font-black">Course pathways</h2><p className="text-sm text-muted-foreground mt-1">The reusable course rules that determine what can be reviewed and shown to students.</p></div></div>{pathways.length === 0 ? <SectionEmpty icon={BookOpenCheck} title="Create the first course pathway" description="Set the required practical model, learning alignment, eligibility and completion evidence before reviewing business submissions." action={<Button onClick={() => setPathwayOpen(true)}>Create course pathway</Button>} /> : <div className="grid gap-4 md:grid-cols-2">{pathways.map(item => <Card key={item.id}><CardContent className="p-5"><div className="flex gap-3 justify-between"><div><h3 className="font-black">{item.title}</h3><p className="mt-1 text-sm text-muted-foreground">{item.courseName} · {item.discipline}</p></div><StatusBadge status={item.status} /></div><div className="mt-4 flex flex-wrap gap-2 text-xs"><Badge variant="secondary">{prettyStatus(item.practicalType)}</Badge>{item.requiredHours && <Badge variant="secondary">{item.requiredHours} hours</Badge>}</div><div className="mt-4 flex gap-2">{item.status !== "active" && <Button size="sm" onClick={() => publish.mutate({ pathwayId: item.id, status: "active" })} disabled={publish.isPending}>Publish pathway</Button>}{item.status === "active" && <Button size="sm" variant="outline" onClick={() => publish.mutate({ pathwayId: item.id, status: "paused" })} disabled={publish.isPending}>Pause</Button>}</div></CardContent></Card>)}</div>}</section>
    <section className="space-y-4"><div><h2 className="text-2xl font-black">Opportunity review queue</h2><p className="text-sm text-muted-foreground mt-1">Assess the scope, learning alignment and supervision before a practical is visible to students.</p></div>{reviews.length === 0 ? <SectionEmpty icon={ClipboardCheck} title="No opportunities awaiting review" description="Business-submitted practical opportunities will appear here once they nominate one of your published course pathways." /> : <div className="space-y-3">{reviews.map((item: any) => <Card key={item.review.id}><CardContent className="p-5 flex flex-col gap-4 lg:flex-row lg:justify-between"><div><div className="flex flex-wrap gap-2"><StatusBadge status={item.review.status} /><Badge variant="secondary">{item.pathway.title}</Badge></div><h3 className="mt-2 font-black">{item.opportunity.title}</h3><p className="mt-1 text-sm text-muted-foreground">{item.employer.businessName} · {prettyStatus(item.opportunity.type)} · supervisor: {item.opportunity.supervisorName}</p><p className="mt-3 text-sm max-w-3xl">{item.opportunity.businessNeed}</p></div><div className="flex flex-wrap items-start gap-2">{item.review.status === "submitted" && <><Button size="sm" variant="outline" onClick={() => decideOpportunity.mutate({ reviewId: item.review.id, status: "needs_information", reviewNotes: "Please provide additional scope or supervision detail before this can be assessed." })}>Request detail</Button><Button size="sm" variant="outline" onClick={() => decideOpportunity.mutate({ reviewId: item.review.id, status: "declined", reviewNotes: "This opportunity is not suitable for this pathway in its current form." })}>Decline</Button><Button size="sm" onClick={() => decideOpportunity.mutate({ reviewId: item.review.id, status: "approved", studentVisibility: true, reviewNotes: "Approved for this course pathway." })}>Approve & open</Button></>}</div></CardContent></Card>)}</div>}</section>
    <section className="grid gap-6 xl:grid-cols-2"><Card><CardHeader><CardTitle className="flex items-center gap-2"><UsersRound className="w-5 h-5 text-primary" />Student matching</CardTitle><CardDescription>Approve a named student only after confirming the individual match is appropriate for the pathway.</CardDescription></CardHeader><CardContent className="space-y-3">{applications.length === 0 ? <p className="text-sm text-muted-foreground">No student applications are awaiting review.</p> : applications.map((item: any) => <div key={item.application.id} className="rounded-xl border p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-bold">{item.student.name ?? "Student"}</p><p className="text-xs text-muted-foreground">{item.opportunity.title} · {item.pathway.title}</p></div><StatusBadge status={item.application.status} /></div><p className="mt-2 text-sm text-muted-foreground line-clamp-2">{item.application.statement}</p>{item.application.status === "submitted" && <div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => decideApplication.mutate({ applicationId: item.application.id, status: "waitlisted", reviewNote: "Your application is currently waitlisted." })}>Waitlist</Button><Button size="sm" variant="outline" onClick={() => decideApplication.mutate({ applicationId: item.application.id, status: "declined", reviewNote: "The individual match could not be approved for this pathway." })}>Decline</Button><Button size="sm" onClick={() => decideApplication.mutate({ applicationId: item.application.id, status: "approved", reviewNote: "Approved subject to commencement confirmation." })}>Approve match</Button></div>}</div>)}</CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Handshake className="w-5 h-5 text-primary" />Student-sourced proposals</CardTitle><CardDescription>Review a host or project the student found themselves using the same course requirements.</CardDescription></CardHeader><CardContent className="space-y-3">{sourced.length === 0 ? <p className="text-sm text-muted-foreground">No student-sourced proposals are awaiting review.</p> : sourced.map((item: any) => <div key={item.proposal.id} className="rounded-xl border p-4"><div className="flex justify-between gap-3"><div><p className="font-bold">{item.proposal.proposedTitle}</p><p className="text-xs text-muted-foreground">{item.student.name ?? "Student"} · {item.proposal.hostOrganisationName}</p></div><StatusBadge status={item.proposal.status} /></div><p className="mt-2 text-sm text-muted-foreground line-clamp-2">{item.proposal.proposedDescription}</p>{item.proposal.status === "submitted" && <div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => decideSourced.mutate({ proposalId: item.proposal.id, status: "awaiting_host", coordinatorNote: "Please ask the proposed host to provide the required scope and supervisor details." })}>Request host detail</Button><Button size="sm" variant="outline" onClick={() => decideSourced.mutate({ proposalId: item.proposal.id, status: "declined", coordinatorNote: "This proposal does not currently meet the pathway requirements." })}>Decline</Button><Button size="sm" onClick={() => decideSourced.mutate({ proposalId: item.proposal.id, status: "approved", coordinatorNote: "Approved in principle, subject to the formal host arrangement." })}>Approve in principle</Button></div>}</div>)}</CardContent></Card></section>
    <section><div className="mb-4"><h2 className="text-2xl font-black">Completion approval</h2><p className="text-sm text-muted-foreground mt-1">Final course completion remains with the institution, after supervisor confirmation is recorded.</p></div>{arrangements.length === 0 ? <SectionEmpty icon={BadgeCheck} title="No practical arrangements yet" description="Approved student matches become arrangements here, with milestone and completion records." /> : <div className="space-y-3">{arrangements.map((item: any) => <Card key={item.arrangement.id}><CardContent className="p-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex gap-2 flex-wrap"><StatusBadge status={item.arrangement.status} /><StatusBadge status={item.completion?.status ?? "pending"} /></div><h3 className="mt-2 font-black">{item.student.name ?? "Student"} — {item.opportunity.title}</h3><p className="text-sm text-muted-foreground">{item.employer.businessName} · {item.pathway.title}</p></div>{item.completion?.status === "supervisor_confirmed" && <Button onClick={() => complete.mutate({ arrangementId: item.arrangement.id, outcomeSummary: `Institution-confirmed completion of ${item.opportunity.title}.` })} disabled={complete.isPending}><CheckCircle2 className="mr-2 w-4 h-4" />Confirm completion</Button>}</CardContent></Card>)}</div>}</section><PathwayDialog open={pathwayOpen} onOpenChange={setPathwayOpen} /></div>;
}

export default function PracticalsHub() {
  const [role, setRole] = useState<HubRole>("student");
  const tabs = useMemo(() => [
    { id: "student" as const, label: "My Practicals", icon: GraduationCap, description: "Find and complete a course-linked practical." },
    { id: "business" as const, label: "Host a Practical", icon: BriefcaseBusiness, description: "Submit a project, placement or cohort brief." },
    { id: "institution" as const, label: "Institution Hub", icon: Building2, description: "Set pathways, review and approve outcomes." },
  ], []);
  return <div className="min-h-[calc(100vh-8rem)] bg-[radial-gradient(circle_at_top_right,rgba(13,148,136,0.12),transparent_28%),radial-gradient(circle_at_left_30%,rgba(245,158,11,0.10),transparent_22%)]"><div className="container mx-auto max-w-7xl px-4 pt-6"><div className="rounded-2xl border-2 border-border bg-card p-2 shadow-sm flex flex-col gap-2 sm:flex-row">{tabs.map(tab => { const Icon = tab.icon; const selected = role === tab.id; return <button key={tab.id} onClick={() => setRole(tab.id)} className={`flex min-w-0 flex-1 items-center gap-3 rounded-xl px-4 py-3 text-left transition-all ${selected ? "bg-primary text-primary-foreground brutal-shadow-amber" : "hover:bg-muted"}`}><Icon className="w-5 h-5 shrink-0" /><span className="min-w-0"><span className="block font-extrabold text-sm">{tab.label}</span><span className={`block truncate text-xs ${selected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{tab.description}</span></span></button>})}</div></div>{role === "student" && <StudentPracticals />}{role === "business" && <BusinessPracticals />}{role === "institution" && <InstitutionPracticals />}</div>;
}
