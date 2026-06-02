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
import { Link } from "wouter";

export default function EmailPreferences() {
  const { user, loading } = useAuth();

  // Check for one-click unsubscribe params in URL
  const params = new URLSearchParams(window.location.search);
  const uidParam = params.get("uid");
  const unsubParam = params.get("unsub");

  const unsubscribeByToken = trpc.email.preferences.unsubscribeByToken.useMutation({
    onSuccess: () => {
      toast.success("You have been unsubscribed from all marketing emails.");
    },
    onError: () => {
      toast.error("Something went wrong. Please try again.");
    },
  });

  // Auto-trigger one-click unsubscribe if URL params are present
  useEffect(() => {
    if (uidParam && unsubParam === "1" && !unsubscribeByToken.isPending && !unsubscribeByToken.isSuccess) {
      unsubscribeByToken.mutate({ uid: parseInt(uidParam, 10) });
    }
  }, [uidParam, unsubParam]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: prefs, isLoading: prefsLoading } = trpc.email.preferences.get.useQuery(
    undefined,
    { enabled: !!user }
  );

  const utils = trpc.useUtils();

  const updatePrefs = trpc.email.preferences.update.useMutation({
    onSuccess: () => {
      void utils.email.preferences.get.invalidate();
      toast.success("Preferences saved.");
    },
    onError: () => {
      toast.error("Failed to save preferences. Please try again.");
    },
  });

  const unsubscribeAll = trpc.email.preferences.unsubscribeAll.useMutation({
    onSuccess: () => {
      void utils.email.preferences.get.invalidate();
      toast.success("You have been unsubscribed from all marketing emails.");
    },
    onError: () => {
      toast.error("Failed to unsubscribe. Please try again.");
    },
  });

  const [localPrefs, setLocalPrefs] = useState({
    marketingEmails: false,
    weeklyDigest: false,
    dropReminders: false,
  });

  // Sync local state when server data arrives
  useEffect(() => {
    if (prefs) {
      setLocalPrefs({
        marketingEmails: prefs.marketingEmails,
        weeklyDigest: prefs.weeklyDigest,
        dropReminders: prefs.dropReminders,
      });
    }
  }, [prefs]);

  const handleToggle = (key: keyof typeof localPrefs, value: boolean) => {
    const next = { ...localPrefs, [key]: value };
    setLocalPrefs(next);
    updatePrefs.mutate({ [key]: value });
  };

  // One-click unsubscribe landing state (no login required)
  if (uidParam && unsubParam === "1") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="text-4xl mb-2">
              {unsubscribeByToken.isSuccess ? "✅" : unsubscribeByToken.isPending ? "⏳" : "📧"}
            </div>
            <CardTitle>
              {unsubscribeByToken.isSuccess
                ? "Unsubscribed"
                : unsubscribeByToken.isPending
                ? "Processing…"
                : "Unsubscribing…"}
            </CardTitle>
            <CardDescription>
              {unsubscribeByToken.isSuccess
                ? "You've been removed from all JutJut marketing emails. You'll still receive important transactional emails (e.g. application updates, placement notifications)."
                : "Please wait while we update your preferences."}
            </CardDescription>
          </CardHeader>
          {unsubscribeByToken.isSuccess && (
            <CardContent className="text-center">
              <Link href="/">
                <Button variant="outline" size="sm">Back to JutJut</Button>
              </Link>
            </CardContent>
          )}
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle>Sign in to manage preferences</CardTitle>
            <CardDescription>
              You need to be signed in to manage your email preferences.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 items-center">
            <a href={getLoginUrl()}>
              <Button>Sign in</Button>
            </a>
            <Link href="/">
              <Button variant="ghost" size="sm">Back to JutJut</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <span className="text-xl font-black tracking-tight text-foreground cursor-pointer">
              jut<span className="text-teal-500">jut</span>
            </span>
          </Link>
          <span className="text-sm text-muted-foreground">Email Preferences</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-1">Email preferences</h1>
          <p className="text-muted-foreground text-sm">
            Manage which emails JutJut sends to <strong>{user.email}</strong>.
          </p>
        </div>

        {/* Transactional notice */}
        <Card className="mb-6 border-teal-200 bg-teal-50 dark:bg-teal-950/20 dark:border-teal-800">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-teal-800 dark:text-teal-300">
              <strong>Important:</strong> Transactional emails (application updates, placement notifications, receipts, and security alerts) cannot be turned off — they are essential for using the platform.
            </p>
          </CardContent>
        </Card>

        {/* Preference toggles */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Marketing & optional emails</CardTitle>
            <CardDescription>
              These emails are optional. Turn them off at any time.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-0">
            {prefsLoading ? (
              <div className="py-8 text-center text-muted-foreground text-sm">Loading preferences…</div>
            ) : (
              <>
                <PreferenceRow
                  title="Marketing emails"
                  description="Product updates, tips, and news about JutJut."
                  checked={localPrefs.marketingEmails}
                  onCheckedChange={(v) => handleToggle("marketingEmails", v)}
                  loading={updatePrefs.isPending}
                />
                <Separator />
                <PreferenceRow
                  title="Weekly digest"
                  description="A weekly summary of new jobs, drops, and platform activity."
                  checked={localPrefs.weeklyDigest}
                  onCheckedChange={(v) => handleToggle("weeklyDigest", v)}
                  loading={updatePrefs.isPending}
                />
                <Separator />
                <PreferenceRow
                  title="Drop reminders"
                  description="Reminders when a Drop you've claimed is about to expire, and announcements when new Drops go live."
                  checked={localPrefs.dropReminders}
                  onCheckedChange={(v) => handleToggle("dropReminders", v)}
                  loading={updatePrefs.isPending}
                />
              </>
            )}
          </CardContent>
        </Card>

        {/* Unsubscribe all */}
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-base text-destructive">Unsubscribe from all</CardTitle>
            <CardDescription>
              Turn off all optional marketing emails in one click. You'll still receive transactional emails.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => unsubscribeAll.mutate()}
              disabled={unsubscribeAll.isPending}
            >
              {unsubscribeAll.isPending ? "Unsubscribing…" : "Unsubscribe from all marketing emails"}
            </Button>
          </CardContent>
        </Card>

        {/* Status badges */}
        <div className="mt-6 flex gap-2 flex-wrap">
          {updatePrefs.isPending && (
            <Badge variant="secondary">Saving…</Badge>
          )}
          {updatePrefs.isSuccess && (
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
              Saved
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-component ────────────────────────────────────────────────────────────

function PreferenceRow({
  title,
  description,
  checked,
  onCheckedChange,
  loading,
}: {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  loading: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={loading}
        className="mt-0.5 shrink-0"
      />
    </div>
  );
}
