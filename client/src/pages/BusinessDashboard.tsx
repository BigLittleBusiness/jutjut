/**
 * Business Dashboard — Drop Retailer Analytics
 *
 * Provides Drop retailers with:
 * - Summary table of all their drops (impressions, claims, claim rate, cost-per-claim)
 * - Expandable detail panel per drop with:
 *   - KPI cards (impressions, claims, claim rate, cost/impression, cost/claim)
 *   - Claims over time (line chart)
 *   - Breakdown by school (bar chart)
 *   - Breakdown by year level (bar chart)
 *   - Breakdown by postcode (table)
 */

import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  BarChart2, ChevronDown, ChevronRight, Eye, TrendingUp, DollarSign, Percent,
  School, MapPin, GraduationCap, Calendar, Plus, Clock, CheckCircle2, XCircle,
  Package, Send, AlertCircle, Upload, X, Image as ImageIcon, Building2, Trash2
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid
} from "recharts";

// ─── Drop Analytics Detail Panel ─────────────────────────────────────────────

// ─── Business Logo Tab ─────────────────────────────────────────────────────────

const MAX_LOGO_BYTES = 500 * 1024; // 500 KB

function BusinessLogoTab() {
  const utils = trpc.useUtils();
  const { data: profile, isLoading } = trpc.business.profile.get.useQuery();
  const saveLogo = trpc.business.profile.saveLogo.useMutation({
    onSuccess: () => {
      toast.success("Logo saved successfully.");
      utils.business.profile.get.invalidate();
    },
    onError: (err) => toast.error(err.message ?? "Failed to save logo."),
  });
  const removeLogo = trpc.business.profile.removeLogo.useMutation({
    onSuccess: () => {
      toast.success("Logo removed.");
      utils.business.profile.get.invalidate();
      setPreview(null);
    },
    onError: (err) => toast.error(err.message ?? "Failed to remove logo."),
  });

  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file (JPEG, PNG, WebP, GIF, or SVG).");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast.error(`Logo must be 500 KB or smaller. Your file is ${(file.size / 1024).toFixed(0)} KB.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("logo", file);
      const resp = await fetch("/api/upload/business-logo", { method: "POST", body: formData });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error((err as any).error ?? "Upload failed.");
      }
      const { url } = await resp.json() as { url: string };
      saveLogo.mutate({ logoUrl: url });
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed.");
      setPreview(null);
    } finally {
      setUploading(false);
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  const currentLogo = preview ?? profile?.logoUrl ?? null;
  const busy = uploading || saveLogo.isPending || removeLogo.isPending;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded-xl" />)}
      </div>
    );
  }

  return (
    <Card className="border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="w-4 h-4" />
          Business Logo
        </CardTitle>
        <CardDescription>
          Upload your logo to co-brand the student redemption page. Max 500 KB — JPEG, PNG, WebP, GIF, or SVG.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {currentLogo ? (
          <div className="flex items-start gap-4">
            <div className="w-28 h-28 rounded-xl border-2 border-border bg-muted flex items-center justify-center overflow-hidden shrink-0">
              <img src={currentLogo} alt="Business logo" className="w-full h-full object-contain p-2" />
            </div>
            <div className="flex flex-col gap-2 justify-center">
              <p className="text-sm font-medium">Current logo</p>
              <p className="text-xs text-muted-foreground">This logo appears on the student QR redemption page alongside the JutJut branding.</p>
              <div className="flex gap-2 mt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={busy}
                  className="gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" /> Replace
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeLogo.mutate()}
                  disabled={busy}
                  className="gap-1.5 text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center gap-3 w-full h-44 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary hover:bg-primary/5"
            }`}
          >
            {uploading ? (
              <>
                <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                <p className="text-sm text-muted-foreground">Uploading…</p>
              </>
            ) : (
              <>
                <ImageIcon className="w-10 h-10 text-muted-foreground/50" />
                <div className="text-center">
                  <p className="text-sm font-medium">Click or drag &amp; drop your logo</p>
                  <p className="text-xs text-muted-foreground mt-1">JPEG, PNG, WebP, GIF, SVG · max 500 KB</p>
                </div>
              </>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
          className="hidden"
          onChange={onFileChange}
        />

        <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-4 flex gap-3">
          <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-300">
            <p className="font-medium">How your logo is used</p>
            <p className="mt-0.5">When a student scans a QR code for your drop, the redemption page shown to staff will display your logo alongside the JutJut branding, creating a co-branded experience.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


function DropAnalyticsDetailPanel({ dropId, onClose }: { dropId: number; onClose: () => void }) {
  const { data, isLoading } = trpc.business.drops.analytics.useQuery({ dropId });

  if (isLoading) {
    return (
      <div className="p-5 space-y-3 border border-border rounded-xl bg-card/50">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-5 bg-muted animate-pulse rounded" />)}
      </div>
    );
  }
  if (!data) return null;

  const { drop, metrics, breakdowns } = data;

  const kpis = [
    { label: "Impressions", value: drop.impressions.toLocaleString(), icon: <Eye className="w-3.5 h-3.5" /> },
    { label: "Claims", value: drop.claims.toLocaleString(), icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { label: "Claim Rate", value: `${metrics.claim_rate}%`, icon: <Percent className="w-3.5 h-3.5" /> },
    { label: "Cost / Impression", value: `$${metrics.cost_per_impression.toFixed(2)}`, icon: <DollarSign className="w-3.5 h-3.5" /> },
    { label: "Cost / Claim", value: `$${metrics.cost_per_claim.toFixed(2)}`, icon: <DollarSign className="w-3.5 h-3.5" /> },
    { label: "Spend", value: `$${(drop.sponsorship_fee / 100).toFixed(2)}`, icon: <DollarSign className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="border border-primary/30 rounded-xl bg-primary/5 p-5 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-bold text-base">{drop.offer_title}</h3>
          {drop.scheduled_date && (
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Scheduled {new Date(drop.scheduled_date).toLocaleDateString("en-AU")}
            </p>
          )}
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1">
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {kpis.map(kpi => (
          <div key={kpi.label} className="bg-background rounded-lg p-3 border border-border">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              {kpi.icon}
              <span className="text-xs">{kpi.label}</span>
            </div>
            <p className="text-xl font-bold tabular-nums">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Charts row: claims over time + school breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {breakdowns.claims_over_time.length > 0 && (
          <div>
            <p className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Claims Over Time</p>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart
                data={breakdowns.claims_over_time.map(p => ({
                  label: `${p.date.slice(5)} ${String(p.hour).padStart(2, "0")}:00`,
                  count: p.count,
                }))}
                margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ fontSize: 11, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                  formatter={(v: number) => [v, "Claims"]}
                />
                <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {breakdowns.by_school.length > 0 && (
          <div>
            <p className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <School className="w-3 h-3" /> By School
            </p>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={breakdowns.by_school.slice(0, 6)} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis type="category" dataKey="school_name" tick={{ fontSize: 9 }} width={90} />
                <Tooltip
                  contentStyle={{ fontSize: 11, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                  formatter={(v: number) => [v, "Claims"]}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Year level + postcode row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {breakdowns.by_year_level.length > 0 && (
          <div>
            <p className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <GraduationCap className="w-3 h-3" /> By Year Level
            </p>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={breakdowns.by_year_level} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis type="category" dataKey="year" tick={{ fontSize: 9 }} width={80} />
                <Tooltip
                  contentStyle={{ fontSize: 11, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                  formatter={(v: number) => [v, "Claims"]}
                />
                <Bar dataKey="count" fill="hsl(var(--chart-2, var(--primary)))" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {breakdowns.by_postcode.length > 0 && (
          <div>
            <p className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <MapPin className="w-3 h-3" /> By Postcode
            </p>
            <div className="space-y-1 max-h-[140px] overflow-y-auto pr-1">
              {breakdowns.by_postcode.slice(0, 10).map(p => (
                <div key={p.postcode} className="flex items-center justify-between text-xs">
                  <span className="font-mono text-muted-foreground">{p.postcode}</span>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 bg-primary/60 rounded-full"
                      style={{ width: `${Math.max(20, (p.count / breakdowns.by_postcode[0].count) * 80)}px` }}
                    />
                    <span className="tabular-nums w-6 text-right">{p.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

// ─── Submit Drop Form ──────────────────────────────────────────────────────────

function SubmitDropForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    maxClaims: "",
    scheduledDate: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const submit = trpc.business.drops.submit.useMutation({
    onSuccess: () => {
      toast.success("Drop submitted for review! JutJut will be in touch shortly.");
      setForm({ title: "", description: "", maxClaims: "", scheduledDate: "" });
      setImageFile(null);
      setImagePreview(null);
      onSuccess();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      toast.error("Only JPEG, PNG, WebP, and GIF images are accepted.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2 MB.");
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Offer title is required.");
      return;
    }

    let imageUrl: string | undefined;
    let imageKey: string | undefined;

    // Upload image first if one was selected
    if (imageFile) {
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append("image", imageFile);
        const res = await fetch("/api/upload/drop-image", {
          method: "POST",
          body: fd,
          credentials: "include",
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Upload failed" }));
          throw new Error(err.error ?? "Upload failed");
        }
        const data = await res.json();
        imageUrl = data.url;
        imageKey = data.key;
      } catch (err: any) {
        toast.error(err.message ?? "Image upload failed.");
        setUploading(false);
        return;
      } finally {
        setUploading(false);
      }
    }

    submit.mutate({
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      maxClaims: form.maxClaims ? parseInt(form.maxClaims, 10) : undefined,
      scheduledDate: form.scheduledDate ? new Date(form.scheduledDate) : undefined,
      imageUrl,
      imageKey,
    });
  };

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="w-5 h-5 text-primary" />
          Submit a Drop
        </CardTitle>
        <CardDescription>
          Tell us about your offer. Once submitted, the JutJut team will review it, set the sponsorship fee, and schedule it for your target student audience.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="drop-title">Offer title <span className="text-destructive">*</span></Label>
            <Input
              id="drop-title"
              placeholder="e.g. 20% off your first order at Sunrise Café"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="drop-desc">Description</Label>
            <Textarea
              id="drop-desc"
              placeholder="Describe the offer, any conditions, how students redeem it, expiry date, etc."
              rows={4}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="drop-max">Maximum claims <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                id="drop-max"
                type="number"
                min={1}
                placeholder="e.g. 500"
                value={form.maxClaims}
                onChange={(e) => setForm((f) => ({ ...f, maxClaims: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">Leave blank for unlimited claims.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="drop-date">Preferred drop date <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                id="drop-date"
                type="date"
                value={form.scheduledDate}
                onChange={(e) => setForm((f) => ({ ...f, scheduledDate: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">Subject to JutJut scheduling availability.</p>
            </div>
          </div>

          {/* Promotional Image Upload */}
          <div className="space-y-1.5">
            <Label>Promotional image <span className="text-muted-foreground text-xs">(optional)</span></Label>
            {imagePreview ? (
              <div className="relative w-full max-w-xs">
                <img
                  src={imagePreview}
                  alt="Drop preview"
                  className="w-full h-40 object-cover rounded-lg border-2 border-border"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 bg-background/90 border border-border rounded-full p-1 hover:bg-destructive hover:text-destructive-foreground transition-colors"
                  aria-label="Remove image"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <p className="text-xs text-muted-foreground mt-1">{imageFile?.name} ({((imageFile?.size ?? 0) / 1024).toFixed(0)} KB)</p>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 w-full max-w-xs h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <ImageIcon className="w-7 h-7 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Click to upload image</p>
                <p className="text-xs text-muted-foreground">JPEG, PNG, WebP, GIF · max 2 MB</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleImageChange}
            />
          </div>

          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4 flex gap-3">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800 dark:text-amber-300">
              <p className="font-medium">What happens next?</p>
              <p className="mt-0.5">After you submit, the JutJut team will review your Drop, confirm the sponsorship fee, and contact you before scheduling. You can track the status in the <strong>My Drops</strong> tab.</p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={submit.isPending || uploading} className="gap-2">
              {uploading ? (
                <><Upload className="w-4 h-4 animate-bounce" /> Uploading image...</>
              ) : submit.isPending ? (
                <><Send className="w-4 h-4" /> Submitting...</>
              ) : (
                <><Send className="w-4 h-4" /> Submit Drop for Review</>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── My Drops Tab ────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  draft: { label: "Pending Review", icon: <Clock className="w-3.5 h-3.5" />, variant: "secondary" as const },
  active: { label: "Active", icon: <CheckCircle2 className="w-3.5 h-3.5" />, variant: "default" as const },
  expired: { label: "Expired", icon: <XCircle className="w-3.5 h-3.5" />, variant: "outline" as const },
};

function MyDropsTab() {
  const { data: drops, isLoading } = trpc.business.drops.list.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />)}
      </div>
    );
  }

  if (!drops || drops.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="font-medium">No drops yet</p>
        <p className="text-sm mt-1">Submit your first Drop using the Submit tab above.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {drops.map((drop) => {
        const cfg = STATUS_CONFIG[drop.status] ?? STATUS_CONFIG.draft;
        return (
          <Card key={drop.id} className="border">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-sm truncate">{drop.title}</h3>
                    <Badge variant={cfg.variant} className="flex items-center gap-1 text-xs">
                      {cfg.icon}
                      {cfg.label}
                    </Badge>
                  </div>
                  {drop.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{drop.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {drop.impressions.toLocaleString()} views
                    </span>
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      {drop.claimCount.toLocaleString()} claims
                    </span>
                    {drop.maxClaims && (
                      <span className="flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        {drop.maxClaims.toLocaleString()} max
                      </span>
                    )}
                    {drop.scheduledDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(drop.scheduledDate).toLocaleDateString("en-AU")}
                      </span>
                    )}
                  </div>
                </div>
                {drop.sponsorshipFee > 0 && (
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">Sponsorship</p>
                    <p className="font-bold text-sm">${(drop.sponsorshipFee / 100).toFixed(2)}</p>
                  </div>
                )}
              </div>
              {drop.status === "draft" && (
                <div className="mt-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  Awaiting JutJut review. We’ll contact you to confirm the sponsorship fee before scheduling.
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ─── Analytics Tab ──────────────────────────────────────────────────────────────────

function AnalyticsTab() {
  const [selectedDropId, setSelectedDropId] = useState<number | null>(null);
  const { data: summary, isLoading } = trpc.business.drops.analyticsSummary.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => <div key={i} className="h-8 bg-muted animate-pulse rounded" />)}
      </div>
    );
  }

  if (!summary || summary.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="font-medium">No analytics yet</p>
        <p className="text-sm mt-1">Analytics will appear once your first Drop goes live.</p>
      </div>
    );
  }

  // Aggregate KPIs across all drops
  const totalImpressions = summary.reduce((s, d) => s + d.impressions, 0);
  const totalClaims = summary.reduce((s, d) => s + d.claims, 0);
  const overallClaimRate = totalImpressions > 0
    ? ((totalClaims / totalImpressions) * 100).toFixed(1)
    : "0.0";
  const totalSpend = summary.reduce((s, d) => s + (d.sponsorshipFeeDollars ?? 0), 0);

  // Chart data — one bar group per drop (truncate title for readability)
  const chartData = summary.map(d => ({
    name: d.title.length > 18 ? d.title.slice(0, 16) + "…" : d.title,
    Impressions: d.impressions,
    Claims: d.claims,
  }));

  return (
    <div className="space-y-5">
      {/* KPI summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Impressions", value: totalImpressions.toLocaleString(), icon: <Eye className="w-4 h-4" /> },
          { label: "Total Claims", value: totalClaims.toLocaleString(), icon: <TrendingUp className="w-4 h-4" /> },
          { label: "Overall Claim Rate", value: `${overallClaimRate}%`, icon: <Percent className="w-4 h-4" /> },
          { label: "Total Spend", value: totalSpend > 0 ? `$${totalSpend.toFixed(2)}` : "—", icon: <DollarSign className="w-4 h-4" /> },
        ].map(kpi => (
          <Card key={kpi.label} className="border">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                {kpi.icon}
                <span className="text-xs">{kpi.label}</span>
              </div>
              <p className="text-xl font-bold tabular-nums">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Impressions vs Claims bar chart */}
      {chartData.length > 0 && (
        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Impressions vs Claims by Drop</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: -10, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="Impressions" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Claims" fill="hsl(var(--primary) / 0.4)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Per-drop table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="text-left py-2 pr-4 font-medium">Offer</th>
              <th className="text-right py-2 px-3 font-medium">Impressions</th>
              <th className="text-right py-2 px-3 font-medium">Claims</th>
              <th className="text-right py-2 px-3 font-medium">Claim Rate</th>
              <th className="text-right py-2 px-3 font-medium">Cost/Claim</th>
              <th className="text-right py-2 px-3 font-medium">Status</th>
              <th className="text-right py-2 pl-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {summary.map(d => {
              const isExpanded = selectedDropId === d.id;
              return (
                <tr
                  key={d.id}
                  className={`border-b border-border/50 cursor-pointer transition-colors ${
                    isExpanded ? "bg-primary/5" : "hover:bg-muted/30"
                  }`}
                  onClick={() => setSelectedDropId(isExpanded ? null : d.id)}
                >
                  <td className="py-2.5 pr-4 font-medium">
                    <span className="flex items-center gap-1.5">
                      {isExpanded
                        ? <ChevronDown className="w-3.5 h-3.5 text-primary shrink-0" />
                        : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      }
                      {d.title}
                    </span>
                  </td>
                  <td className="text-right py-2.5 px-3 tabular-nums">{d.impressions.toLocaleString()}</td>
                  <td className="text-right py-2.5 px-3 tabular-nums">{d.claims.toLocaleString()}</td>
                  <td className="text-right py-2.5 px-3 tabular-nums">{d.claimRate}%</td>
                  <td className="text-right py-2.5 px-3 tabular-nums">
                    {d.costPerClaim > 0 ? `$${d.costPerClaim.toFixed(2)}` : "—"}
                  </td>
                  <td className="text-right py-2.5 px-3">
                    <Badge variant={d.status === "active" ? "default" : "secondary"}>
                      {d.status}
                    </Badge>
                  </td>
                  <td className="text-right py-2.5 pl-3 text-muted-foreground">
                    {d.scheduledDate
                      ? new Date(d.scheduledDate).toLocaleDateString("en-AU")
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {selectedDropId !== null && (
        <DropAnalyticsDetailPanel
          dropId={selectedDropId}
          onClose={() => setSelectedDropId(null)}
        />
      )}
    </div>
  );
}

// ─── Main BusinessDashboard ────────────────────────────────────────────────────────────

type DashTab = "submit" | "my-drops" | "analytics" | "branding";

export default function BusinessDashboard() {
  const { isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<DashTab>("submit");

  if (loading) {
    return (
      <div className="container mx-auto py-12 text-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto py-12 text-center">
        <p className="mb-4 text-muted-foreground">Sign in to access the Business Dashboard.</p>
        <Button asChild>
          <a href={getLoginUrl()}>Sign In</a>
        </Button>
      </div>
    );
  }

  const tabs: { id: DashTab; label: string; icon: React.ReactNode }[] = [
    { id: "submit", label: "Submit a Drop", icon: <Send className="w-4 h-4" /> },
    { id: "my-drops", label: "My Drops", icon: <Package className="w-4 h-4" /> },
    { id: "analytics", label: "Analytics", icon: <BarChart2 className="w-4 h-4" /> },
    { id: "branding", label: "Branding", icon: <Building2 className="w-4 h-4" /> },
  ];

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Business Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Submit and manage your JutJut Drop offers.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "submit" && (
        <SubmitDropForm onSuccess={() => setActiveTab("my-drops")} />
      )}
      {activeTab === "my-drops" && <MyDropsTab />}
      {activeTab === "analytics" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart2 className="w-4 h-4" />
              Drop Performance
            </CardTitle>
            <CardDescription>Click any row to expand detailed analytics and breakdowns.</CardDescription>
          </CardHeader>
          <CardContent>
            <AnalyticsTab />
          </CardContent>
        </Card>
      )}
      {activeTab === "branding" && <BusinessLogoTab />}
    </div>
  );
}
