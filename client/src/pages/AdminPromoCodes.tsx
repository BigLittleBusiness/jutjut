/**
 * Admin — Promo Code Management
 * Create, list, activate/deactivate promo codes.
 * Only accessible to users with role = "admin".
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Tag, Plus, ShieldAlert } from "lucide-react";

// ─── Create promo code form ───────────────────────────────────────────────────

function CreatePromoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState({
    code: "",
    discountType: "percentage" as "fixed" | "percentage",
    discountValue: 10,
    bonusCredits: 0,
    maxUses: "" as string | number,
    expiresAt: "",
  });

  const utils = trpc.useUtils();

  const create = trpc.admin.promoCodes.create.useMutation({
    onSuccess: () => {
      toast.success("Promo code created.");
      utils.admin.promoCodes.list.invalidate();
      onClose();
      setForm({ code: "", discountType: "percentage", discountValue: 10, bonusCredits: 0, maxUses: "", expiresAt: "" });
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = () => {
    if (!form.code.trim()) {
      toast.error("Code is required.");
      return;
    }
    create.mutate({
      code: form.code.trim().toUpperCase(),
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      bonusCredits: Number(form.bonusCredits) || 0,
      maxUses: form.maxUses !== "" ? Number(form.maxUses) : null,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-primary" />
            Create Promo Code
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Code *</Label>
            <Input
              value={form.code}
              onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
              placeholder="e.g. LAUNCH20"
              className="uppercase font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Discount Type</Label>
              <Select
                value={form.discountType}
                onValueChange={v => setForm(f => ({ ...f, discountType: v as "fixed" | "percentage" }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="fixed">Fixed (AUD)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>
                {form.discountType === "percentage" ? "Discount (%)" : "Discount (AUD)"}
              </Label>
              <Input
                type="number"
                min={1}
                value={form.discountValue}
                onChange={e => setForm(f => ({ ...f, discountValue: Number(e.target.value) }))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Bonus Credits (on top of discount)</Label>
            <Input
              type="number"
              min={0}
              value={form.bonusCredits}
              onChange={e => setForm(f => ({ ...f, bonusCredits: Number(e.target.value) }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Max Uses (blank = unlimited)</Label>
              <Input
                type="number"
                min={1}
                value={form.maxUses}
                onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))}
                placeholder="Unlimited"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Expires At</Label>
              <Input
                type="datetime-local"
                value={form.expiresAt}
                onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
              />
            </div>
          </div>

          <Button className="w-full" onClick={handleSubmit} disabled={create.isPending}>
            {create.isPending ? "Creating..." : "Create Promo Code"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
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

  if (isLoading) {
    return <div className="text-sm text-muted-foreground py-4">Loading...</div>;
  }

  if (!codes || codes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Tag className="w-10 h-10 mx-auto mb-2 opacity-30" />
        <p>No promo codes yet. Create one to get started.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            <th className="text-left py-2 pr-4 font-medium">Code</th>
            <th className="text-left py-2 px-3 font-medium">Discount</th>
            <th className="text-right py-2 px-3 font-medium">Bonus</th>
            <th className="text-right py-2 px-3 font-medium">Used / Max</th>
            <th className="text-right py-2 px-3 font-medium">Expires</th>
            <th className="text-right py-2 pl-3 font-medium">Active</th>
          </tr>
        </thead>
        <tbody>
          {codes.map(code => (
            <tr key={code.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
              <td className="py-2.5 pr-4 font-mono font-semibold">{code.code}</td>
              <td className="py-2.5 px-3">
                {code.discountType === "percentage"
                  ? `${code.discountValue}% off`
                  : `$${code.discountValue} off`}
              </td>
              <td className="text-right py-2.5 px-3 tabular-nums">
                {code.bonusCredits > 0 ? `+${code.bonusCredits} cr` : "—"}
              </td>
              <td className="text-right py-2.5 px-3 tabular-nums">
                {code.usedCount} / {code.maxUses ?? "∞"}
              </td>
              <td className="text-right py-2.5 px-3 text-muted-foreground">
                {code.expiresAt ? new Date(code.expiresAt).toLocaleDateString("en-AU") : "Never"}
              </td>
              <td className="text-right py-2.5 pl-3">
                <Switch
                  checked={code.isActive}
                  onCheckedChange={v => update.mutate({ id: code.id, isActive: v })}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
            <p className="text-sm text-muted-foreground">This page is restricted to JutJut administrators.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Promo Codes</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Manage discount and bonus credit codes for employers</p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            New Code
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Tag className="w-4 h-4 text-primary" />
              All Promo Codes
            </CardTitle>
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
