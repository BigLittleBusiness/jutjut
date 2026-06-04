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
import { Shield, Eye, MapPin, GraduationCap, Info } from "lucide-react";
import EmployerProfilePreview from "@/components/EmployerProfilePreview";

const YEAR_LEVELS = [
  "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12",
  "University Year 1", "University Year 2", "University Year 3", "University Year 4+",
  "Graduate", "Other",
];

export default function PrivacySettings() {
  const { user, loading } = useAuth();

  const { data: privacyData, isLoading } = trpc.employer.privacy.get.useQuery(
    undefined,
    { enabled: !!user }
  );

  const utils = trpc.useUtils();
  const updatePrivacy = trpc.employer.privacy.update.useMutation({
    onSuccess: () => {
      void utils.employer.privacy.get.invalidate();
      toast.success("Privacy settings saved.");
    },
    onError: () => {
      toast.error("Failed to save settings. Please try again.");
    },
  });

  const [shareContact, setShareContact] = useState(false);
  const [yearLevel, setYearLevel] = useState<string>("");
  const [postcode, setPostcode] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (privacyData) {
      setShareContact(privacyData.shareContactWithEmployers ?? false);
      setYearLevel(privacyData.yearLevel ?? "");
      setPostcode(privacyData.postcode ?? "");
      setDirty(false);
    }
  }, [privacyData]);

  if (loading || isLoading) {
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
    </div>
  );
}
