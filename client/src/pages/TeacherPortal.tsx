import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

export const TeacherPortal: React.FC = () => {
  const { user, isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");

  const { data: pending = [], refetch: refetchPending, isLoading: loadingPending } =
    trpc.teacher.vouches.pending.useQuery(undefined, { enabled: isAuthenticated });

  const { data: history = [], isLoading: loadingHistory } =
    trpc.teacher.vouches.history.useQuery(undefined, { enabled: isAuthenticated && activeTab === "history" });

  const approveVouch = trpc.teacher.vouches.approve.useMutation({
    onSuccess: () => { toast.success("Vouch approved!"); refetchPending(); },
    onError: (err) => toast.error(err.message ?? "Failed to approve vouch."),
  });

  const declineVouch = trpc.teacher.vouches.decline.useMutation({
    onSuccess: () => { toast.success("Vouch declined."); refetchPending(); },
    onError: (err) => toast.error(err.message ?? "Failed to decline vouch."),
  });

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <div className="animate-pulse space-y-4 max-w-xl mx-auto">
          <div className="h-8 bg-muted rounded w-1/2 mx-auto" />
          <div className="h-4 bg-muted rounded w-3/4 mx-auto" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-md mx-auto brutal-card brutal-shadow">
          <div className="text-5xl mb-4">🎓</div>
          <h1 className="text-2xl font-black mb-2">Teacher &amp; Coach Portal</h1>
          <p className="text-muted-foreground mb-6 text-sm">
            Sign in to review and approve vouch requests from your students.
          </p>
          <a
            href={getLoginUrl()}
            className="brutal-btn bg-primary text-primary-foreground px-6 py-2 inline-block"
          >
            Sign in to continue
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black">Teacher &amp; Coach Portal</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Signed in as <strong>{user?.name ?? user?.openId}</strong>. Review vouch requests sent to your email address.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(["pending", "history"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`brutal-btn text-sm px-4 py-1.5 capitalize ${
              activeTab === tab
                ? "bg-primary text-primary-foreground"
                : "bg-background text-foreground border-border"
            }`}
          >
            {tab === "pending" ? `Pending${pending.length > 0 ? ` (${pending.length})` : ""}` : "History"}
          </button>
        ))}
      </div>

      {/* Pending Vouches */}
      {activeTab === "pending" && (
        <div className="space-y-4">
          {loadingPending && (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="brutal-card animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                  <div className="h-3 bg-muted rounded w-2/3 mb-4" />
                  <div className="flex gap-2">
                    <div className="h-8 bg-muted rounded w-20" />
                    <div className="h-8 bg-muted rounded w-20" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loadingPending && pending.length === 0 && (
            <div className="brutal-card text-center py-12">
              <div className="text-4xl mb-3">✅</div>
              <p className="font-bold text-lg">All caught up!</p>
              <p className="text-muted-foreground text-sm mt-1">
                No pending vouch requests for your email address.
              </p>
            </div>
          )}

          {!loadingPending && pending.map((vouch) => (
            <div key={vouch.id} className="brutal-card brutal-shadow bg-card">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-black text-sm">{vouch.studentName ?? "A student"}</span>
                    <span className="text-xs text-muted-foreground">is requesting a vouch from you</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary rounded-full px-3 py-0.5 text-xs font-bold mb-2">
                    <i className="fa-solid fa-star text-[10px]"></i>
                    {vouch.skill}
                  </div>
                  {vouch.message && (
                    <p className="text-sm text-muted-foreground italic border-l-2 border-primary/30 pl-3 mt-2">
                      "{vouch.message}"
                    </p>
                  )}
                  <p className="text-[11px] text-muted-foreground mt-2">
                    Requested {new Date(vouch.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    disabled={approveVouch.isPending || declineVouch.isPending}
                    onClick={() => approveVouch.mutate({ vouchId: vouch.id })}
                    className="brutal-btn bg-green-500 text-white text-xs px-4 py-1.5 disabled:opacity-50"
                  >
                    <i className="fa-solid fa-check mr-1"></i> Approve
                  </button>
                  <button
                    disabled={approveVouch.isPending || declineVouch.isPending}
                    onClick={() => declineVouch.mutate({ vouchId: vouch.id })}
                    className="brutal-btn bg-background text-foreground border-border text-xs px-4 py-1.5 disabled:opacity-50"
                  >
                    <i className="fa-solid fa-xmark mr-1"></i> Decline
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* History */}
      {activeTab === "history" && (
        <div className="space-y-4">
          {loadingHistory && (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="brutal-card animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </div>
              ))}
            </div>
          )}

          {!loadingHistory && history.length === 0 && (
            <div className="brutal-card text-center py-12">
              <div className="text-4xl mb-3">📋</div>
              <p className="font-bold text-lg">No vouch history yet</p>
              <p className="text-muted-foreground text-sm mt-1">
                Vouches you have approved or declined will appear here.
              </p>
            </div>
          )}

          {!loadingHistory && history.map((vouch) => (
            <div key={vouch.id} className="brutal-card bg-card flex items-center justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-black text-sm">{vouch.studentName ?? "A student"}</span>
                  <span className="text-xs text-muted-foreground">—</span>
                  <span className="text-xs font-bold text-primary">{vouch.skill}</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {new Date(vouch.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
              <span className={`text-xs font-black px-3 py-1 rounded-full border-2 ${
                vouch.status === "verified"
                  ? "bg-green-100 text-green-700 border-green-400 dark:bg-green-900/30 dark:text-green-400"
                  : vouch.status === "rejected"
                  ? "bg-red-100 text-red-700 border-red-400 dark:bg-red-900/30 dark:text-red-400"
                  : "bg-muted text-muted-foreground border-border"
              }`}>
                {vouch.status === "verified" ? "✓ Approved" : vouch.status === "rejected" ? "✗ Declined" : "Pending"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeacherPortal;
