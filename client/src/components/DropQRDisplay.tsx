/**
 * DropQRDisplay — student-facing QR code overlay for The Drop redemption.
 *
 * States:
 *  - loading   — generating token
 *  - active    — QR visible, countdown ticking, polling every 3 s
 *  - expired   — token TTL elapsed, show Refresh button
 *  - redeemed  — staff confirmed, show success screen
 *  - error     — generation or polling failure
 */
import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DropQRDisplayProps {
  dropId: number;
  dropTitle: string;
  open: boolean;
  onClose: () => void;
}

type QRState = "loading" | "active" | "expired" | "redeemed" | "error";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCountdown(ms: number): string {
  if (ms <= 0) return "0:00";
  const totalSec = Math.ceil(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DropQRDisplay({ dropId, dropTitle, open, onClose }: DropQRDisplayProps) {
  const [qrState, setQrState] = useState<QRState>("loading");
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [timeLeftMs, setTimeLeftMs] = useState<number>(0);
  const [redeemedAt, setRedeemedAt] = useState<Date | null>(null);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── tRPC mutations / queries ─────────────────────────────────────────────

  const generateQR = trpc.student.drops.generateQR.useMutation({
    onSuccess: (data) => {
      setToken(data.token);
      const exp = new Date(data.expiresAt);
      setExpiresAt(exp);
      setTimeLeftMs(exp.getTime() - Date.now());
      setQrState("active");
    },
    onError: (err) => {
      toast.error(err.message ?? "Failed to generate QR code.");
      setQrState("error");
    },
  });

  const refreshQR = trpc.student.drops.refreshQR.useMutation({
    onSuccess: (data) => {
      setToken(data.token);
      const exp = new Date(data.expiresAt);
      setExpiresAt(exp);
      setTimeLeftMs(exp.getTime() - Date.now());
      setQrState("active");
    },
    onError: (err) => {
      toast.error(err.message ?? "Failed to refresh QR code.");
      setQrState("error");
    },
  });

  const checkStatus = trpc.student.drops.checkRedemptionStatus.useQuery(
    { token: token ?? "" },
    {
      enabled: !!token && qrState === "active",
      refetchInterval: 3000,
      refetchIntervalInBackground: true,
    }
  );

  // ── React to status polling ───────────────────────────────────────────────

  useEffect(() => {
    if (!checkStatus.data) return;
    const { status } = checkStatus.data;
    if (status === "redeemed") {
      setRedeemedAt((checkStatus.data as { status: "redeemed"; redeemedAt: Date }).redeemedAt);
      setQrState("redeemed");
    } else if (status === "expired") {
      setQrState("expired");
    }
  }, [checkStatus.data]);

  // ── Countdown ticker ─────────────────────────────────────────────────────

  useEffect(() => {
    if (qrState !== "active" || !expiresAt) return;

    countdownIntervalRef.current = setInterval(() => {
      const remaining = expiresAt.getTime() - Date.now();
      if (remaining <= 0) {
        setTimeLeftMs(0);
        setQrState("expired");
        clearInterval(countdownIntervalRef.current!);
      } else {
        setTimeLeftMs(remaining);
      }
    }, 500);

    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [qrState, expiresAt]);

  // ── Generate on open ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!open) {
      // Reset state when closed
      setQrState("loading");
      setToken(null);
      setExpiresAt(null);
      setTimeLeftMs(0);
      setRedeemedAt(null);
      return;
    }
    generateQR.mutate({ dropId });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, dropId]);

  // ── Cleanup on unmount ───────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  // ── Derived values ───────────────────────────────────────────────────────

  const redeemUrl = token ? `${window.location.origin}/api/redeem/${token}` : "";

  const urgencyColour =
    timeLeftMs > 5 * 60 * 1000
      ? "text-emerald-600 dark:text-emerald-400"
      : timeLeftMs > 2 * 60 * 1000
      ? "text-amber-600 dark:text-amber-400"
      : "text-red-600 dark:text-red-400";

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm w-full">
        <DialogHeader>
          <DialogTitle className="text-center text-base font-black">
            {dropTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">

          {/* LOADING */}
          {qrState === "loading" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              <p className="text-sm text-muted-foreground font-semibold">Generating your QR code…</p>
            </div>
          )}

          {/* ACTIVE */}
          {qrState === "active" && token && (
            <>
              <div className="rounded-xl border-4 border-primary p-3 bg-white shadow-md">
                <QRCodeSVG
                  value={redeemUrl}
                  size={200}
                  level="M"
                  includeMargin={false}
                />
              </div>
              <div className={`text-3xl font-black tabular-nums ${urgencyColour}`}>
                {formatCountdown(timeLeftMs)}
              </div>
              <p className="text-xs text-center text-muted-foreground leading-relaxed max-w-[240px]">
                Show this QR code to the staff member at the counter. They will scan it to confirm your redemption.
              </p>
              <p className="text-[10px] text-muted-foreground font-mono break-all text-center opacity-60">
                {redeemUrl}
              </p>
            </>
          )}

          {/* EXPIRED */}
          {qrState === "expired" && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="h-16 w-16 rounded-full bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center text-3xl">
                ⏱
              </div>
              <p className="text-base font-black text-center">QR Code Expired</p>
              <p className="text-sm text-muted-foreground text-center max-w-[240px]">
                Your code has expired. Generate a fresh one to continue.
              </p>
              <button
                onClick={() => refreshQR.mutate({ dropId })}
                disabled={refreshQR.isPending}
                className="w-full rounded-lg bg-primary text-primary-foreground font-bold py-2.5 text-sm transition active:scale-[0.97] disabled:opacity-60"
              >
                {refreshQR.isPending ? "Refreshing…" : "Refresh QR Code"}
              </button>
            </div>
          )}

          {/* REDEEMED */}
          {qrState === "redeemed" && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="h-20 w-20 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center text-4xl">
                ✓
              </div>
              <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 text-center">
                Redeemed!
              </p>
              <p className="text-sm text-muted-foreground text-center max-w-[240px]">
                Your drop has been confirmed by the staff member. Enjoy!
              </p>
              {redeemedAt && (
                <p className="text-[11px] text-muted-foreground font-mono">
                  {new Date(redeemedAt).toLocaleString("en-AU", { timeZone: "Australia/Sydney" })}
                </p>
              )}
              <button
                onClick={onClose}
                className="w-full rounded-lg bg-emerald-600 text-white font-bold py-2.5 text-sm transition active:scale-[0.97]"
              >
                Done
              </button>
            </div>
          )}

          {/* ERROR */}
          {qrState === "error" && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center text-3xl">
                ✗
              </div>
              <p className="text-base font-black text-center">Something went wrong</p>
              <p className="text-sm text-muted-foreground text-center max-w-[240px]">
                Could not generate a QR code. Please try again.
              </p>
              <button
                onClick={() => {
                  setQrState("loading");
                  generateQR.mutate({ dropId });
                }}
                disabled={generateQR.isPending}
                className="w-full rounded-lg bg-primary text-primary-foreground font-bold py-2.5 text-sm transition active:scale-[0.97] disabled:opacity-60"
              >
                {generateQR.isPending ? "Retrying…" : "Try Again"}
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
