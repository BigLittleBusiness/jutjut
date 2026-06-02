/**
 * NotificationBell — in-app notification bell for the Navbar.
 * Polls unread count every 60 s. Clicking opens a dropdown of recent notifications.
 * Each notification can be marked read individually or all at once.
 */

import React, { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";

interface NotificationBellProps {
  /** Called when user clicks a notification with a link — e.g. navigate to a page */
  onNavigate?: (page: string) => void;
}

const TYPE_ICONS: Record<string, string> = {
  job_post:          "💼",
  application:       "📩",
  credit_purchase:   "💳",
  school_approved:   "🏫",
  school_rejected:   "❌",
  placement:         "📋",
  drop:              "⚡",
  admin:             "🔑",
  system:            "🔔",
};

function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const secs = Math.floor((Date.now() - d.getTime()) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export default function NotificationBell({ onNavigate }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  // Unread count — refetches every 60 s
  const { data: countData } = trpc.notifications.unreadCount.useQuery(undefined, {
    refetchInterval: 60_000,
  });
  const unread = (typeof countData === "number" ? countData : 0);

  // Full list — only fetched when dropdown is opened
  const { data: listData, isLoading } = trpc.notifications.list.useQuery(
    { limit: 30 },
    { enabled: open }
  );
  const notifications = listData ?? [];

  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      utils.notifications.unreadCount.invalidate();
      utils.notifications.list.invalidate();
    },
  });

  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      utils.notifications.unreadCount.invalidate();
      utils.notifications.list.invalidate();
    },
  });

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(p => !p)}
        className="relative flex items-center justify-center w-9 h-9 rounded-full hover:bg-accent transition-colors"
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5 text-foreground"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 leading-none"
            aria-hidden="true"
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 top-11 z-50 w-80 max-h-[480px] flex flex-col rounded-xl border border-border bg-card shadow-lg overflow-hidden"
          style={{ animation: "fadeSlideDown 180ms cubic-bezier(0.23,1,0.32,1) both" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <span className="font-semibold text-sm">Notifications</span>
            {unread > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="text-xs text-primary hover:underline"
                disabled={markAllRead.isPending}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1">
            {isLoading && (
              <div className="flex items-center justify-center py-10 text-muted-foreground text-sm">
                Loading…
              </div>
            )}
            {!isLoading && notifications.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                <span className="text-3xl">🔔</span>
                <span className="text-sm">No notifications yet.</span>
              </div>
            )}
            {!isLoading && notifications.map((n: any) => (
              <button
                key={n.id}
                onClick={() => {
                  if (!n.read) markRead.mutate({ id: n.id });
                  if (n.link && onNavigate) onNavigate(n.link);
                  setOpen(false);
                }}
                className={`w-full text-left flex gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-accent/50 transition-colors ${!n.read ? "bg-primary/5" : ""}`}
              >
                <span className="text-xl shrink-0 mt-0.5">
                  {TYPE_ICONS[n.type] ?? "🔔"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-snug ${!n.read ? "font-semibold" : ""}`}>
                    {n.title}
                  </p>
                  {n.body && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">{timeAgo(n.createdAt)}</p>
                </div>
                {!n.read && (
                  <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" aria-hidden="true" />
                )}
              </button>
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-border shrink-0 text-center">
            <span className="text-xs text-muted-foreground">
              Showing last {notifications.length} notification{notifications.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
