/**
 * Employer Dashboard
 * - Credit balance display
 * - Buy credits modal (PinPayments Hosted Fields)
 * - Post a job (with credit deduction)
 * - Job list with analytics
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Coins, Plus, BarChart2, Briefcase, Star, RefreshCw, CreditCard, Tag, Info } from "lucide-react";

// ─── Credit balance card ──────────────────────────────────────────────────────

function CreditBalanceCard({ onBuyCredits }: { onBuyCredits: () => void }) {
  const { data } = trpc.employer.credits.balance.useQuery();
  const balance = data?.balance ?? 0;

  return (
    <Card className="border-2 border-primary/20 bg-primary/5">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-primary/10">
              <Coins className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Credit Balance</p>
              <p className="text-3xl font-bold text-foreground">
                {balance}
                <span className="text-base font-normal text-muted-foreground ml-1">
                  {balance === 1 ? "credit" : "credits"}
                </span>
              </p>
            </div>
          </div>
          <Button onClick={onBuyCredits} size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            Buy Credits
          </Button>
        </div>
        {balance === 0 && (
          <p className="mt-3 text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <Info className="w-4 h-4" />
            You need at least 1 credit to post a job.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Buy Credits Modal ────────────────────────────────────────────────────────

function BuyCreditsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [selectedPack, setSelectedPack] = useState<"pack_1" | "pack_5">("pack_1");
  const [promoCode, setPromoCode] = useState("");
  const [promoResult, setPromoResult] = useState<{
    savingsCents: number;
    subtotalCents: number;
    gstCents: number;
    totalCents: number;
    bonusCredits: number;
    code: string;
  } | null>(null);
  const [cardToken, setCardToken] = useState(""); // In production: from PinPayments Hosted Fields
  const [saveCard, setSaveCard] = useState(false);
  const [includeGst, setIncludeGst] = useState(false);

  const utils = trpc.useUtils();

  const validatePromo = trpc.employer.credits.validatePromo.useMutation({
    onSuccess: (data) => {
      setPromoResult({
        savingsCents: data.savingsCents,
        subtotalCents: data.subtotalCents,
        gstCents: data.gstCents,
        totalCents: data.totalCents,
        bonusCredits: data.bonusCredits,
        code: data.code,
      });
      toast.success(`Promo code applied: saving $${(data.savingsCents / 100).toFixed(2)}`);
    },
    onError: (err) => {
      setPromoResult(null);
      toast.error(err.message);
    },
  });

  const purchase = trpc.employer.credits.purchase.useMutation({
    onSuccess: (data) => {
      toast.success(`Payment successful! ${data.creditsAdded} credit(s) added. New balance: ${data.newBalance}`);
      utils.employer.credits.balance.invalidate();
      utils.employer.credits.history.invalidate();
      onClose();
      resetForm();
    },
    onError: (err) => {
      toast.error(`Payment failed: ${err.message}`);
    },
  });

  const resetForm = () => {
    setSelectedPack("pack_1");
    setPromoCode("");
    setPromoResult(null);
    setCardToken("");
    setSaveCard(false);
  };

  const packs = [
    { id: "pack_1" as const, credits: 1, priceAud: 15, label: "1 Credit — $15 AUD" },
    { id: "pack_5" as const, credits: 5, priceAud: 50, label: "5 Credits — $50 AUD (save $25)" },
  ];

  const selectedPackData = packs.find(p => p.id === selectedPack)!;
  const baseAmountCents = selectedPackData.priceAud * 100;
  const displaySubtotal = promoResult ? promoResult.subtotalCents : baseAmountCents;
  const displayGst = includeGst ? Math.round(displaySubtotal * 0.1) : 0;
  const displayTotal = displaySubtotal + displayGst;

  const handleApplyPromo = () => {
    if (!promoCode.trim()) return;
    validatePromo.mutate({ code: promoCode.trim(), packId: selectedPack });
  };

  const handlePay = () => {
    if (!cardToken.trim()) {
      toast.error("Please enter your card details.");
      return;
    }
    purchase.mutate({
      packId: selectedPack,
      cardToken,
      saveCard,
      promoCode: promoResult ? promoResult.code : undefined,
      includeGst,
      ipAddress: "0.0.0.0", // In production: pass real IP from server
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); resetForm(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Buy Credits
          </DialogTitle>
          <DialogDescription>
            Credits are used to post jobs. 1 credit = 1 standard job post (30 days).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Pack selection */}
          <div className="space-y-2">
            <Label>Select Pack</Label>
            <div className="grid grid-cols-2 gap-3">
              {packs.map(pack => (
                <button
                  key={pack.id}
                  onClick={() => { setSelectedPack(pack.id); setPromoResult(null); }}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    selectedPack === pack.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <p className="font-semibold text-sm">{pack.credits} Credit{pack.credits > 1 ? "s" : ""}</p>
                  <p className="text-lg font-bold text-primary">${pack.priceAud} AUD</p>
                  {pack.credits === 5 && (
                    <Badge variant="secondary" className="text-xs mt-1">Best Value</Badge>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Promo code */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Tag className="w-3.5 h-3.5" />
              Promo Code
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder="Enter promo code"
                value={promoCode}
                onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoResult(null); }}
                className="uppercase"
              />
              <Button
                variant="outline"
                onClick={handleApplyPromo}
                disabled={!promoCode.trim() || validatePromo.isPending}
              >
                Apply
              </Button>
            </div>
            {promoResult && (
              <p className="text-sm text-green-600 dark:text-green-400">
                ✓ Saving ${(promoResult.savingsCents / 100).toFixed(2)}
                {promoResult.bonusCredits > 0 && ` + ${promoResult.bonusCredits} bonus credit(s)`}
              </p>
            )}
          </div>

          {/* Card token input (sandbox: enter test token manually) */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5" />
              Card Token
            </Label>
            <Input
              placeholder="card_token from PinPayments Hosted Fields"
              value={cardToken}
              onChange={e => setCardToken(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Sandbox test token: use PinPayments test card <code>4111 1111 1111 1111</code> to generate a token via the PinPayments API.
            </p>
          </div>

          {/* Save card toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="save-card" className="text-sm">Save card for auto-repost</Label>
            <Switch id="save-card" checked={saveCard} onCheckedChange={setSaveCard} />
          </div>

          {/* GST toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="include-gst" className="text-sm">I am GST registered (+10% GST)</Label>
            <Switch id="include-gst" checked={includeGst} onCheckedChange={setIncludeGst} />
          </div>

          {/* Price summary */}
          <div className="rounded-lg bg-muted/50 p-4 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal (excl. GST)</span>
              <span>${(displaySubtotal / 100).toFixed(2)} AUD</span>
            </div>
            {promoResult && (
              <div className="flex justify-between text-green-600 dark:text-green-400">
                <span>Discount</span>
                <span>−${(promoResult.savingsCents / 100).toFixed(2)} AUD</span>
              </div>
            )}
            {includeGst && (
              <div className="flex justify-between text-muted-foreground">
                <span>GST (10%)</span>
                <span>${(displayGst / 100).toFixed(2)} AUD</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-base pt-1 border-t border-border">
              <span>Total</span>
              <span>${(displayTotal / 100).toFixed(2)} AUD</span>
            </div>
          </div>

          <Button
            className="w-full"
            onClick={handlePay}
            disabled={purchase.isPending || !cardToken.trim()}
          >
            {purchase.isPending ? "Processing..." : `Pay $${(displayTotal / 100).toFixed(2)} AUD`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Post Job Modal ───────────────────────────────────────────────────────────

function PostJobModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState({
    title: "",
    employer: "",
    description: "",
    wage: "",
    distance: "",
    type: "casual" as "casual" | "part-time" | "full-time" | "volunteer",
    noCoverLetter: false,
    isFeatured: false,
    autoRepostEnabled: false,
  });

  const utils = trpc.useUtils();
  const { data: balanceData } = trpc.employer.credits.balance.useQuery();
  const balance = balanceData?.balance ?? 0;

  const postJob = trpc.employer.jobs.post.useMutation({
    onSuccess: (data) => {
      toast.success(`Job posted! Expires in 30 days. New credit balance: ${data.newBalance}`);
      utils.employer.credits.balance.invalidate();
      utils.employer.jobs.list.invalidate();
      onClose();
      setForm({ title: "", employer: "", description: "", wage: "", distance: "", type: "casual", noCoverLetter: false, isFeatured: false, autoRepostEnabled: false });
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" />
            Post a Job
          </DialogTitle>
          <DialogDescription>
            Costs 1 credit. Current balance: <strong>{balance}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Job Title *</Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Barista, Retail Assistant" />
          </div>

          <div className="space-y-1.5">
            <Label>Business Name *</Label>
            <Input value={form.employer} onChange={e => setForm(f => ({ ...f, employer: e.target.value }))} placeholder="Your business name" />
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What will the student be doing?" rows={4} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Pay Rate</Label>
              <Input value={form.wage} onChange={e => setForm(f => ({ ...f, wage: e.target.value }))} placeholder="e.g. $18/hr" />
            </div>
            <div className="space-y-1.5">
              <Label>Location / Distance</Label>
              <Input value={form.distance} onChange={e => setForm(f => ({ ...f, distance: e.target.value }))} placeholder="e.g. 2km from CBD" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Job Type</Label>
            <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as typeof form.type }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="casual">Casual</SelectItem>
                <SelectItem value="part-time">Part-Time</SelectItem>
                <SelectItem value="full-time">Full-Time</SelectItem>
                <SelectItem value="volunteer">Volunteer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="no-cover" className="text-sm">No cover letter required</Label>
              <Switch id="no-cover" checked={form.noCoverLetter} onCheckedChange={v => setForm(f => ({ ...f, noCoverLetter: v }))} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="featured" className="text-sm flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-amber-500" />
                  Featured post (top of board, 7 days)
                </Label>
                <p className="text-xs text-muted-foreground">No extra credit — just a visual boost</p>
              </div>
              <Switch id="featured" checked={form.isFeatured} onCheckedChange={v => setForm(f => ({ ...f, isFeatured: v }))} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="auto-repost" className="text-sm flex items-center gap-1">
                  <RefreshCw className="w-3.5 h-3.5 text-blue-500" />
                  Auto-repost when expired
                </Label>
                <p className="text-xs text-muted-foreground">Uses 1 credit on expiry (or charges saved card)</p>
              </div>
              <Switch id="auto-repost" checked={form.autoRepostEnabled} onCheckedChange={v => setForm(f => ({ ...f, autoRepostEnabled: v }))} />
            </div>
          </div>

          {balance < 1 && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <Info className="w-4 h-4" />
              Insufficient credits. Please buy credits before posting.
            </p>
          )}

          <Button
            className="w-full"
            onClick={() => postJob.mutate(form)}
            disabled={postJob.isPending || !form.title.trim() || !form.employer.trim() || balance < 1}
          >
            {postJob.isPending ? "Posting..." : "Post Job (1 credit)"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Job Analytics Table ──────────────────────────────────────────────────────

function JobAnalyticsTable() {
  const { data: analytics, isLoading } = trpc.employer.jobs.analytics.useQuery();

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading analytics...</div>;
  }

  if (!analytics || analytics.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <BarChart2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
        <p>No jobs posted yet. Post your first job to see analytics.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            <th className="text-left py-2 pr-4 font-medium">Job Title</th>
            <th className="text-right py-2 px-3 font-medium">Views</th>
            <th className="text-right py-2 px-3 font-medium">Applies</th>
            <th className="text-right py-2 px-3 font-medium">Status</th>
            <th className="text-right py-2 pl-3 font-medium">Expires</th>
          </tr>
        </thead>
        <tbody>
          {analytics.map(job => (
            <tr key={job.jobId} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
              <td className="py-2.5 pr-4 font-medium">
                {job.title}
                {job.isFeatured && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    <Star className="w-2.5 h-2.5 mr-1" />
                    Featured
                  </Badge>
                )}
              </td>
              <td className="text-right py-2.5 px-3 tabular-nums">{job.viewCount}</td>
              <td className="text-right py-2.5 px-3 tabular-nums">{job.applyCount}</td>
              <td className="text-right py-2.5 px-3">
                <Badge variant={job.isActive ? "default" : "secondary"}>
                  {job.isActive ? "Active" : "Expired"}
                </Badge>
              </td>
              <td className="text-right py-2.5 pl-3 text-muted-foreground">
                {job.expiresAt ? new Date(job.expiresAt).toLocaleDateString("en-AU") : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Transaction History ──────────────────────────────────────────────────────

function TransactionHistory() {
  const { data: history } = trpc.employer.credits.history.useQuery();

  if (!history || history.length === 0) {
    return <p className="text-sm text-muted-foreground">No transactions yet.</p>;
  }

  const typeLabels: Record<string, string> = {
    purchase: "Credit Purchase",
    job_post: "Job Post",
    refund: "Refund",
    promo_bonus: "Promo Bonus",
    auto_repost: "Auto-Repost",
  };

  return (
    <div className="space-y-2">
      {history.slice(0, 10).map(tx => (
        <div key={tx.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
          <div>
            <p className="text-sm font-medium">{typeLabels[tx.type] ?? tx.type}</p>
            {tx.description && <p className="text-xs text-muted-foreground">{tx.description}</p>}
            <p className="text-xs text-muted-foreground">{new Date(tx.createdAt).toLocaleString("en-AU")}</p>
          </div>
          <span className={`font-semibold tabular-nums ${tx.amount > 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
            {tx.amount > 0 ? "+" : ""}{tx.amount} cr
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EmployerDashboard() {
  const { user, loading, isAuthenticated } = useAuth();
  const [buyCreditsOpen, setBuyCreditsOpen] = useState(false);
  const [postJobOpen, setPostJobOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-sm w-full mx-4">
          <CardContent className="pt-6 text-center space-y-4">
            <Briefcase className="w-12 h-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">Please sign in to access the employer dashboard.</p>
            <Button asChild className="w-full">
              <a href={getLoginUrl()}>Sign In</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Employer Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Manage your job listings and credits</p>
          </div>
          <Button onClick={() => setPostJobOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Post a Job
          </Button>
        </div>

        {/* Credit balance */}
        <CreditBalanceCard onBuyCredits={() => setBuyCreditsOpen(true)} />

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Analytics — takes 2 cols */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart2 className="w-4 h-4 text-primary" />
                  Job Performance
                </CardTitle>
                <CardDescription>Views and applications for your active listings</CardDescription>
              </CardHeader>
              <CardContent>
                <JobAnalyticsTable />
              </CardContent>
            </Card>
          </div>

          {/* Transaction history */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Coins className="w-4 h-4 text-primary" />
                  Credit History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TransactionHistory />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <BuyCreditsModal open={buyCreditsOpen} onClose={() => setBuyCreditsOpen(false)} />
      <PostJobModal open={postJobOpen} onClose={() => setPostJobOpen(false)} />
    </div>
  );
}
