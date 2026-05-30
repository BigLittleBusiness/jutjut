/**
 * Admin — Promo Code Management (enhanced)
 * - Create codes with percentage or fixed discount, expiry date, max uses, bonus credits
 * - Live discount preview showing savings on both credit packs
 * - Inline edit for expiry and max uses
 * - Status badges (Active / Expired / Exhausted / Inactive)
 * - Copy-to-clipboard for sharing codes
 * - Redemption detail drawer:
 *   - Date range filter with live financial summary recalculation
 *   - CSV export of filtered redemption list + summary
 *   - Redemption trend chart (daily counts over time)
 *   - Per-user redemption list with discount, bonus credits, charge token, date
 * - Admin-only access guard
 */

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import { toast } from "sonner";
import {
  Tag, Plus, ShieldAlert, Copy, Check, Pencil, X, Save,
  Percent, DollarSign, Gift, CalendarClock, Users, Sparkles,
  TrendingDown, Info, Eye, UserCircle, Clock, CreditCard,
  ChevronRight, ArrowLeft, Download, CalendarRange, Filter,
} from "lucide-react";
import type { DateRange } from "react-day-picker";

// ─── Credit pack reference prices (cents) ────────────────────────────────────
const PACKS = [
  { id: "pack_1", label: "1 Credit", priceCents: 1500 },
  { id: "pack_5", label: "5 Credits", priceCents: 5000 },
];

const AVG_PACK_CENTS = (1500 + 5000) / 2; // 3250

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcDiscount(priceCents: number, type: "percentage" | "fixed", value: number) {
  if (type === "percentage") {
    const saving = Math.round(priceCents * (Math.min(value, 100) / 100));
    return { saving, after: Math.max(0, priceCents - saving) };
  }
  const saving = Math.min(value * 100, priceCents);
  return { saving, after: Math.max(0, priceCents - saving) };
}

function formatAud(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function codeStatus(code: {
  isActive: boolean;
  expiresAt: Date | null;
  usedCount: number;
  maxUses: number | null;
}): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } {
  if (!code.isActive) return { label: "Inactive", variant: "secondary" };
  if (code.expiresAt && new Date(code.expiresAt) < new Date()) return { label: "Expired", variant: "destructive" };
  if (code.maxUses !== null && code.usedCount >= code.maxUses) return { label: "Exhausted", variant: "destructive" };
  return { label: "Active", variant: "default" };
}

function calcSavedCents(discountType: string, discountValue: number): number {
  if (discountType === "percentage") {
    return Math.round(AVG_PACK_CENTS * (Math.min(discountValue, 100) / 100));
  }
  return discountValue * 100;
}

function calcRevenueCents(discountType: string, discountValue: number): number {
  if (discountType === "percentage") {
    const saving = Math.round(AVG_PACK_CENTS * (Math.min(discountValue, 100) / 100));
    return Math.max(0, AVG_PACK_CENTS - saving);
  }
  const saving = Math.min(discountValue * 100, AVG_PACK_CENTS);
  return Math.max(0, AVG_PACK_CENTS - saving);
}

