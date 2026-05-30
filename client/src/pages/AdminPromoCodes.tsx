/**
 * Admin — Promo Code Management (enhanced)
 * - Create codes with percentage or fixed discount, expiry date, max uses, bonus credits
 * - Live discount preview showing savings on both credit packs
 * - Inline edit for expiry and max uses
 * - Status badges (Active / Expired / Exhausted / Inactive)
 * - Copy-to-clipboard for sharing codes
 * - Redemption detail drawer: list of users who redeemed + date + discount applied
 * - Admin-only access guard
 */

import { useState } from "react";
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
  TrendingDown, Info, Eye, UserCircle, Clock, CreditCard,
  ChevronRight, ArrowLeft,
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
              <Badge variant="secondary" className="text-xs">save {formatAud(saving)}</Badge>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Create modal ─────────────────────────────────────────────────────────────

function CreatePromoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState(20);
  const [bonusCredits, setBonusCredits] = useState(0);
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const create = trpc.admin.promoCodes.create.useMutation({
    onSuccess: () => {
      utils.admin.promoCodes.list.invalidate();
      toast.success(`Promo code "${code.toUpperCase()}" created.`);
      onClose();
      setCode(""); setDiscountValue(20); setBonusCredits(0); setMaxUses(""); setExpiresAt("");
    },
    onError: (err) => toast.error(err.message),
  });

  const minDatetime = new Date();
  minDatetime.setMinutes(minDatetime.getMinutes() - minDatetime.getTimezoneOffset());
  const minStr = minDatetime.toISOString().slice(0, 16);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || code.trim().length < 2) {
      toast.error("Code must be at least 2 characters.");
      return;
    }
    create.mutate({
      code: code.toUpperCase(),
      discountType,
      discountValue,
      bonusCredits,
      maxUses: maxUses !== "" ? Number(maxUses) : null,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Create Promo Code
          </DialogTitle>
          <DialogDescription>
            New codes are active immediately. Share them with employers for credit purchases.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-1">
          {/* Code */}
          <div className="space-y-1.5">
            <Label htmlFor="promo-code">Code</Label>
            <Input
              id="promo-code"
              placeholder="e.g. LAUNCH20"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))}
              className="font-mono tracking-widest uppercase"
              maxLength={64}
            />
            <p className="text-xs text-muted-foreground">Letters, numbers, hyphens and underscores only.</p>
          </div>

          {/* Discount type */}
          <div className="space-y-2">
            <Label>Discount Type</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["percentage", "fixed"] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setDiscountType(t); setDiscountValue(t === "percentage" ? 20 : 5); }}
                  className={`flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-colors ${
                    discountType === t
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background hover:bg-muted/50"
                  }`}
                >
                  {t === "percentage" ? <Percent className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />}
                  {t === "percentage" ? "Percentage Off" : "Fixed Amount"}
                </button>
              ))}
            </div>
          </div>

          {/* Discount value */}
          <div className="space-y-1.5">
            <Label htmlFor="discount-value">
              {discountType === "percentage" ? "Percentage Off (%)" : "Amount Off (AUD)"}
            </Label>
            {discountType === "percentage" && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {[10, 15, 20, 25, 50].map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setDiscountValue(v)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                      discountValue === v
                        ? "bg-primary text-primary-foreground border-primary"
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
              min={1}
              max={discountType === "percentage" ? 100 : undefined}
              step={discountType === "fixed" ? 0.5 : 1}
              value={discountValue}
              onChange={e => setDiscountValue(Number(e.target.value))}
            />
          </div>

          {/* Live preview */}
          <DiscountPreview type={discountType} value={discountValue} />

          {/* Bonus credits */}
          <div className="space-y-1.5">
            <Label htmlFor="bonus-credits" className="flex items-center gap-1.5">
              <Gift className="w-3.5 h-3.5 text-primary" />
              Bonus Credits (on top of discount)
            </Label>
            <Input
              id="bonus-credits"
              type="number"
              min={0}
              value={bonusCredits}
              onChange={e => setBonusCredits(Number(e.target.value))}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground">Extra credits awarded to the employer at redemption.</p>
          </div>

          <Separator />

          {/* Max uses + expiry */}
          <div className="grid grid-cols-2 gap-4">
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

  const discountLabel = code.discountType === "percentage"
    ? `${code.discountValue}% off`
    : `$${code.discountValue} AUD off`;

  const status = codeStatus(code);

  return (
    <Dialog open onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              aria-label="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex-1 min-w-0">
              <DialogTitle className="flex items-center gap-2 flex-wrap">
                <span className="font-mono tracking-widest text-lg">{code.code}</span>
                <Badge variant={status.variant} className="text-xs">{status.label}</Badge>
              </DialogTitle>
              <DialogDescription className="mt-0.5">
                {discountLabel}
                {code.bonusCredits > 0 && ` · +${code.bonusCredits} bonus credit${code.bonusCredits !== 1 ? "s" : ""}`}
                {" · "}
                {code.usedCount} of {code.maxUses ?? "∞"} uses
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        {/* Financial summary banner — shown once redemptions have loaded */}
        {!isLoading && redemptions && redemptions.length > 0 && (() => {
          // Calculate total discount value saved across all redemptions
          const totalSavedCents = redemptions.reduce((sum, r) => {
            // We use pack_5 ($50 AUD = 5000 cents) as the reference pack for fixed discounts
            // For percentage discounts we use the weighted average of both packs
            const avgPackCents = (1500 + 5000) / 2; // 3250 cents
            if (r.discountType === "percentage") {
              return sum + Math.round(avgPackCents * (Math.min(r.discountValue, 100) / 100));
            }
            return sum + r.discountValue * 100; // fixed AUD → cents
          }, 0);

          // Revenue generated = total redemptions × average pack price (minus discount)
          const avgPackCents = (1500 + 5000) / 2;
          const totalRevenueCents = redemptions.reduce((sum, r) => {
            if (r.discountType === "percentage") {
              const saving = Math.round(avgPackCents * (Math.min(r.discountValue, 100) / 100));
              return sum + Math.max(0, avgPackCents - saving);
            }
            const saving = Math.min(r.discountValue * 100, avgPackCents);
            return sum + Math.max(0, avgPackCents - saving);
          }, 0);

          const totalBonusCredits = redemptions.reduce((sum, r) => sum + (r.bonusCreditsAwarded ?? 0), 0);

          return (
            <div className="grid grid-cols-3 gap-3 px-1 py-3">
              <div className="rounded-xl border border-border bg-green-50 dark:bg-green-950/30 p-3 text-center">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Total Saved by Employers</p>
                <p className="text-xl font-bold text-green-600 dark:text-green-400">
                  {formatAud(totalSavedCents)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">est. across {redemptions.length} use{redemptions.length !== 1 ? "s" : ""}</p>
              </div>
              <div className="rounded-xl border border-border bg-primary/5 p-3 text-center">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Est. Revenue Generated</p>
                <p className="text-xl font-bold text-foreground">
                  {formatAud(totalRevenueCents)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">after discount, excl. GST</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/40 p-3 text-center">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Bonus Credits Issued</p>
                <p className="text-xl font-bold text-foreground">{totalBonusCredits}</p>
                <p className="text-xs text-muted-foreground mt-0.5">credit{totalBonusCredits !== 1 ? "s" : ""} awarded</p>
              </div>
            </div>
          );
        })()}

        {/* Redemption list */}
        <div className="flex-1 overflow-y-auto min-h-0">
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
          ) : (
            <div className="py-2 space-y-1">
              {/* Column headers */}
              <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b border-border">
                <span>User</span>
                <span className="text-right">Discount Applied</span>
                <span className="text-right w-40">Redeemed</span>
              </div>

              {redemptions.map((r) => {
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
                        <UserCircle className="w-4.5 h-4.5 text-primary" />
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
            <div className="flex items-center justify-between text-sm text-muted-foreground pt-1 pb-0">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                {redemptions.length} total redemption{redemptions.length !== 1 ? "s" : ""}
              </span>
              {redemptions.length > 0 && (
                <span className="text-xs">
                  Most recent:{" "}
                  {new Date(redemptions[0].redeemedAt).toLocaleDateString("en-AU", {
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

      {/* Usage — clickable to open detail */}
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
          <button
            onClick={() => onViewDetail(code)}
            className="text-sm tabular-nums hover:text-primary transition-colors group/usage"
            title="View redemption history"
          >
            <span className="font-semibold">{code.usedCount}</span>
            <span className="text-muted-foreground"> / {code.maxUses ?? "∞"}</span>
            {code.usedCount > 0 && (
              <ChevronRight className="w-3 h-3 inline ml-0.5 opacity-0 group-hover/usage:opacity-100 transition-opacity" />
            )}
          </button>
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

      {/* Actions */}
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
          <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onViewDetail(code)}
              className="p-1.5 rounded hover:bg-accent text-muted-foreground"
              title="View redemptions"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setEditing(true)}
              className="p-1.5 rounded hover:bg-accent text-muted-foreground"
              title="Edit expiry / max uses"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

// ─── Promo code table ─────────────────────────────────────────────────────────

function PromoCodeTable({ onViewDetail }: { onViewDetail: (code: PromoCodeRow) => void }) {
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
            <th className="py-2.5 pl-3 w-20"></th>
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
                <EditableRow key={code.id} code={code} onUpdate={handleUpdate} onViewDetail={onViewDetail} />
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
                <EditableRow key={code.id} code={code} onUpdate={handleUpdate} onViewDetail={onViewDetail} />
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
  const [detailCode, setDetailCode] = useState<PromoCodeRow | null>(null);

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
              Create and manage discount codes for employer credit purchases. Click the usage count
              or the eye icon on any row to view the full redemption history.
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
              Hover a row to copy the code, view redemptions, or edit its expiry and usage limit inline.
              Click the usage count to see who redeemed a code and when.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PromoCodeTable onViewDetail={setDetailCode} />
          </CardContent>
        </Card>
      </div>

      <CreatePromoModal open={createOpen} onClose={() => setCreateOpen(false)} />

      {detailCode && (
        <RedemptionDrawer code={detailCode} onClose={() => setDetailCode(null)} />
      )}
    </div>
  );
}
