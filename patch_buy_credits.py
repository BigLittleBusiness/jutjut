"""
Patch EmployerDashboard.tsx to replace the BuyCreditsModal with a gateway-aware version
that conditionally renders Stripe Elements or PinPayments token input.
"""

with open('/home/ubuntu/stepone-prototype/client/src/pages/EmployerDashboard.tsx', 'r') as f:
    content = f.read()

# Find the BuyCreditsModal section boundaries
start_marker = "// ─── Buy Credits Modal ────────────────────────────────────────────────────────"
end_marker = "// ─── Post Job Modal ───────────────────────────────────────────────────────────"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print(f"ERROR: Could not find markers. start={start_idx}, end={end_idx}")
    exit(1)

new_modal = '''// ─── Buy Credits Modal ────────────────────────────────────────────────────────

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

'''

new_content = content[:start_idx] + new_modal + content[end_idx:]

with open('/home/ubuntu/stepone-prototype/client/src/pages/EmployerDashboard.tsx', 'w') as f:
    f.write(new_content)

print("Done. BuyCreditsModal replaced.")