function formatDateShort(d: Date) {
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

// ─── Discount preview ─────────────────────────────────────────────────────────

function DiscountPreview({ type, value }: { type: "percentage" | "fixed"; value: number }) {
  if (!value || value <= 0) return null;
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Live Preview</p>
      {PACKS.map(pack => {
        const { saving, after } = calcDiscount(pack.priceCents, type, value);
        if (saving <= 0) return null;
        return (
          <div key={pack.id} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{pack.label}</span>
            <div className="flex items-center gap-2">
              <span className="line-through text-muted-foreground/60 text-xs">{formatAud(pack.priceCents)}</span>
              <span className="font-semibold text-green-600 dark:text-green-400">{formatAud(after)}</span>
              <Badge variant="outline" className="text-xs text-green-600 dark:text-green-400 border-green-200 dark:border-green-800">
                -{formatAud(saving)}
              </Badge>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Create code dialog ───────────────────────────────────────────────────────

type PromoCodeRow = {
  id: number;
  code: string;
  discountType: string;
  discountValue: number;
  bonusCredits: number;
  usedCount: number;
  maxUses: number | null;
  expiresAt: Date | null;
  isActive: boolean;
};

function CreateCodeDialog({ onClose }: { onClose: () => void }) {
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState(20);
  const [bonusCredits, setBonusCredits] = useState(0);
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const utils = trpc.useUtils();
  const create = trpc.admin.promoCodes.create.useMutation({
    onSuccess: () => {
      utils.admin.promoCodes.list.invalidate();
      toast.success(`Promo code "${code}" created.`);
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const minStr = new Date().toISOString().slice(0, 16);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return toast.error("Code is required.");
    create.mutate({
      code: code.trim().toUpperCase(),
      discountType,
      discountValue,
      bonusCredits: bonusCredits || 0,
      maxUses: maxUses ? parseInt(maxUses, 10) : null,
      expiresAt: expiresAt || null,
    });
  }

  return (
    <Dialog open onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="w-4 h-4" /> New Promo Code
          </DialogTitle>
          <DialogDescription>Create a discount code for employer credit purchases.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Code input */}
          <div className="space-y-1.5">
            <Label htmlFor="code">Code</Label>
            <Input
              id="code"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9\-_]/g, ""))}
              placeholder="e.g. LAUNCH20"
              className="font-mono tracking-widest uppercase"
              autoFocus
            />
          </div>

          {/* Discount type */}
          <div className="space-y-1.5">
            <Label>Discount Type</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["percentage", "fixed"] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setDiscountType(t);
                    setDiscountValue(t === "percentage" ? 20 : 5);
                  }}
                  className={`flex items-center gap-2 rounded-lg border p-3 text-sm font-medium transition-colors ${
                    discountType === t
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  {t === "percentage" ? <Percent className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />}
                  {t === "percentage" ? "Percentage" : "Fixed (AUD)"}
                </button>
              ))}
            </div>
          </div>

          {/* Discount value */}
          <div className="space-y-1.5">
            <Label htmlFor="discount-value">
              {discountType === "percentage" ? "Percentage Off" : "Amount Off (AUD)"}
            </Label>
            {discountType === "percentage" && (
              <div className="flex gap-1.5 mb-2 flex-wrap">
                {[10, 15, 20, 25, 50].map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setDiscountValue(v)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                      discountValue === v
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    {v}%
                  </button>
                ))}
              </div>
            )}
            <Input
              id="discount-value"
              type="number"
              min={discountType === "percentage" ? 1 : 0.01}
              max={discountType === "percentage" ? 100 : undefined}
              step={discountType === "percentage" ? 1 : 0.01}
              value={discountValue}
              onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)}
            />
          </div>

          <DiscountPreview type={discountType} value={discountValue} />

          {/* Bonus credits + max uses */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bonus-credits" className="flex items-center gap-1.5">
                <Gift className="w-3.5 h-3.5" /> Bonus Credits
              </Label>
              <Input
                id="bonus-credits"
                type="number"
                min={0}
                value={bonusCredits}
                onChange={e => setBonusCredits(parseInt(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="max-uses">Max Uses</Label>
              <Input
                id="max-uses"
                type="number"
                min={1}
                value={maxUses}
                onChange={e => setMaxUses(e.target.value)}
                placeholder="Unlimited"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expires-at" className="flex items-center gap-1.5">
                <CalendarClock className="w-3.5 h-3.5" />
                Expires At
              </Label>
              <Input
                id="expires-at"
                type="datetime-local"
                value={expiresAt}
                min={minStr}
                onChange={e => setExpiresAt(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={create.isPending} className="gap-2">
              {create.isPending ? (
                <span className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-current" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Create Code
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Redemption detail drawer ─────────────────────────────────────────────────

const trendChartConfig: ChartConfig = {
  redemptions: { label: "Redemptions", color: "hsl(var(--primary))" },
};

function RedemptionDrawer({
  code,
  onClose,
}: {
  code: PromoCodeRow;
  onClose: () => void;
}) {
  const { data: redemptions, isLoading } = trpc.admin.promoCodes.redemptions.useQuery(
    { promoCodeId: code.id },
    { enabled: true }
  );

  // ── Date range filter state ──────────────────────────────────────────────────
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [calOpen, setCalOpen] = useState(false);

  // ── Filtered redemptions ─────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!redemptions) return [];
    if (!dateRange?.from && !dateRange?.to) return redemptions;
    return redemptions.filter(r => {
      const d = new Date(r.redeemedAt);
      if (dateRange.from && d < dateRange.from) return false;
      if (dateRange.to) {
        const end = new Date(dateRange.to);
        end.setHours(23, 59, 59, 999);
        if (d > end) return false;
      }
      return true;
    });
  }, [redemptions, dateRange]);

  // ── Financial summary (computed from filtered set) ───────────────────────────
  const summary = useMemo(() => {
    const totalSavedCents = filtered.reduce((s, r) => s + calcSavedCents(r.discountType, r.discountValue), 0);
    const totalRevenueCents = filtered.reduce((s, r) => s + calcRevenueCents(r.discountType, r.discountValue), 0);
    const totalBonusCredits = filtered.reduce((s, r) => s + (r.bonusCreditsAwarded ?? 0), 0);
    return { totalSavedCents, totalRevenueCents, totalBonusCredits };
  }, [filtered]);

  // ── Trend chart data (daily redemption counts) ────────────────────────────────
  const trendData = useMemo(() => {
    if (!filtered.length) return [];
    const counts: Record<string, number> = {};
    filtered.forEach(r => {
      const day = new Date(r.redeemedAt).toLocaleDateString("en-CA"); // YYYY-MM-DD
      counts[day] = (counts[day] ?? 0) + 1;
    });
    return Object.entries(counts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({
        date,
        label: new Date(date).toLocaleDateString("en-AU", { day: "numeric", month: "short" }),
        redemptions: count,
      }));
  }, [filtered]);

  // ── CSV export ───────────────────────────────────────────────────────────────
  function handleExport() {
    if (!filtered.length) return;

    const rows: string[][] = [
      ["Code", "User Name", "User Email", "Discount Type", "Discount Value", "Bonus Credits", "Charge Token", "Redeemed At"],
    ];

    filtered.forEach(r => {
      rows.push([
        code.code,
        r.userName ?? "",
        r.userEmail ?? "",
        r.discountType,
        String(r.discountValue),
        String(r.bonusCreditsAwarded ?? 0),
        r.chargeToken ?? "",
        new Date(r.redeemedAt).toISOString(),
      ]);
    });

    // Append financial summary block
    rows.push([]);
    rows.push(["--- Financial Summary ---"]);
    if (dateRange?.from || dateRange?.to) {
      const from = dateRange.from ? formatDateShort(dateRange.from) : "start";
      const to = dateRange.to ? formatDateShort(dateRange.to) : "now";
      rows.push([`Period: ${from} – ${to}`]);
    } else {
      rows.push(["Period: All time"]);
    }
    rows.push(["Total Redemptions", String(filtered.length)]);
    rows.push(["Est. Total Saved by Employers (AUD)", formatAud(summary.totalSavedCents)]);
    rows.push(["Est. Revenue Generated (AUD)", formatAud(summary.totalRevenueCents)]);
    rows.push(["Bonus Credits Issued", String(summary.totalBonusCredits)]);

    const csv = rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const suffix = dateRange?.from
      ? `_${new Date(dateRange.from).toLocaleDateString("en-CA")}`
      : "_all";
    a.download = `${code.code}_redemptions${suffix}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded.");
  }

  const discountLabel = code.discountType === "percentage"
    ? `${code.discountValue}% off`
    : `$${code.discountValue} AUD off`;

  const status = codeStatus(code);

  const isFiltered = !!(dateRange?.from || dateRange?.to);
  const filterLabel = isFiltered
    ? `${dateRange?.from ? formatDateShort(dateRange.from) : "start"} – ${dateRange?.to ? formatDateShort(dateRange.to) : "now"}`
    : null;

  return (
    <Dialog open onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 pt-5 pb-4">
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors shrink-0"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono tracking-widest text-lg font-bold">{code.code}</span>
              <Badge variant={status.variant} className="text-xs">{status.label}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {discountLabel}
              {code.bonusCredits > 0 && ` · +${code.bonusCredits} bonus credit${code.bonusCredits !== 1 ? "s" : ""}`}
              {" · "}
              {code.usedCount} of {code.maxUses ?? "∞"} uses
            </p>
          </div>
          {/* Export button */}
          {!isLoading && filtered.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 shrink-0"
              onClick={handleExport}
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </Button>
          )}
        </div>

        <Separator />

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto min-h-0 px-6">

          {/* Date range filter bar */}
          {!isLoading && redemptions && redemptions.length > 0 && (
            <div className="flex items-center gap-2 py-3">
              <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground font-medium">Filter period:</span>
              <Popover open={calOpen} onOpenChange={setCalOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`gap-1.5 text-xs h-7 ${isFiltered ? "border-primary text-primary" : ""}`}
                  >
                    <CalendarRange className="w-3.5 h-3.5" />
                    {filterLabel ?? "All time"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                    disabled={{ after: new Date() }}
                  />
                  {isFiltered && (
                    <div className="border-t p-2 flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7 gap-1"
                        onClick={() => { setDateRange(undefined); setCalOpen(false); }}
                      >
                        <X className="w-3 h-3" /> Clear filter
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
              {isFiltered && (
                <span className="text-xs text-muted-foreground">
                  {filtered.length} of {redemptions.length} redemptions
                </span>
              )}
            </div>
          )}

          {/* Financial summary banner */}
          {!isLoading && filtered.length > 0 && (
            <div className="grid grid-cols-3 gap-3 pb-3">
              <div className="rounded-xl border border-border bg-green-50 dark:bg-green-950/30 p-3 text-center">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Total Saved by Employers</p>
                <p className="text-xl font-bold text-green-600 dark:text-green-400">
                  {formatAud(summary.totalSavedCents)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  est. across {filtered.length} use{filtered.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-primary/5 p-3 text-center">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Est. Revenue Generated</p>
                <p className="text-xl font-bold text-foreground">
                  {formatAud(summary.totalRevenueCents)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">after discount, excl. GST</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/40 p-3 text-center">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Bonus Credits Issued</p>
                <p className="text-xl font-bold text-foreground">{summary.totalBonusCredits}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  credit{summary.totalBonusCredits !== 1 ? "s" : ""} awarded
                </p>
              </div>
            </div>
          )}

          {/* Redemption trend chart */}
          {!isLoading && trendData.length >= 2 && (
            <div className="rounded-xl border border-border bg-card p-4 mb-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <TrendingDown className="w-3.5 h-3.5 rotate-180" />
                Redemption Trend
                {isFiltered && <span className="font-normal normal-case">(filtered period)</span>}
              </p>
              <ChartContainer config={trendChartConfig} className="h-[140px] w-full">
                <AreaChart data={trendData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="redemptionGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    width={28}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => [`${value} redemption${Number(value) !== 1 ? "s" : ""}`, ""]}
                      />
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="redemptions"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#redemptionGradient)"
                    dot={{ r: 3, fill: "hsl(var(--primary))", strokeWidth: 0 }}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ChartContainer>
            </div>
          )}

          {/* Redemption list */}
          {isLoading ? (
            <div className="space-y-3 py-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-muted" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 bg-muted rounded w-40" />
                    <div className="h-3 bg-muted rounded w-24" />
                  </div>
                  <div className="h-3 bg-muted rounded w-28" />
                </div>
              ))}
            </div>
          ) : !redemptions || redemptions.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No redemptions yet.</p>
              <p className="text-sm mt-1">
                Redemptions will appear here as employers use this code at checkout.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CalendarRange className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No redemptions in this period.</p>
              <p className="text-sm mt-1">Try adjusting the date range filter.</p>
            </div>
          ) : (
            <div className="pb-2 space-y-1">
              {/* Column headers */}
              <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b border-border">
                <span>User</span>
                <span className="text-right">Discount Applied</span>
                <span className="text-right w-40">Redeemed</span>
              </div>

              {filtered.map((r) => {
                const displayName = r.userName || r.userEmail || `User #${r.redeemedByUserId ?? r.redeemedByEmployerId ?? "?"}`;
                const discApplied = r.discountType === "percentage"
                  ? `${r.discountValue}% off`
                  : `$${r.discountValue} AUD off`;
                const redeemedDate = new Date(r.redeemedAt);

                return (
                  <div
                    key={r.id}
                    className="grid grid-cols-[1fr_auto_auto] gap-3 items-center px-3 py-3 rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    {/* User info */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <UserCircle className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{displayName}</p>
                        {r.userEmail && r.userName && (
                          <p className="text-xs text-muted-foreground truncate">{r.userEmail}</p>
                        )}
                        {r.chargeToken && (
                          <p className="text-xs text-muted-foreground/60 font-mono truncate" title={r.chargeToken}>
                            <CreditCard className="w-2.5 h-2.5 inline mr-1" />
                            {r.chargeToken.slice(0, 16)}…
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Discount applied */}
                    <div className="text-right shrink-0">
                      <span className="text-sm font-medium text-green-600 dark:text-green-400">{discApplied}</span>
                      {r.bonusCreditsAwarded > 0 && (
                        <p className="text-xs text-muted-foreground">
                          <Gift className="w-2.5 h-2.5 inline mr-0.5" />
                          +{r.bonusCreditsAwarded} bonus
                        </p>
                      )}
                    </div>

                    {/* Date */}
                    <div className="text-right w-40 shrink-0">
                      <p className="text-sm text-muted-foreground">
                        {redeemedDate.toLocaleDateString("en-AU", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground/60">
                        <Clock className="w-2.5 h-2.5 inline mr-0.5" />
                        {redeemedDate.toLocaleTimeString("en-AU", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer summary */}
        {redemptions && redemptions.length > 0 && (
          <>
            <Separator />
            <div className="flex items-center justify-between text-sm text-muted-foreground px-6 py-3">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                {isFiltered
                  ? `${filtered.length} of ${redemptions.length} redemption${redemptions.length !== 1 ? "s" : ""} shown`
                  : `${redemptions.length} total redemption${redemptions.length !== 1 ? "s" : ""}`
                }
              </span>
              {filtered.length > 0 && (
                <span className="text-xs">
                  Most recent:{" "}
                  {new Date(filtered[0].redeemedAt).toLocaleDateString("en-AU", {
                    day: "numeric", month: "short", year: "numeric",
                  })}
                </span>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Editable row ─────────────────────────────────────────────────────────────

function EditableRow({
  code,
  onUpdate,
  onViewDetail,
}: {
  code: PromoCodeRow;
  onUpdate: (id: number, patch: { isActive?: boolean; maxUses?: number | null; expiresAt?: string | null }) => void;
  onViewDetail: (code: PromoCodeRow) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editMaxUses, setEditMaxUses] = useState(code.maxUses?.toString() ?? "");
  const [editExpiry, setEditExpiry] = useState(() => {
    if (!code.expiresAt) return "";
    const d = new Date(code.expiresAt);
    return d.toISOString().slice(0, 16);
  });
  const [copied, setCopied] = useState(false);

  const status = codeStatus(code);

  function handleCopy() {
    navigator.clipboard.writeText(code.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function handleSave() {
    onUpdate(code.id, {
      maxUses: editMaxUses ? parseInt(editMaxUses, 10) : null,
      expiresAt: editExpiry || null,
    });
    setEditing(false);
  }

  return (
    <tr className="group border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
      {/* Code */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-semibold tracking-widest">{code.code}</span>
          <button
            onClick={handleCopy}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
            title="Copy code"
          >
            {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
          </button>
        </div>
      </td>

      {/* Discount */}
      <td className="px-4 py-3 text-sm">
        {code.discountType === "percentage" ? (
          <span className="flex items-center gap-1">
            <Percent className="w-3 h-3 text-muted-foreground" />
            {code.discountValue}% off
          </span>
        ) : (
          <span className="flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-muted-foreground" />
            ${code.discountValue} AUD off
          </span>
        )}
        {code.bonusCredits > 0 && (
          <p className="text-xs text-muted-foreground flex items-center gap-0.5 mt-0.5">
            <Gift className="w-2.5 h-2.5" />+{code.bonusCredits} bonus
          </p>
        )}
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Badge variant={status.variant} className="text-xs">{status.label}</Badge>
          <Switch
            checked={code.isActive}
            onCheckedChange={v => onUpdate(code.id, { isActive: v })}
            className="scale-75"
          />
        </div>
      </td>

      {/* Uses */}
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {editing ? (
          <Input
            type="number"
            min={1}
            value={editMaxUses}
            onChange={e => setEditMaxUses(e.target.value)}
            placeholder="∞"
            className="h-7 w-20 text-xs"
          />
        ) : (
          <button
            className="flex items-center gap-1 hover:text-foreground transition-colors"
            onClick={() => onViewDetail(code)}
            title="View redemptions"
          >
            {code.usedCount} / {code.maxUses ?? "∞"}
            <Eye className="w-3 h-3 opacity-0 group-hover:opacity-60" />
          </button>
        )}
      </td>

      {/* Expiry */}
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {editing ? (
          <Input
            type="datetime-local"
            value={editExpiry}
            onChange={e => setEditExpiry(e.target.value)}
            className="h-7 text-xs w-44"
          />
        ) : (
          code.expiresAt
            ? new Date(code.expiresAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })
            : <span className="text-muted-foreground/50">No expiry</span>
        )}
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 justify-end">
          {editing ? (
            <>
              <Button size="sm" variant="ghost" className="h-7 px-2 gap-1 text-xs" onClick={handleSave}>
                <Save className="w-3 h-3" /> Save
              </Button>
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditing(false)}>
                <X className="w-3 h-3" />
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => setEditing(true)}
                title="Edit"
              >
                <Pencil className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 gap-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onViewDetail(code)}
                title="View redemptions"
              >
                <ChevronRight className="w-3 h-3" />
              </Button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminPromoCodes() {
  const { user, loading } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [detailCode, setDetailCode] = useState<PromoCodeRow | null>(null);
  const [activeTab, setActiveTab] = useState<"live" | "inactive">("live");

  const { data: codes, isLoading } = trpc.admin.promoCodes.list.useQuery();
  const utils = trpc.useUtils();

  const update = trpc.admin.promoCodes.update.useMutation({
    onSuccess: () => utils.admin.promoCodes.list.invalidate(),
    onError: (e) => toast.error(e.message),
  });

  function handleUpdate(id: number, patch: { isActive?: boolean; maxUses?: number | null; expiresAt?: string | null }) {
    update.mutate({ id, ...patch });
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-4">
        <ShieldAlert className="w-12 h-12 text-destructive" />
        <h1 className="text-xl font-bold">Admin Access Required</h1>
        <p className="text-muted-foreground">This page is restricted to administrators.</p>
      </div>
    );
  }

  const liveCodes = codes?.filter(c => codeStatus(c).label === "Active") ?? [];
  const inactiveCodes = codes?.filter(c => codeStatus(c).label !== "Active") ?? [];
  const totalRedemptions = codes?.reduce((s, c) => s + c.usedCount, 0) ?? 0;

  const displayed = activeTab === "live" ? liveCodes : inactiveCodes;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Tag className="w-6 h-6 text-primary" />
              Promo Codes
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage discount codes for employer credit purchases.
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="gap-2">
            <Plus className="w-4 h-4" /> New Code
          </Button>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Codes", value: codes?.length ?? 0, icon: Tag },
            { label: "Live Codes", value: liveCodes.length, icon: Sparkles },
            { label: "Total Redemptions", value: totalRedemptions, icon: Users },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label}>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="w-4.5 h-4.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 border-b border-border">
          {(["live", "inactive"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "live" ? `Live (${liveCodes.length})` : `Inactive / Expired (${inactiveCodes.length})`}
            </button>
          ))}
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <span className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : displayed.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Info className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="font-medium">No {activeTab === "live" ? "active" : "inactive"} codes.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      {["Code", "Discount", "Status", "Uses", "Expires", ""].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {displayed.map(code => (
                      <EditableRow
                        key={code.id}
                        code={code}
                        onUpdate={handleUpdate}
                        onViewDetail={setDetailCode}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {showCreate && <CreateCodeDialog onClose={() => setShowCreate(false)} />}
      {detailCode && <RedemptionDrawer code={detailCode} onClose={() => setDetailCode(null)} />}
    </div>
  );
}
