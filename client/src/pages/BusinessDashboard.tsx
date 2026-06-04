/**
 * Business Dashboard — Drop Retailer Analytics
 *
 * Provides Drop retailers with:
 * - Summary table of all their drops (impressions, claims, claim rate, cost-per-claim)
 * - Expandable detail panel per drop with:
 *   - KPI cards (impressions, claims, claim rate, cost/impression, cost/claim)
 *   - Claims over time (line chart)
 *   - Breakdown by school (bar chart)
 *   - Breakdown by year level (bar chart)
 *   - Breakdown by postcode (table)
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart2, ChevronDown, ChevronRight, Eye, TrendingUp, DollarSign, Percent,
  School, MapPin, GraduationCap, Calendar
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid
} from "recharts";

// ─── Drop Analytics Detail Panel ─────────────────────────────────────────────

function DropAnalyticsDetailPanel({ dropId, onClose }: { dropId: number; onClose: () => void }) {
  const { data, isLoading } = trpc.business.drops.analytics.useQuery({ dropId });

  if (isLoading) {
    return (
      <div className="p-5 space-y-3 border border-border rounded-xl bg-card/50">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-5 bg-muted animate-pulse rounded" />)}
      </div>
    );
  }
  if (!data) return null;

  const { drop, metrics, breakdowns } = data;

  const kpis = [
    { label: "Impressions", value: drop.impressions.toLocaleString(), icon: <Eye className="w-3.5 h-3.5" /> },
    { label: "Claims", value: drop.claims.toLocaleString(), icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { label: "Claim Rate", value: `${metrics.claim_rate}%`, icon: <Percent className="w-3.5 h-3.5" /> },
    { label: "Cost / Impression", value: `$${metrics.cost_per_impression.toFixed(2)}`, icon: <DollarSign className="w-3.5 h-3.5" /> },
    { label: "Cost / Claim", value: `$${metrics.cost_per_claim.toFixed(2)}`, icon: <DollarSign className="w-3.5 h-3.5" /> },
    { label: "Spend", value: `$${(drop.sponsorship_fee / 100).toFixed(2)}`, icon: <DollarSign className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="border border-primary/30 rounded-xl bg-primary/5 p-5 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-bold text-base">{drop.offer_title}</h3>
          {drop.scheduled_date && (
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Scheduled {new Date(drop.scheduled_date).toLocaleDateString("en-AU")}
            </p>
          )}
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1">
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {kpis.map(kpi => (
          <div key={kpi.label} className="bg-background rounded-lg p-3 border border-border">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              {kpi.icon}
              <span className="text-xs">{kpi.label}</span>
            </div>
            <p className="text-xl font-bold tabular-nums">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Charts row: claims over time + school breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {breakdowns.claims_over_time.length > 0 && (
          <div>
            <p className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Claims Over Time</p>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart
                data={breakdowns.claims_over_time.map(p => ({
                  label: `${p.date.slice(5)} ${String(p.hour).padStart(2, "0")}:00`,
                  count: p.count,
                }))}
                margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ fontSize: 11, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                  formatter={(v: number) => [v, "Claims"]}
                />
                <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {breakdowns.by_school.length > 0 && (
          <div>
            <p className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <School className="w-3 h-3" /> By School
            </p>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={breakdowns.by_school.slice(0, 6)} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis type="category" dataKey="school_name" tick={{ fontSize: 9 }} width={90} />
                <Tooltip
                  contentStyle={{ fontSize: 11, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                  formatter={(v: number) => [v, "Claims"]}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Year level + postcode row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {breakdowns.by_year_level.length > 0 && (
          <div>
            <p className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <GraduationCap className="w-3 h-3" /> By Year Level
            </p>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={breakdowns.by_year_level} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis type="category" dataKey="year" tick={{ fontSize: 9 }} width={80} />
                <Tooltip
                  contentStyle={{ fontSize: 11, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                  formatter={(v: number) => [v, "Claims"]}
                />
                <Bar dataKey="count" fill="hsl(var(--chart-2, var(--primary)))" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {breakdowns.by_postcode.length > 0 && (
          <div>
            <p className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <MapPin className="w-3 h-3" /> By Postcode
            </p>
            <div className="space-y-1 max-h-[140px] overflow-y-auto pr-1">
              {breakdowns.by_postcode.slice(0, 10).map(p => (
                <div key={p.postcode} className="flex items-center justify-between text-xs">
                  <span className="font-mono text-muted-foreground">{p.postcode}</span>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 bg-primary/60 rounded-full"
                      style={{ width: `${Math.max(20, (p.count / breakdowns.by_postcode[0].count) * 80)}px` }}
                    />
                    <span className="tabular-nums w-6 text-right">{p.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function BusinessDashboard() {
  const { isAuthenticated, loading } = useAuth();
  const [selectedDropId, setSelectedDropId] = useState<number | null>(null);
  const { data: summary, isLoading } = trpc.business.drops.analyticsSummary.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  if (loading) {
    return (
      <div className="container mx-auto py-12 text-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto py-12 text-center">
        <p className="mb-4 text-muted-foreground">Sign in to view your Drop analytics.</p>
        <Button asChild>
          <a href={getLoginUrl()}>Sign In</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Drop Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">
          See how your Drops are performing — impressions, claims, and student reach.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart2 className="w-4 h-4" />
            Your Drops
          </CardTitle>
          <CardDescription>Click any row to expand detailed analytics and breakdowns.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-8 bg-muted animate-pulse rounded" />)}
            </div>
          ) : !summary || summary.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <BarChart2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No drops yet. Contact JutJut to schedule your first Drop.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-2 pr-4 font-medium">Offer</th>
                      <th className="text-right py-2 px-3 font-medium">Impressions</th>
                      <th className="text-right py-2 px-3 font-medium">Claims</th>
                      <th className="text-right py-2 px-3 font-medium">Claim Rate</th>
                      <th className="text-right py-2 px-3 font-medium">Cost/Claim</th>
                      <th className="text-right py-2 px-3 font-medium">Status</th>
                      <th className="text-right py-2 pl-3 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.map(d => {
                      const isExpanded = selectedDropId === d.id;
                      return (
                        <tr
                          key={d.id}
                          className={`border-b border-border/50 cursor-pointer transition-colors ${
                            isExpanded ? "bg-primary/5" : "hover:bg-muted/30"
                          }`}
                          onClick={() => setSelectedDropId(isExpanded ? null : d.id)}
                        >
                          <td className="py-2.5 pr-4 font-medium">
                            <span className="flex items-center gap-1.5">
                              {isExpanded
                                ? <ChevronDown className="w-3.5 h-3.5 text-primary shrink-0" />
                                : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              }
                              {d.title}
                            </span>
                          </td>
                          <td className="text-right py-2.5 px-3 tabular-nums">{d.impressions.toLocaleString()}</td>
                          <td className="text-right py-2.5 px-3 tabular-nums">{d.claims.toLocaleString()}</td>
                          <td className="text-right py-2.5 px-3 tabular-nums">{d.claimRate}%</td>
                          <td className="text-right py-2.5 px-3 tabular-nums">
                            {d.costPerClaim > 0 ? `$${d.costPerClaim.toFixed(2)}` : "—"}
                          </td>
                          <td className="text-right py-2.5 px-3">
                            <Badge variant={d.status === "active" ? "default" : "secondary"}>
                              {d.status}
                            </Badge>
                          </td>
                          <td className="text-right py-2.5 pl-3 text-muted-foreground">
                            {d.scheduledDate
                              ? new Date(d.scheduledDate).toLocaleDateString("en-AU")
                              : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Detail panel */}
              {selectedDropId !== null && (
                <DropAnalyticsDetailPanel
                  dropId={selectedDropId}
                  onClose={() => setSelectedDropId(null)}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
