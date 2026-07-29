/**
 * Employer Dashboard
 * - Credit balance display
 * - Buy credits modal (PinPayments Hosted Fields)
 * - Post a job (with credit deduction)
 * - Job list with analytics
 */

import { useState, useEffect } from "react";
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
import { Coins, Plus, BarChart2, Briefcase, Star, RefreshCw, CreditCard, Tag, Info, ChevronDown, ChevronRight, Users, Eye, TrendingUp, Clock, Mail, ShieldOff, Settings, Building2, Phone, MapPin, CheckCircle2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";


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

// Stripe card element styles to match the site theme
const STRIPE_ELEMENT_STYLE = {
  base: {
    fontSize: "14px",
    color: "#1a1a1a",
    fontFamily: "inherit",
    "::placeholder": { color: "#9ca3af" },
  },
  invalid: { color: "#ef4444" },
};

// Inner form for Stripe — must be inside <Elements> provider
function StripePaymentForm({
  onToken,
  isPending,
}: {
  onToken: (paymentMethodId: string) => void;
  isPending: boolean;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [cardError, setCardError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!stripe || !elements) return;
    const cardEl = elements.getElement(CardElement);
    if (!cardEl) return;
    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: "card",
      card: cardEl,
    });
    if (error) {
      setCardError(error.message ?? "Card error");
    } else if (paymentMethod) {
      setCardError(null);
      onToken(paymentMethod.id);
    }
  };

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-1">
        <CreditCard className="w-3.5 h-3.5" />
        Card Details
      </Label>
      <div className="border rounded-md px-3 py-3 bg-background">
        <CardElement options={{ style: STRIPE_ELEMENT_STYLE, hidePostalCode: true }} />
      </div>
      {cardError && <p className="text-xs text-red-500">{cardError}</p>}
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <span>⚡</span> Powered by Stripe — your card details are never stored on JutJut servers.
      </p>
      <Button className="w-full" onClick={handleSubmit} disabled={!stripe || isPending}>
        {isPending ? "Processing..." : "Confirm Payment"}
      </Button>
    </div>
  );
}

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
  const [cardToken, setCardToken] = useState(""); // PinPayments token
  const [saveCard, setSaveCard] = useState(false);
  const [includeGst, setIncludeGst] = useState(false);
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null);

  const utils = trpc.useUtils();

  // Fetch active gateway and (if Stripe) the publishable key
  const activeGatewayQuery = trpc.employer.credits.activeGateway.useQuery();
  const stripeKeyQuery = trpc.employer.credits.stripePublishableKey.useQuery(undefined, {
    enabled: activeGatewayQuery.data?.gateway === "stripe",
  });

  const activeGateway = activeGatewayQuery.data?.gateway ?? "pin";

  // Initialise Stripe.js lazily once we have the publishable key
  useEffect(() => {
    if (activeGateway === "stripe" && stripeKeyQuery.data?.publishableKey) {
      setStripePromise(loadStripe(stripeKeyQuery.data.publishableKey));
    }
  }, [activeGateway, stripeKeyQuery.data?.publishableKey]);

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

  // Called by PinPayments path
  const handlePinPay = () => {
    if (!cardToken.trim()) {
      toast.error("Please enter your card token.");
      return;
    }
    purchase.mutate({
      packId: selectedPack,
      cardToken,
      saveCard,
      promoCode: promoResult ? promoResult.code : undefined,
      includeGst,
      ipAddress: "0.0.0.0",
    });
  };

  // Called by Stripe Elements path after createPaymentMethod
  const handleStripeToken = (paymentMethodId: string) => {
    purchase.mutate({
      packId: selectedPack,
      cardToken: paymentMethodId, // server routes this to Stripe
      saveCard,
      promoCode: promoResult ? promoResult.code : undefined,
      includeGst,
      ipAddress: "0.0.0.0",
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

          {/* GST toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="include-gst" className="text-sm">I am GST registered (+10% GST)</Label>
            <Switch id="include-gst" checked={includeGst} onCheckedChange={setIncludeGst} />
          </div>

          {/* Save card toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="save-card" className="text-sm">Save card for auto-repost</Label>
            <Switch id="save-card" checked={saveCard} onCheckedChange={setSaveCard} />
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

          {/* Payment input — conditionally rendered based on active gateway */}
          {activeGatewayQuery.isLoading ? (
            <div className="text-sm text-muted-foreground text-center py-4">Loading payment options…</div>
          ) : activeGateway === "stripe" ? (
            stripePromise ? (
              <Elements stripe={stripePromise}>
                <StripePaymentForm onToken={handleStripeToken} isPending={purchase.isPending} />
              </Elements>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-4">Loading Stripe…</div>
            )
          ) : (
            /* PinPayments token input */
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
                🇦🇺 Powered by PinPayments. Test token: use card <code>4111 1111 1111 1111</code>.
              </p>
              <Button
                className="w-full"
                onClick={handlePinPay}
                disabled={purchase.isPending || !cardToken.trim()}
              >
                {purchase.isPending ? "Processing..." : `Pay $${(displayTotal / 100).toFixed(2)} AUD`}
              </Button>
            </div>
          )}
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

// ─── Job Analytics Detail Panel ───────────────────────────────────────────────

function JobAnalyticsDetailPanel({ jobId, onClose }: { jobId: number; onClose: () => void }) {
  const { data, isLoading } = trpc.employer.jobs.analyticsDetail.useQuery({ jobId });

  if (isLoading) {
    return (
      <div className="p-5 space-y-3 border border-border rounded-xl bg-card/50">
        {[1, 2, 3].map(i => <div key={i} className="h-5 bg-muted animate-pulse rounded" />)}
      </div>
    );
  }
  if (!data) return null;

  const { job, applicants, schoolBreakdown, applicationsOverTime } = data;

  return (
    <div className="border border-primary/30 rounded-xl bg-primary/5 p-5 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-bold text-base">{job.title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Detailed analytics — click row again to collapse</p>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1">
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Views", value: job.views, icon: <Eye className="w-3.5 h-3.5" /> },
          { label: "Applies", value: job.applies, icon: <Users className="w-3.5 h-3.5" /> },
          { label: "Hires", value: job.hires, icon: <TrendingUp className="w-3.5 h-3.5" /> },
          { label: "Conversion", value: `${job.conversionRate}%`, icon: <BarChart2 className="w-3.5 h-3.5" /> },
        ].map(kpi => (
          <div key={kpi.label} className="bg-background rounded-lg p-3 border border-border">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              {kpi.icon}
              <span className="text-xs">{kpi.label}</span>
            </div>
            <p className="text-xl font-bold tabular-nums">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Extra metrics */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        {job.timeToFirstApplicationHours !== null && (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            First application in {job.timeToFirstApplicationHours}h
          </span>
        )}
        <span className="flex items-center gap-1">
          <Star className="w-3 h-3" />
          Avg {job.avgApplicantSkillCount} verified skills per applicant
        </span>
      </div>

      {/* Charts row */}
      {(applicationsOverTime.length > 0 || schoolBreakdown.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {applicationsOverTime.length > 0 && (
            <div>
              <p className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Applications Over Time</p>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={applicationsOverTime} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d: string) => d.slice(5)} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 11, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                    formatter={(v: number) => [v, "Applications"]}
                  />
                  <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          {schoolBreakdown.length > 0 && (
            <div>
              <p className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Applicants by School</p>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={schoolBreakdown.slice(0, 6)} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="schoolName" tick={{ fontSize: 9 }} width={90} />
                  <Tooltip
                    contentStyle={{ fontSize: 11, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                    formatter={(v: number) => [v, "Applicants"]}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Applicant table */}
      {applicants.length > 0 && (
        <div>
          <p className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Applicants ({applicants.length})</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-1.5 pr-3 font-medium">Applicant</th>
                  <th className="text-left py-1.5 px-3 font-medium">Contact</th>
                  <th className="text-right py-1.5 px-3 font-medium">Skills</th>
                  <th className="text-right py-1.5 px-3 font-medium">Status</th>
                  <th className="text-right py-1.5 pl-3 font-medium">Applied</th>
                </tr>
              </thead>
              <tbody>
                {applicants.map((a, i) => (
                  <tr key={i} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                    <td className="py-2 pr-3 font-medium">
                      {a.name ?? (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <ShieldOff className="w-3 h-3" /> Anonymous
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-muted-foreground">
                      {a.email ? (
                        <a href={`mailto:${a.email}`} className="flex items-center gap-1 hover:text-primary transition-colors">
                          <Mail className="w-3 h-3" />{a.email}
                        </a>
                      ) : (
                        <span className="flex items-center gap-1"><ShieldOff className="w-3 h-3" /> Hidden</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums">{a.verifiedSkillCount}</td>
                    <td className="py-2 px-3 text-right">
                      <Badge variant={a.status === "shortlisted" ? "default" : "secondary"} className="text-[10px]">
                        {a.status ?? "applied"}
                      </Badge>
                    </td>
                    <td className="py-2 pl-3 text-right text-muted-foreground">
                      {new Date(a.appliedAt).toLocaleDateString("en-AU")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {applicants.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">No applications yet.</p>
      )}
    </div>
  );
}

// ─── Job Analytics Table ──────────────────────────────────────────────────────

function JobAnalyticsTable() {
  const { data: analytics, isLoading } = trpc.employer.jobs.analytics.useQuery();
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);

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
    <div className="space-y-3">
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
            {analytics.map(job => {
              const isExpanded = selectedJobId === job.jobId;
              return (
                <tr
                  key={job.jobId}
                  className={`border-b border-border/50 cursor-pointer transition-colors ${
                    isExpanded ? "bg-primary/5" : "hover:bg-muted/30"
                  }`}
                  onClick={() => setSelectedJobId(isExpanded ? null : job.jobId)}
                >
                  <td className="py-2.5 pr-4 font-medium">
                    <span className="flex items-center gap-1.5">
                      {isExpanded
                        ? <ChevronDown className="w-3.5 h-3.5 text-primary shrink-0" />
                        : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      }
                      {job.title}
                      {job.isFeatured && (
                        <Badge variant="secondary" className="ml-1 text-xs">
                          <Star className="w-2.5 h-2.5 mr-1" />Featured
                        </Badge>
                      )}
                    </span>
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
              );
            })}
          </tbody>
        </table>
      </div>
      {/* Detail panel */}
      {selectedJobId !== null && (
        <JobAnalyticsDetailPanel
          jobId={selectedJobId}
          onClose={() => setSelectedJobId(null)}
        />
      )}
      <p className="text-xs text-muted-foreground">Click any row to expand detailed analytics, applicants, and charts.</p>
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

// ─── Employer Onboarding ─────────────────────────────────────────────────────

const INDUSTRY_OPTIONS = [
  "Retail & Hospitality",
  "Food & Beverage",
  "Health & Wellness",
  "Education & Tutoring",
  "Technology & IT",
  "Construction & Trades",
  "Administration & Office",
  "Marketing & Media",
  "Sport & Recreation",
  "Community & Not-for-Profit",
  "Other",
];

function EmployerOnboarding({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    businessName: "",
    abn: "",
    contactEmail: "",
    contactPhone: "",
    industry: "",
    postcode: "",
    isGstRegistered: false,
    visibleToSchools: true,
    acceptsWorkExperience: false,
  });

  const upsert = trpc.employer.profile.upsert.useMutation({
    onSuccess: () => {
      toast.success("Profile set up! Welcome to JutJut.");
      onComplete();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = () => {
    if (!form.businessName.trim()) {
      toast.error("Business name is required.");
      return;
    }
    upsert.mutate({
      businessName: form.businessName.trim(),
      abn: form.abn || null,
      contactEmail: form.contactEmail || null,
      contactPhone: form.contactPhone || null,
      industry: form.industry || null,
      postcode: form.postcode || null,
      isGstRegistered: form.isGstRegistered,
      visibleToSchools: form.visibleToSchools,
      acceptsWorkExperience: form.acceptsWorkExperience,
    });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full space-y-6">
        {/* Progress */}
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${
                  step > s
                    ? "bg-primary border-primary text-primary-foreground"
                    : step === s
                    ? "border-primary text-primary bg-primary/10"
                    : "border-muted-foreground/30 text-muted-foreground"
                }`}
              >
                {step > s ? <CheckCircle2 className="w-4 h-4" /> : s}
              </div>
              {s < 3 && <div className={`flex-1 h-0.5 w-12 ${step > s ? "bg-primary" : "bg-muted-foreground/20"}`} />}
            </div>
          ))}
          <span className="ml-2 text-sm text-muted-foreground">
            {step === 1 ? "Business details" : step === 2 ? "Contact & location" : "Preferences"}
          </span>
        </div>

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              {step === 1 ? "Tell us about your business" : step === 2 ? "Contact & location" : "Hiring preferences"}
            </CardTitle>
            <CardDescription>
              {step === 1
                ? "This information appears on your employer profile visible to students."
                : step === 2
                ? "How students and schools can reach you."
                : "Control how your business appears in the JutJut ecosystem."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 1 && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="ob-bname">Business name <span className="text-destructive">*</span></Label>
                  <Input
                    id="ob-bname"
                    placeholder="e.g. Sunrise Café"
                    value={form.businessName}
                    onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ob-abn">ABN <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Input
                    id="ob-abn"
                    placeholder="12 345 678 901"
                    value={form.abn}
                    onChange={(e) => setForm((f) => ({ ...f, abn: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ob-industry">Industry</Label>
                  <Select value={form.industry} onValueChange={(v) => setForm((f) => ({ ...f, industry: v }))}>
                    <SelectTrigger id="ob-industry">
                      <SelectValue placeholder="Select your industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRY_OPTIONS.map((o) => (
                        <SelectItem key={o} value={o}>{o}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <Switch
                    id="ob-gst"
                    checked={form.isGstRegistered}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, isGstRegistered: v }))}
                  />
                  <Label htmlFor="ob-gst" className="cursor-pointer">
                    Registered for GST
                    <span className="block text-xs text-muted-foreground font-normal">Affects how credits are invoiced</span>
                  </Label>
                </div>
              </>
            )}
            {step === 2 && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="ob-email">Contact email</Label>
                  <Input
                    id="ob-email"
                    type="email"
                    placeholder="hiring@yourbusiness.com.au"
                    value={form.contactEmail}
                    onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ob-phone">Contact phone</Label>
                  <Input
                    id="ob-phone"
                    type="tel"
                    placeholder="04xx xxx xxx"
                    value={form.contactPhone}
                    onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ob-postcode">Postcode</Label>
                  <Input
                    id="ob-postcode"
                    placeholder="3000"
                    maxLength={4}
                    value={form.postcode}
                    onChange={(e) => setForm((f) => ({ ...f, postcode: e.target.value }))}
                  />
                </div>
              </>
            )}
            {step === 3 && (
              <>
                <div className="flex items-center gap-3">
                  <Switch
                    id="ob-schools"
                    checked={form.visibleToSchools}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, visibleToSchools: v }))}
                  />
                  <Label htmlFor="ob-schools" className="cursor-pointer">
                    Visible to schools
                    <span className="block text-xs text-muted-foreground font-normal">Schools can see your business in their employer directory</span>
                  </Label>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    id="ob-wex"
                    checked={form.acceptsWorkExperience}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, acceptsWorkExperience: v }))}
                  />
                  <Label htmlFor="ob-wex" className="cursor-pointer">
                    Accept work experience students
                    <span className="block text-xs text-muted-foreground font-normal">Schools can arrange placements with your business</span>
                  </Label>
                </div>
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">You're almost ready!</p>
                  <p>After setup you'll be able to post jobs, buy credits, and track applicant analytics from your dashboard.</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep((s) => s - 1)} className="flex-1">
              Back
            </Button>
          )}
          {step < 3 ? (
            <Button
              onClick={() => {
                if (step === 1 && !form.businessName.trim()) {
                  toast.error("Business name is required.");
                  return;
                }
                setStep((s) => s + 1);
              }}
              className="flex-1"
            >
              Continue
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={upsert.isPending} className="flex-1">
              {upsert.isPending ? "Setting up..." : "Complete Setup"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Account Settings Tab ─────────────────────────────────────────────────────

function AccountSettingsTab() {
  const { data: profile, refetch } = trpc.employer.profile.get.useQuery();
  const [form, setForm] = useState({
    businessName: "",
    abn: "",
    contactEmail: "",
    contactPhone: "",
    industry: "",
    postcode: "",
    isGstRegistered: false,
    visibleToSchools: true,
    acceptsWorkExperience: false,
  });
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        businessName: profile.businessName ?? "",
        abn: profile.abn ?? "",
        contactEmail: profile.contactEmail ?? "",
        contactPhone: profile.contactPhone ?? "",
        industry: profile.industry ?? "",
        postcode: profile.postcode ?? "",
        isGstRegistered: profile.isGstRegistered ?? false,
        visibleToSchools: profile.visibleToSchools ?? true,
        acceptsWorkExperience: profile.acceptsWorkExperience ?? false,
      });
    }
  }, [profile]);

  const upsert = trpc.employer.profile.upsert.useMutation({
    onSuccess: () => {
      toast.success("Settings saved.");
      setDirty(false);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const update = (patch: Partial<typeof form>) => {
    setForm((f) => ({ ...f, ...patch }));
    setDirty(true);
  };

  const handleSave = () => {
    if (!form.businessName.trim()) {
      toast.error("Business name is required.");
      return;
    }
    upsert.mutate({
      businessName: form.businessName.trim(),
      abn: form.abn || null,
      contactEmail: form.contactEmail || null,
      contactPhone: form.contactPhone || null,
      industry: form.industry || null,
      postcode: form.postcode || null,
      isGstRegistered: form.isGstRegistered,
      visibleToSchools: form.visibleToSchools,
      acceptsWorkExperience: form.acceptsWorkExperience,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="w-4 h-4 text-primary" />
            Business Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="s-bname">Business name <span className="text-destructive">*</span></Label>
              <Input id="s-bname" value={form.businessName} onChange={(e) => update({ businessName: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-abn">ABN</Label>
              <Input id="s-abn" placeholder="12 345 678 901" value={form.abn} onChange={(e) => update({ abn: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="s-industry">Industry</Label>
              <Select value={form.industry} onValueChange={(v) => update({ industry: v })}>
                <SelectTrigger id="s-industry"><SelectValue placeholder="Select industry" /></SelectTrigger>
                <SelectContent>
                  {INDUSTRY_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-postcode">Postcode</Label>
              <Input id="s-postcode" placeholder="3000" maxLength={4} value={form.postcode} onChange={(e) => update({ postcode: e.target.value })} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch id="s-gst" checked={form.isGstRegistered} onCheckedChange={(v) => update({ isGstRegistered: v })} />
            <Label htmlFor="s-gst" className="cursor-pointer">Registered for GST</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Phone className="w-4 h-4 text-primary" />
            Contact Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="s-email">Contact email</Label>
              <Input id="s-email" type="email" value={form.contactEmail} onChange={(e) => update({ contactEmail: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-phone">Contact phone</Label>
              <Input id="s-phone" type="tel" value={form.contactPhone} onChange={(e) => update({ contactPhone: e.target.value })} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="w-4 h-4 text-primary" />
            School Visibility
          </CardTitle>
          <CardDescription>Control how your business appears to schools and students</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch id="s-schools" checked={form.visibleToSchools} onCheckedChange={(v) => update({ visibleToSchools: v })} />
            <Label htmlFor="s-schools" className="cursor-pointer">
              Visible to schools
              <span className="block text-xs text-muted-foreground font-normal">Schools can see your business in their employer directory</span>
            </Label>
          </div>
          <div className="flex items-center gap-3">
            <Switch id="s-wex" checked={form.acceptsWorkExperience} onCheckedChange={(v) => update({ acceptsWorkExperience: v })} />
            <Label htmlFor="s-wex" className="cursor-pointer">
              Accept work experience students
              <span className="block text-xs text-muted-foreground font-normal">Schools can arrange placements with your business</span>
            </Label>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={!dirty || upsert.isPending} className="gap-2">
          {upsert.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}

// ─── Main EmployerDashboard ───────────────────────────────────────────────────

export default function EmployerDashboard() {
  const { user, loading, isAuthenticated } = useAuth();
  const [buyCreditsOpen, setBuyCreditsOpen] = useState(false);
  const [postJobOpen, setPostJobOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "settings">("overview");

  const { data: profile, isLoading: profileLoading } = trpc.employer.profile.get.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  if (loading || (isAuthenticated && profileLoading)) {
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

  // First-time employer: no profile record yet → show onboarding
  if (!profile) {
    return <EmployerOnboarding onComplete={() => window.location.reload()} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{profile.businessName}</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Employer Dashboard</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={activeTab === "settings" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab(activeTab === "settings" ? "overview" : "settings")}
              className="gap-2"
            >
              <Settings className="w-4 h-4" />
              {activeTab === "settings" ? "Back to Dashboard" : "Account Settings"}
            </Button>
            {activeTab === "overview" && (
              <Button onClick={() => setPostJobOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Post a Job
              </Button>
            )}
          </div>
        </div>

        {activeTab === "settings" ? (
          <AccountSettingsTab />
        ) : (
          <>
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
          </>
        )}
      </div>

      <BuyCreditsModal open={buyCreditsOpen} onClose={() => setBuyCreditsOpen(false)} />
      <PostJobModal open={postJobOpen} onClose={() => setPostJobOpen(false)} />
    </div>
  );
}
