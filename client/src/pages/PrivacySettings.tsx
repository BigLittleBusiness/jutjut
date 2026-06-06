import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Eye, MapPin, GraduationCap, Info, Mail, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import EmployerProfilePreview from "@/components/EmployerProfilePreview";

const YEAR_LEVELS = [
  "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12",
  "University Year 1", "University Year 2", "University Year 3", "University Year 4+",
  "Graduate", "Other",
];

export default function PrivacySettings() {
  const { user, loading } = useAuth();

  // ── Privacy data ──────────────────────────────────────────────────────────
  const { data: privacyData, isLoading } = trpc.employer.privacy.get.useQuery(
    undefined,
    { enabled: !!user }
  );

  // ── Alumni status ─────────────────────────────────────────────────────────
  const { data: alumniStatus, isLoading: alumniLoading } = trpc.alumni.status.useQuery(
    undefined,
    { enabled: !!user }
  );

  const utils = trpc.useUtils();

  // ── URL-based verify result (redirected back from /api/verify-alumni-email) ─
  const verifyResult = new URLSearchParams(window.location.search).get("verify");

  // ── Mutations ─────────────────────────────────────────────────────────────
  const updatePrivacy = trpc.employer.privacy.update.useMutation({
    onSuccess: () => {
      void utils.employer.privacy.get.invalidate();
      toast.success("Privacy settings saved.");
    },
    onError: () => {
      toast.error("Failed to save settings. Please try again.");
    },
  });

  const requestEmailVerify = trpc.alumni.requestEmailVerify.useMutation({
    onSuccess: () => {
      toast.success("Verification email sent! Check your inbox and click the link within 24 hours.");
      setPersonalEmailInput("");
      void utils.alumni.status.invalidate();
    },
    onError: (err) => {
      toast.error(err.message ?? "Failed to send verification email.");
    },
  });

  const updateAlumniSettings = trpc.alumni.updateSettings.useMutation({
    onSuccess: () => {
      void utils.alumni.status.invalidate();
      toast.success("Alumni settings saved.");
    },
    onError: () => {
      toast.error("Failed to save alumni settings.");
    },
  });

  // ── Local state ───────────────────────────────────────────────────────────
  const [shareContact, setShareContact] = useState(false);
  const [yearLevel, setYearLevel] = useState<string>("");
  const [postcode, setPostcode] = useState("");
  const [dirty, setDirty] = useState(false);

  const [personalEmailInput, setPersonalEmailInput] = useState("");
  const [showAlumniBadge, setShowAlumniBadge] = useState(true);
  const [graduationDate, setGraduationDate] = useState("");
  const [alumniDirty, setAlumniDirty] = useState(false);

  useEffect(() => {
    if (privacyData) {
      setShareContact(privacyData.shareContactWithEmployers ?? false);
      setYearLevel(privacyData.yearLevel ?? "");
      setPostcode(privacyData.postcode ?? "");
      setDirty(false);
    }
  }, [privacyData]);

  useEffect(() => {
    if (alumniStatus) {
      setShowAlumniBadge(alumniStatus.showAlumniBadge ?? true);
      setGraduationDate(
        alumniStatus.graduationDate
          ? new Date(alumniStatus.graduationDate).toISOString().split("T")[0]
          : ""
      );
      setAlumniDirty(false);
    }
  }, [alumniStatus]);

  // Show toast for verify redirect result
  useEffect(() => {
    if (verifyResult === "success") {
      toast.success("Your personal email has been verified successfully!");
    } else if (verifyResult === "expired") {
      toast.error("The verification link has expired. Please request a new one.");
    } else if (verifyResult === "invalid" || verifyResult === "error") {
      toast.error("The verification link is invalid. Please request a new one.");
    }
    // Clean up the query param from the URL without a page reload
    if (verifyResult) {
      const url = new URL(window.location.href);
      url.searchParams.delete("verify");
      window.history.replaceState({}, "", url.toString());
    }
  }, [verifyResult]);

  if (loading || isLoading || alumniLoading) {
    return (
      <div className="container max-w-2xl py-10">
        <div className="h-8 w-48 bg-muted animate-pulse rounded mb-4" />
        <div className="h-48 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container max-w-2xl py-10 text-center">
        <p className="text-muted-foreground mb-4">Please sign in to manage your privacy settings.</p>
        <Button asChild>
          <a href={getLoginUrl()}>Sign In</a>
        </Button>
      </div>
    );
  }

  const handleSave = () => {
    updatePrivacy.mutate({
      shareContactWithEmployers: shareContact,
      yearLevel: yearLevel || null,
      postcode: postcode || null,
    });
    setDirty(false);
  };

  const handleAlumniSave = () => {
    updateAlumniSettings.mutate({
      showAlumniBadge,
      graduationDate: graduationDate || null,
    });
    setAlumniDirty(false);
  };

  const handleRequestVerify = () => {
    if (!personalEmailInput) return;
    requestEmailVerify.mutate({
      personalEmail: personalEmailInput,
      origin: window.location.origin,
    });
  };

  const isVerified = alumniStatus?.alumniEmailVerified === true;
  // hasPending: a personal email is set but not yet verified
  const hasPending = !!alumniStatus?.personalEmail && !isVerified;

  return (
    <div className="container max-w-2xl py-10 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Privacy Settings</h1>
            <p className="text-sm text-muted-foreground">Control what information is shared with employers and businesses.</p>
          </div>
        </div>
        <EmployerProfilePreview />
      </div>

      {/* Contact Sharing */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Contact Sharing with Employers</CardTitle>
          </div>
          <CardDescription>
            When you apply for a job, employers can only see your name and email if you enable this setting.
            With it off, your application is anonymous — employers see your verified skills and credentials only.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Share my name and email when I apply</p>
              <p className="text-xs text-muted-foreground">
                {shareContact
                  ? "Employers can contact you directly after reviewing your application."
                  : "Your identity is hidden. Employers see your Kit but not your contact details."}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={shareContact ? "default" : "secondary"} className="text-xs">
                {shareContact ? "Sharing" : "Anonymous"}
              </Badge>
              <Switch
                checked={shareContact}
                onCheckedChange={(v) => { setShareContact(v); setDirty(true); }}
              />
            </div>
          </div>
          <div className="mt-4 p-3 bg-muted/50 rounded-lg flex gap-2 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>
              This setting is snapshotted at the time you apply — changing it later does not affect previous applications.
              Employers who received your contact details before you turned this off will retain them.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Profile Enrichment */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Profile Enrichment</CardTitle>
          </div>
          <CardDescription>
            Providing your year level and postcode helps JutJut show you more relevant jobs and drops.
            This data is also used in anonymised analytics shown to employers and businesses — never linked to your name.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="year-level">Year Level</Label>
            <Select
              value={yearLevel}
              onValueChange={(v) => { setYearLevel(v); setDirty(true); }}
            >
              <SelectTrigger id="year-level">
                <SelectValue placeholder="Select your year level" />
              </SelectTrigger>
              <SelectContent>
                {YEAR_LEVELS.map(yl => (
                  <SelectItem key={yl} value={yl}>{yl}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="postcode" className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              Postcode
            </Label>
            <Input
              id="postcode"
              placeholder="e.g. 4000"
              value={postcode}
              maxLength={10}
              onChange={(e) => { setPostcode(e.target.value); setDirty(true); }}
              className="max-w-xs"
            />
            <p className="text-xs text-muted-foreground">
              Used to surface nearby opportunities. Never shared with your name.
            </p>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={() => {
            if (privacyData) {
              setShareContact(privacyData.shareContactWithEmployers ?? false);
              setYearLevel(privacyData.yearLevel ?? "");
              setPostcode(privacyData.postcode ?? "");
              setDirty(false);
            }
          }}
          disabled={!dirty || updatePrivacy.isPending}
        >
          Discard
        </Button>
        <Button
          onClick={handleSave}
          disabled={!dirty || updatePrivacy.isPending}
        >
          {updatePrivacy.isPending ? "Saving…" : "Save Settings"}
        </Button>
      </div>

      {/* ── Alumni Email Transition ─────────────────────────────────────────── */}
      <Separator />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Alumni Email Transition</CardTitle>
          </div>
          <CardDescription>
            When you graduate, your school email will no longer be active. Add a personal email address
            so you can continue using JutJut as an alumni member.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Current status */}
          {isVerified ? (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
              <div className="text-sm">
                <span className="font-medium text-green-800 dark:text-green-300">Personal email verified: </span>
                <span className="text-green-700 dark:text-green-400">{alumniStatus?.personalEmail}</span>
              </div>
            </div>
          ) : hasPending ? (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
              <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <div className="text-sm">
                <span className="font-medium text-amber-800 dark:text-amber-300">Verification pending: </span>
                <span className="text-amber-700 dark:text-amber-400">{alumniStatus?.personalEmail}</span>
                <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
                  Check your inbox and click the verification link. Links expire after 24 hours.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
              <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0" />
              <p className="text-sm text-muted-foreground">No personal email added yet.</p>
            </div>
          )}

          {/* Add / change personal email */}
          <div className="space-y-2">
            <Label htmlFor="personal-email">
              {isVerified ? "Change personal email" : "Add personal email"}
            </Label>
            <div className="flex gap-2">
              <Input
                id="personal-email"
                type="email"
                placeholder="your@gmail.com"
                value={personalEmailInput}
                onChange={(e) => setPersonalEmailInput(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleRequestVerify}
                disabled={!personalEmailInput || requestEmailVerify.isPending}
                variant="outline"
              >
                {requestEmailVerify.isPending ? "Sending…" : "Send Verification"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              A verification link will be sent to this address. School email addresses are not accepted.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── Alumni Badge & Graduation Date ─────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Alumni Badge & Graduation Date</CardTitle>
          </div>
          <CardDescription>
            Your Alumni badge is awarded automatically when your personal email is verified.
            You can choose whether to display it on your profile, and set your graduation date
            so JutJut can remind you to transition your email before you lose school access.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Alumni badge toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Show Alumni badge on my profile</p>
              <p className="text-xs text-muted-foreground">
                {isVerified
                  ? "Your Alumni badge is active. Employers can see it on your profile."
                  : "Verify a personal email to earn your Alumni badge."}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge
                variant={isVerified && showAlumniBadge ? "default" : "secondary"}
                className="text-xs"
              >
                {isVerified ? (showAlumniBadge ? "Visible" : "Hidden") : "Not earned"}
              </Badge>
              <Switch
                checked={showAlumniBadge}
                onCheckedChange={(v) => { setShowAlumniBadge(v); setAlumniDirty(true); }}
                disabled={!isVerified}
              />
            </div>
          </div>

          {/* Graduation date */}
          <div className="space-y-2">
            <Label htmlFor="graduation-date">Graduation Date</Label>
            <Input
              id="graduation-date"
              type="date"
              value={graduationDate}
              onChange={(e) => { setGraduationDate(e.target.value); setAlumniDirty(true); }}
              className="max-w-xs"
            />
            <p className="text-xs text-muted-foreground">
              JutJut will send you reminders at 3 months, 1 month, and 1 week before this date
              to ensure you have a personal email set up before losing school email access.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <Button
              variant="outline"
              onClick={() => {
                if (alumniStatus) {
                  setShowAlumniBadge(alumniStatus.showAlumniBadge ?? true);
                  setGraduationDate(
                    alumniStatus.graduationDate
                      ? new Date(alumniStatus.graduationDate).toISOString().split("T")[0]
                      : ""
                  );
                  setAlumniDirty(false);
                }
              }}
              disabled={!alumniDirty || updateAlumniSettings.isPending}
            >
              Discard
            </Button>
            <Button
              onClick={handleAlumniSave}
              disabled={!alumniDirty || updateAlumniSettings.isPending}
            >
              {updateAlumniSettings.isPending ? "Saving…" : "Save Alumni Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
