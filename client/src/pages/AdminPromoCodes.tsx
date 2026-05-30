/**
 * Admin — Promo Code Management (enhanced)
 * - Create codes with percentage or fixed discount, expiry date, max uses, bonus credits
 * - Live discount preview showing savings on both credit packs
 * - Inline edit for expiry and max uses
 * - Status badges (Active / Expired / Exhausted / Inactive)
 * - Copy-to-clipboard for sharing codes
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
import { toast } from "sonner";
import {
  Tag, Plus, ShieldAlert, Copy, Check, Pencil, X, Save,
  Percent, DollarSign, Gift, CalendarClock, Users, Sparkles,
  TrendingDown, Info,
} from "lucide-react";

// ─── Credit pack reference prices (cents) ────────────────────────────────────
const PACKS = [
  { id: "pack_1", label: "1 Credit", priceCents: 1500 },
  { id: "pack_5", label: "5 Credits", priceCents: 5000 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcDiscount(priceCents: number, type: "percentage" | "fixed", value: number) {
  if (type === "percentage") {
    const saving = Math.round(priceCents * (Math.min(value, 100) / 100));
    return { saving, after: Math.max(0, priceCents - saving) };
  }
  const saving = Math.min(value * 100, priceCents); // value is in AUD
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

// ─── Live discount preview panel ─────────────────────────────────────────────

function DiscountPreview({
  discountType,
  discountValue,
  bonusCredits,
}: {
  discountType: "percentage" | "fixed";
  discountValue: number;
  bonusCredits: number;
}) {
  const hasDiscount = discountValue > 0;
  const hasBonus = bonusCredits > 0;

  if (!hasDiscount && !hasBonus) return null;

  return (
    <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4 space-y-3">
      <p className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5" />
        Live Preview — what employers will see
      </p>
      <div className="space-y-2">
        {PACKS.map(pack => {
          const { saving, after } = calcDiscount(pack.priceCents, discountType, discountValue);
          return (
            <div key={pack.id} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{pack.label}</span>
              <div className="flex items-center gap-2">
                {saving > 0 && (
                  <span className="line-through text-muted-foreground text-xs">
                    {formatAud(pack.priceCents)}
                  </span>
                )}
                <span className="font-semibold text-foreground">{formatAud(after)}</span>
                {saving > 0 && (
                  <Badge variant="secondary" className="text-xs text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30">
                    save {formatAud(saving)}
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {hasBonus && (
        <div className="flex items-center gap-2 text-sm pt-1 border-t border-primary/20">
          <Gift className="w-3.5 h-3.5 text-primary" />
          <span className="text-foreground">
            +{bonusCredits} bonus credit{bonusCredits !== 1 ? "s" : ""} added on redemption
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Create promo code modal ──────────────────────────────────────────────────

const EMPTY_FORM = {
  code: "",
  discountType: "percentage" as "fixed" | "percentage",
  discountValue: 20,
  bonusCredits: 0,
  maxUses: "" as string | number,
  expiresAt: "",
};

function CreatePromoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [codeError, setCodeError] = useState("");

  const utils = trpc.useUtils();

  const create = trpc.admin.promoCodes.create.useMutation({
    onSuccess: () => {
      toast.success(`Promo code "${form.code}" created successfully.`);
      utils.admin.promoCodes.list.invalidate();
      onClose();
      setForm(EMPTY_FORM);
      setCodeError("");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleCodeChange = (raw: string) => {
    const val = raw.toUpperCase().replace(/[^A-Z0-9_-]/g, "");
    setForm(f => ({ ...f, code: val }));
    if (val.length > 0 && val.length < 2) {
      setCodeError("Code must be at least 2 characters.");
    } else {
      setCodeError("");
    }
  };

  const handleSubmit = () => {
    if (!form.code.trim() || form.code.length < 2) {
      setCodeError("Code is required (min 2 characters).");
      return;
    }
    if (form.discountType === "percentage" && (form.discountValue < 1 || form.discountValue > 100)) {
      toast.error("Percentage discount must be between 1 and 100.");
      return;
    }
    create.mutate({
      code: form.code.trim(),
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      bonusCredits: Number(form.bonusCredits) || 0,
      maxUses: form.maxUses !== "" ? Number(form.maxUses) : null,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
    });
  };

  // Minimum datetime for the expiry picker — now
  const minDatetime = useMemo(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  }, []);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); setForm(EMPTY_FORM); setCodeError(""); } }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-primary" />
            Create Promo Code
          </DialogTitle>
          <DialogDescription>
            Codes are applied at checkout by employers to reduce the price of credit packs.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">

          {/* ── Code ── */}
          <div className="space-y-1.5">
            <Label htmlFor="promo-code">
              Code <span className="text-destructive">*</span>
            </Label>
            <Input
              id="promo-code"
              value={form.code}
              onChange={e => handleCodeChange(e.target.value)}
              placeholder="e.g. LAUNCH20"
              className="uppercase font-mono tracking-widest text-base"
              maxLength={64}
            />
            {codeError && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <Info className="w-3 h-3" />{codeError}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Letters, numbers, hyphens and underscores only. Will be uppercased automatically.
            </p>
          </div>

          <Separator />

          {/* ── Discount type toggle ── */}
          <div className="space-y-3">
            <Label>Discount Type</Label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "percentage", icon: Percent, label: "Percentage", sub: "e.g. 20% off" },
                { value: "fixed", icon: DollarSign, label: "Fixed Amount", sub: "e.g. $5.00 off" },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, discountType: opt.value as "percentage" | "fixed", discountValue: opt.value === "percentage" ? 20 : 5 }))}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    form.discountType === opt.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <opt.icon className={`w-4 h-4 ${form.discountType === opt.value ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="font-semibold text-sm">{opt.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{opt.sub}</p>
                </button>
              ))}
            </div>
          </div>

          {/* ── Discount value ── */}
          <div className="space-y-1.5">
            <Label htmlFor="discount-value">
              {form.discountType === "percentage" ? "Discount Percentage" : "Discount Amount (AUD)"}
              <span className="text-destructive"> *</span>
            </Label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {form.discountType === "percentage"
                  ? <Percent className="w-4 h-4" />
                  : <DollarSign className="w-4 h-4" />}
              </div>
              <Input
                id="discount-value"
                type="number"
                min={1}
                max={form.discountType === "percentage" ? 100 : undefined}
                step={form.discountType === "percentage" ? 1 : 0.5}
                value={form.discountValue}
                onChange={e => setForm(f => ({ ...f, discountValue: Number(e.target.value) }))}
                className="pl-9"
              />
            </div>
            {form.discountType === "percentage" && (
              <div className="flex gap-2 flex-wrap pt-1">
                {[10, 15, 20, 25, 50].map(pct => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, discountValue: pct }))}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold border-2 transition-all ${
                      form.discountValue === pct
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:border-primary/50 text-muted-foreground"
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Bonus credits ── */}
          <div className="space-y-1.5">
            <Label htmlFor="bonus-credits" className="flex items-center gap-1.5">
              <Gift className="w-3.5 h-3.5 text-primary" />
              Bonus Credits
              <span className="text-xs text-muted-foreground font-normal">(awarded on top of the discount)</span>
            </Label>
            <Input
              id="bonus-credits"
              type="number"
              min={0}
              max={20}
              value={form.bonusCredits}
              onChange={e => setForm(f => ({ ...f, bonusCredits: Number(e.target.value) }))}
              placeholder="0"
            />
          </div>

          <Separator />

          {/* ── Limits ── */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="max-uses" className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-muted-foreground" />
                Max Uses
              </Label>
              <Input
                id="max-uses"
                type="number"
                min={1}
                value={form.maxUses}
                onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))}
                placeholder="Unlimited"
              />
              <p className="text-xs text-muted-foreground">Leave blank for unlimited uses.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expires-at" className="flex items-center gap-1.5">
                <CalendarClock className="w-3.5 h-3.5 text-muted-foreground" />
                Expiry Date &amp; Time
              </Label>
              <Input
                id="expires-at"
                type="datetime-local"
                min={minDatetime}
                value={form.expiresAt}
                onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">Leave blank for no expiry.</p>
            </div>
          </div>

          {/* ── Live preview ── */}
          <DiscountPreview
            discountType={form.discountType}
            discountValue={form.discountValue}
            bonusCredits={form.bonusCredits}
          />

          {/* ── Submit ── */}
          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={create.isPending || !form.code.trim() || form.code.length < 2}
          >
            {create.isPending ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Creating...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Create Promo Code
              </span>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Inline edit row ──────────────────────────────────────────────────────────

function EditableRow({
  code,
  onUpdate,
}: {
  code: {
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
  onUpdate: (id: number, patch: { isActive?: boolean; maxUses?: number | null; expiresAt?: string | null }) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editMaxUses, setEditMaxUses] = useState(code.maxUses?.toString() ?? "");
  const [editExpiry, setEditExpiry] = useState(() => {
    if (!code.expiresAt) return "";
    const d = new Date(code.expiresAt);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [copied, setCopied] = useState(false);

  const status = codeStatus(code);

  const handleCopy = () => {
    navigator.clipboard?.writeText(code.code);
    setCopied(true);
    toast.success(`Copied "${code.code}" to clipboard.`);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    onUpdate(code.id, {
      maxUses: editMaxUses !== "" ? Number(editMaxUses) : null,
      expiresAt: editExpiry ? new Date(editExpiry).toISOString() : null,
    });
    setEditing(false);
  };

  const discountLabel = code.discountType === "percentage"
    ? `${code.discountValue}% off`
    : `$${code.discountValue} AUD off`;

  return (
    <tr className="border-b border-border/50 hover:bg-muted/20 transition-colors group">
      {/* Code + copy */}
      <td className="py-3 pr-3">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-sm tracking-wider">{code.code}</span>
          <button
            onClick={handleCopy}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-accent"
            title="Copy code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
          </button>
        </div>
      </td>

      {/* Discount */}
      <td className="py-3 px-3">
        <div className="flex items-center gap-1.5">
          <TrendingDown className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="text-sm">{discountLabel}</span>
          {code.bonusCredits > 0 && (
            <Badge variant="secondary" className="text-xs ml-1">
              <Gift className="w-2.5 h-2.5 mr-1" />
              +{code.bonusCredits} cr
            </Badge>
          )}
        </div>
      </td>

      {/* Usage */}
      <td className="py-3 px-3 text-right">
        {editing ? (
          <Input
            type="number"
            min={1}
            value={editMaxUses}
            onChange={e => setEditMaxUses(e.target.value)}
            placeholder="∞"
            className="w-20 h-7 text-xs text-right ml-auto"
          />
        ) : (
          <span className="text-sm tabular-nums">
            <span className="font-semibold">{code.usedCount}</span>
            <span className="text-muted-foreground"> / {code.maxUses ?? "∞"}</span>
          </span>
        )}
      </td>

      {/* Expiry */}
      <td className="py-3 px-3 text-right">
        {editing ? (
          <Input
            type="datetime-local"
            value={editExpiry}
            onChange={e => setEditExpiry(e.target.value)}
            className="w-44 h-7 text-xs ml-auto"
          />
        ) : (
          <span className="text-sm text-muted-foreground">
            {code.expiresAt
              ? new Date(code.expiresAt).toLocaleString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
              : "Never"}
          </span>
        )}
      </td>

      {/* Status badge */}
      <td className="py-3 px-3 text-center">
        <Badge variant={status.variant} className="text-xs">{status.label}</Badge>
      </td>

      {/* Active toggle */}
      <td className="py-3 px-3 text-center">
        <Switch
          checked={code.isActive}
          onCheckedChange={v => onUpdate(code.id, { isActive: v })}
        />
      </td>

      {/* Edit actions */}
      <td className="py-3 pl-3 text-right">
        {editing ? (
          <div className="flex items-center gap-1 justify-end">
            <button
              onClick={handleSave}
              className="p-1.5 rounded hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600"
              title="Save"
            >
              <Save className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setEditing(false)}
              className="p-1.5 rounded hover:bg-muted text-muted-foreground"
              title="Cancel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-accent text-muted-foreground"
            title="Edit expiry / max uses"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
      </td>
    </tr>
  );
}

// ─── Promo code table ─────────────────────────────────────────────────────────

function PromoCodeTable() {
  const { data: codes, isLoading } = trpc.admin.promoCodes.list.useQuery();
  const utils = trpc.useUtils();

  const update = trpc.admin.promoCodes.update.useMutation({
    onSuccess: () => {
      utils.admin.promoCodes.list.invalidate();
      toast.success("Promo code updated.");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleUpdate = (
    id: number,
    patch: { isActive?: boolean; maxUses?: number | null; expiresAt?: string | null }
  ) => {
    update.mutate({ id, ...patch });
  };

  if (isLoading) {
    return (
      <div className="space-y-2 py-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-10 rounded-lg bg-muted/40 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!codes || codes.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Tag className="w-12 h-12 mx-auto mb-3 opacity-20" />
        <p className="font-medium">No promo codes yet.</p>
        <p className="text-sm mt-1">Create your first code using the button above.</p>
      </div>
    );
  }

  const now = new Date();
  const active = codes.filter(c => c.isActive && (!c.expiresAt || new Date(c.expiresAt) > now) && (c.maxUses === null || c.usedCount < c.maxUses));
  const inactive = codes.filter(c => !active.includes(c));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[700px]">
        <thead>
          <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wide">
            <th className="text-left py-2.5 pr-3 font-medium">Code</th>
            <th className="text-left py-2.5 px-3 font-medium">Discount</th>
            <th className="text-right py-2.5 px-3 font-medium">Used / Max</th>
            <th className="text-right py-2.5 px-3 font-medium">Expires</th>
            <th className="text-center py-2.5 px-3 font-medium">Status</th>
            <th className="text-center py-2.5 px-3 font-medium">Active</th>
            <th className="py-2.5 pl-3 w-16"></th>
          </tr>
        </thead>
        <tbody>
          {active.length > 0 && (
            <>
              <tr>
                <td colSpan={7} className="pt-3 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Live ({active.length})
                </td>
              </tr>
              {active.map(code => (
                <EditableRow key={code.id} code={code} onUpdate={handleUpdate} />
              ))}
            </>
          )}
          {inactive.length > 0 && (
            <>
              <tr>
                <td colSpan={7} className="pt-4 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Inactive / Expired ({inactive.length})
                </td>
              </tr>
              {inactive.map(code => (
                <EditableRow key={code.id} code={code} onUpdate={handleUpdate} />
              ))}
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Summary stats ────────────────────────────────────────────────────────────

function PromoStats() {
  const { data: codes } = trpc.admin.promoCodes.list.useQuery();
  if (!codes || codes.length === 0) return null;

  const now2 = new Date();
  const totalActive = codes.filter(c =>
    c.isActive &&
    (!c.expiresAt || new Date(c.expiresAt) > now2) &&
    (c.maxUses === null || c.usedCount < c.maxUses)
  ).length;
  const totalUses = codes.reduce((sum, c) => sum + c.usedCount, 0);
  const totalCodes = codes.length;

  return (
    <div className="grid grid-cols-3 gap-4">
      {[
        { label: "Total Codes", value: totalCodes, icon: Tag },
        { label: "Live & Active", value: totalActive, icon: Check },
        { label: "Total Redemptions", value: totalUses, icon: Users },
      ].map(stat => (
        <Card key={stat.label} className="border border-border">
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <stat.icon className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminPromoCodes() {
  const { user, loading } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-sm w-full mx-4">
          <CardContent className="pt-6 text-center space-y-3">
            <ShieldAlert className="w-12 h-12 mx-auto text-destructive" />
            <p className="font-semibold">Admin access required.</p>
            <p className="text-sm text-muted-foreground">
              This page is restricted to JutJut administrators.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Tag className="w-6 h-6 text-primary" />
              Promo Codes
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Create and manage discount codes for employer credit purchases. Codes support
              percentage or fixed-amount discounts, optional bonus credits, usage limits, and expiry dates.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="gap-2 shrink-0">
            <Plus className="w-4 h-4" />
            New Code
          </Button>
        </div>

        {/* Stats */}
        <PromoStats />

        {/* Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary" />
              All Promo Codes
            </CardTitle>
            <CardDescription>
              Hover a row to copy the code or edit its expiry and usage limit inline.
              Toggle the Active switch to enable or disable a code immediately.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PromoCodeTable />
          </CardContent>
        </Card>
      </div>

      <CreatePromoModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
