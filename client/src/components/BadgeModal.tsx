/**
 * BadgeModal — displays all of a student's earned badges in a modal.
 *
 * Shows:
 *   - Credentials (skills / achievements)
 *   - Vouches (verified by a person)
 *   - Alumni badge (if earned — always shown to the student regardless of showAlumniBadge)
 *
 * Usage:
 *   <BadgeModal open={open} onClose={() => setOpen(false)} />
 */
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Award, Users, GraduationCap, CheckCircle2, Clock } from "lucide-react";

interface BadgeModalProps {
  open: boolean;
  onClose: () => void;
}

export default function BadgeModal({ open, onClose }: BadgeModalProps) {
  const { user } = useAuth();

  const { data: badgeCounts, isLoading } = trpc.alumni.badgeCounts.useQuery(
    undefined,
    { enabled: !!user && open }
  );

  const { data: alumniStatus } = trpc.alumni.status.useQuery(
    undefined,
    { enabled: !!user && open }
  );

  const { data: myKit } = trpc.alumni.myKit.useQuery(
    undefined,
    { enabled: !!user && open }
  );

  const credentials = myKit?.credentials;
  const vouches = myKit?.vouches;

  const isAlumni = alumniStatus?.alumniEmailVerified === true;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            My Badges
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3 py-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="space-y-5 py-2">
            {/* Summary row */}
            <div className="flex gap-3 p-3 rounded-lg bg-muted/50 text-sm">
              <span className="font-medium">{badgeCounts?.total ?? 0} badges total</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">{badgeCounts?.credentials ?? 0} credentials</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">{badgeCounts?.vouches ?? 0} vouches</span>
            </div>

            {/* Alumni badge — always shown to the student */}
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5" />
                Alumni
              </h3>
              {isAlumni ? (
                <div className="flex items-center gap-3 p-3 rounded-lg border-2 border-primary/30 bg-primary/5">
                  <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                    <GraduationCap className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">JutJut Alumni</p>
                    <p className="text-xs text-muted-foreground">Personal email verified · {alumniStatus?.personalEmail}</p>
                  </div>
                  <Badge variant="default" className="text-xs shrink-0">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Earned
                  </Badge>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-border bg-muted/30">
                  <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <GraduationCap className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-muted-foreground">JutJut Alumni</p>
                    <p className="text-xs text-muted-foreground">Verify a personal email in Settings to earn this badge.</p>
                  </div>
                  <Badge variant="secondary" className="text-xs shrink-0">Not earned</Badge>
                </div>
              )}
            </section>

            {/* Credentials */}
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <Award className="h-3.5 w-3.5" />
                Credentials ({badgeCounts?.credentials ?? 0})
              </h3>
              {credentials && credentials.length > 0 ? (
                <div className="space-y-2">
                  {credentials.map((cred) => (
                    <div key={cred.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                      <div className="h-8 w-8 rounded bg-secondary/15 flex items-center justify-center shrink-0">
                        <Award className="h-4 w-4 text-secondary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{cred.title}</p>
                        {cred.issuer && (
                          <p className="text-xs text-muted-foreground truncate">{cred.issuer}</p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {cred.type ?? "Credential"}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-2 pl-1">No credentials added yet.</p>
              )}
            </section>

            {/* Vouches */}
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Vouches ({badgeCounts?.vouches ?? 0})
              </h3>
              {vouches && vouches.length > 0 ? (
                <div className="space-y-2">
                  {vouches.map((vouch) => (
                    <div key={vouch.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                      <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                        <Users className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{vouch.voucherName}</p>
                        {vouch.voucherTitle && (
                          <p className="text-xs text-muted-foreground truncate">{vouch.voucherTitle}</p>
                        )}
                      </div>
                      <Badge
                        variant={vouch.status === "verified" ? "default" : "secondary"}
                        className="text-xs shrink-0"
                      >
                        {vouch.status === "verified" ? (
                          <><CheckCircle2 className="h-3 w-3 mr-1" />Verified</>
                        ) : (
                          <><Clock className="h-3 w-3 mr-1" />Pending</>
                        )}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-2 pl-1">No vouches yet.</p>
              )}
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
