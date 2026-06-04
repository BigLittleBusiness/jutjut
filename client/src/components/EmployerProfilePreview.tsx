/**
 * EmployerProfilePreview
 *
 * Shows students exactly how their profile appears to an employer.
 * Includes a live contact-sharing toggle and explanatory tooltips on every
 * "Hidden" badge so students understand exactly why a field is not visible.
 *
 * Triggered from the Privacy Settings page via the "Preview Profile" button.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Eye,
  EyeOff,
  User,
  Mail,
  MapPin,
  GraduationCap,
  Award,
  ThumbsUp,
  FileText,
  Briefcase,
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * A visibility badge that, when hidden, shows a tooltip explaining why.
 * Pass `reason` only for hidden badges — it becomes the tooltip content.
 */
function VisibilityBadge({
  visible,
  label,
  reason,
}: {
  visible: boolean;
  label: string;
  reason?: string;
}) {
  const badge = (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium cursor-default ${
        visible
          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
          : "bg-muted text-muted-foreground"
      }`}
    >
      {visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
      {label}
      {!visible && reason && <HelpCircle className="h-3 w-3 ml-0.5 opacity-60" />}
    </span>
  );

  if (!visible && reason) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="left" className="max-w-[220px] text-xs leading-snug">
          {reason}
        </TooltipContent>
      </Tooltip>
    );
  }

  return badge;
}

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="h-4 w-4 text-primary" />
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return <p className="text-xs text-muted-foreground italic py-2">{label}</p>;
}

function statusIcon(status: string) {
  if (status === "shortlisted" || status === "accepted")
    return <CheckCircle className="h-3.5 w-3.5 text-green-500" />;
  if (status === "rejected") return <XCircle className="h-3.5 w-3.5 text-destructive" />;
  return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function EmployerProfilePreview() {
  const [open, setOpen] = useState(false);
  const utils = trpc.useUtils();

  // Fetch the employer-view of the student's own profile (only when modal is open)
  const { data, isLoading, error } = trpc.employer.privacy.previewProfile.useQuery(
    undefined,
    { enabled: open }
  );

  // Live toggle mutation — updates the DB and immediately refetches the preview
  const updatePrivacy = trpc.employer.privacy.update.useMutation({
    onSuccess: () => {
      utils.employer.privacy.previewProfile.invalidate();
    },
    onError: () => {
      toast.error("Could not update setting. Please try again.");
    },
  });

  function handleToggle(checked: boolean) {
    updatePrivacy.mutate({ shareContactWithEmployers: checked });
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Eye className="h-4 w-4" />
            Preview Profile
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Employer View of Your Profile
            </DialogTitle>
            <DialogDescription>
              This is exactly what an employer sees when they review your application.
              Fields marked <span className="text-muted-foreground font-medium">hidden</span> are
              not visible to them.
            </DialogDescription>
          </DialogHeader>

          {/* ── Live contact-sharing toggle ── */}
          {(data || isLoading) && (
            <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-3">
              <div>
                <Label htmlFor="preview-share-toggle" className="text-sm font-medium cursor-pointer">
                  Share my contact details with employers
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Toggle to see how the preview changes instantly.
                </p>
              </div>
              <Switch
                id="preview-share-toggle"
                checked={data?.shareContact ?? false}
                onCheckedChange={handleToggle}
                disabled={isLoading || updatePrivacy.isPending}
                aria-label="Share contact details with employers"
              />
            </div>
          )}

          {isLoading && (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading your profile…</span>
            </div>
          )}

          {error && (
            <div className="py-6 text-center text-sm text-destructive">
              Could not load profile preview. Please try again.
            </div>
          )}

          {data && (
            <div className="space-y-5 pt-1">

              {/* ── Identity ── */}
              <div>
                <SectionHeader icon={User} title="Identity" />
                <div className="rounded-lg border bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {data.name ? (
                          <span className="font-medium">{data.name}</span>
                        ) : (
                          <span className="text-muted-foreground italic">Anonymous Student</span>
                        )}
                      </span>
                    </div>
                    <VisibilityBadge
                      visible={data.shareContact}
                      label={data.shareContact ? "Visible" : "Hidden"}
                      reason={
                        !data.shareContact
                          ? "Your name is hidden because \"Share my contact details\" is turned off. Employers see you as Anonymous Student."
                          : undefined
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {data.email ? (
                          <span className="font-medium">{data.email}</span>
                        ) : (
                          <span className="text-muted-foreground italic">Not shown to employer</span>
                        )}
                      </span>
                    </div>
                    <VisibilityBadge
                      visible={data.shareContact}
                      label={data.shareContact ? "Visible" : "Hidden"}
                      reason={
                        !data.shareContact
                          ? "Your email is hidden because \"Share my contact details\" is turned off. Enable it so employers can contact you directly after reviewing your application."
                          : undefined
                      }
                    />
                  </div>
                  {!data.shareContact && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded px-3 py-2">
                      Use the toggle above to let employers reach you directly — the preview updates instantly.
                    </p>
                  )}
                </div>
              </div>

              {/* ── Profile Enrichment ── */}
              <div>
                <SectionHeader icon={GraduationCap} title="Profile Enrichment" />
                <div className="rounded-lg border bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {data.yearLevel ? (
                          <span className="font-medium">{data.yearLevel}</span>
                        ) : (
                          <span className="text-muted-foreground italic">Not set</span>
                        )}
                      </span>
                    </div>
                    <VisibilityBadge
                      visible={!!data.yearLevel}
                      label={data.yearLevel ? "In analytics" : "Not provided"}
                      reason={
                        !data.yearLevel
                          ? "Year level is not provided. It only appears in anonymised employer analytics (never linked to your name). Add it in Privacy Settings to help employers understand their student reach."
                          : undefined
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {data.postcode ? (
                          <span className="font-medium">Postcode {data.postcode}</span>
                        ) : (
                          <span className="text-muted-foreground italic">Not set</span>
                        )}
                      </span>
                    </div>
                    <VisibilityBadge
                      visible={!!data.postcode}
                      label={data.postcode ? "In analytics" : "Not provided"}
                      reason={
                        !data.postcode
                          ? "Postcode is not provided. It only appears in anonymised employer analytics to show geographic reach — your exact address is never shared. Add it in Privacy Settings."
                          : undefined
                      }
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Year level and postcode appear only in anonymised breakdowns — never linked to your name.
                  </p>
                </div>
              </div>

              <Separator />

              {/* ── Credentials ── */}
              <div>
                <SectionHeader icon={Award} title={`Credentials (${data.credentials.length})`} />
                {data.credentials.length === 0 ? (
                  <EmptyState label="No credentials added yet. Add certificates, badges, or awards to your Kit." />
                ) : (
                  <div className="space-y-2">
                    {data.credentials.map((c) => (
                      <div
                        key={c.id}
                        className="rounded-lg border bg-card px-4 py-3 flex items-start justify-between gap-3"
                      >
                        <div>
                          <p className="text-sm font-medium">{c.title}</p>
                          {c.issuer && <p className="text-xs text-muted-foreground">{c.issuer}</p>}
                          {c.issuedAt && (
                            <p className="text-xs text-muted-foreground">
                              {new Date(c.issuedAt).toLocaleDateString("en-AU", {
                                month: "short",
                                year: "numeric",
                              })}
                            </p>
                          )}
                        </div>
                        <Badge variant="secondary" className="text-xs shrink-0 capitalize">
                          {c.type ?? "other"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Vouches ── */}
              <div>
                <SectionHeader icon={ThumbsUp} title={`Vouches (${data.vouches.length})`} />
                {data.vouches.length === 0 ? (
                  <EmptyState label="No vouches yet. Ask a supervisor or teacher to vouch for you." />
                ) : (
                  <div className="space-y-2">
                    {data.vouches.map((v) => (
                      <div key={v.id} className="rounded-lg border bg-card px-4 py-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">{v.voucherName}</p>
                            {(v.voucherTitle || v.voucherOrg) && (
                              <p className="text-xs text-muted-foreground">
                                {[v.voucherTitle, v.voucherOrg].filter(Boolean).join(" · ")}
                              </p>
                            )}
                          </div>
                          <Badge
                            variant={v.status === "verified" ? "default" : "secondary"}
                            className="text-xs shrink-0 capitalize"
                          >
                            {v.status}
                          </Badge>
                        </div>
                        {v.message && (
                          <p className="mt-2 text-xs text-muted-foreground line-clamp-2 italic">
                            "{v.message}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Report Cards ── */}
              <div>
                <SectionHeader icon={FileText} title={`Report Cards (${data.reportCards.length})`} />
                {data.reportCards.length === 0 ? (
                  <EmptyState label="No report cards uploaded yet." />
                ) : (
                  <div className="space-y-2">
                    {data.reportCards.map((r) => (
                      <div
                        key={r.id}
                        className="rounded-lg border bg-card px-4 py-3 flex items-center justify-between gap-3"
                      >
                        <div>
                          {r.aiGrade && <p className="text-sm font-medium">Grade: {r.aiGrade}</p>}
                          {r.aiGpa && <p className="text-xs text-muted-foreground">GPA: {r.aiGpa}</p>}
                          {!r.aiGrade && !r.aiGpa && (
                            <p className="text-sm text-muted-foreground italic">Processing…</p>
                          )}
                        </div>
                        <Badge
                          variant={r.verified ? "default" : "secondary"}
                          className="text-xs shrink-0"
                        >
                          {r.verified ? "Verified" : "Pending"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Application History ── */}
              <div>
                <SectionHeader
                  icon={Briefcase}
                  title={`Application History (${data.applications.length})`}
                />
                {data.applications.length === 0 ? (
                  <EmptyState label="No applications yet. Browse the Jobs Board to get started." />
                ) : (
                  <div className="space-y-2">
                    {data.applications.map((a) => (
                      <div
                        key={a.id}
                        className="rounded-lg border bg-card px-4 py-3 flex items-center justify-between gap-3"
                      >
                        <div>
                          <p className="text-sm font-medium">{a.jobTitle ?? "Untitled Job"}</p>
                          {a.employer && (
                            <p className="text-xs text-muted-foreground">{a.employer}</p>
                          )}
                          {a.createdAt && (
                            <p className="text-xs text-muted-foreground">
                              Applied {new Date(a.createdAt).toLocaleDateString("en-AU")}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {statusIcon(a.status ?? "")}
                          <span className="text-xs capitalize text-muted-foreground">
                            {a.status ?? "pending"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
