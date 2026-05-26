import React, { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { toast } from "sonner";

export const TheDrop: React.FC = () => {
  const { drops, claimDrop, createDrop } = useApp();
  const [viewMode, setViewMode] = useState<"student" | "business">("student");

  // Form states for business dashboard
  const [dropTitle, setDropTitle] = useState("");
  const [dropOffer, setDropOffer] = useState("");
  const [dropCode, setDropCode] = useState("");
  const [dropDate, setDropDate] = useState("");

  const handleCreateDropSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dropTitle || !dropOffer || !dropCode || !dropDate) {
      toast.error("Please fill in all fields to submit a drop proposal.");
      return;
    }

    // Verify 2-week lead time check
    const selectedDate = new Date(dropDate);
    const twoWeeksFromNow = new Date();
    twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);

    if (selectedDate < twoWeeksFromNow) {
      toast.warning("Warning: Selected date is less than the required 2-week lead time. Our team will review this expedited request.");
    }

    createDrop({
      title: dropTitle,
      offer: dropOffer,
      code: dropCode,
      date: dropDate
    });

    setDropTitle("");
    setDropOffer("");
    setDropCode("");
    setDropDate("");
  };

  const activeDrops = drops.filter(d => d.isActive);
  const upcomingDrops = drops.filter(d => !d.isActive && d.countdown.includes("Starts"));
  const pastDrops = drops.filter(d => !d.isActive && !d.countdown.includes("Starts"));

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl space-y-8">
      
      {/* View Toggle */}
      <div className="flex justify-center">
        <div className="brutal-border rounded-xl p-1 bg-card flex gap-1.5 brutal-shadow">
          <button
            onClick={() => setViewMode("student")}
            className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${
              viewMode === "student"
                ? "bg-primary text-primary-foreground brutal-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <i className="fa-solid fa-graduation-cap"></i> Student Perks
          </button>
          <button
            onClick={() => setViewMode("business")}
            className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${
              viewMode === "business"
                ? "bg-secondary text-secondary-foreground brutal-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <i className="fa-solid fa-briefcase"></i> Business Partner Hub
          </button>
        </div>
      </div>

      {viewMode === "student" ? (
        // STUDENT PERKS VIEW
        <div className="space-y-8">
          {/* Active Prominent Drop */}
          <div className="brutal-card bg-gradient-to-br from-amber-500/10 to-amber-500/20 border-amber-500 brutal-shadow-amber p-6 rounded-2xl flex flex-col md:flex-row items-center gap-6">
            <div className="w-full md:w-1/3 shrink-0">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310419663031090894/jZSR8X26xXSKh5UB6X9gHJ/drop-illustration-YtzgCTqBRVLFQUTt3n7PQD.webp"
                alt="Active Drop Burrito"
                className="w-full h-auto rounded-xl brutal-border object-cover aspect-square"
              />
            </div>
            <div className="flex-1 space-y-4 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2">
                <span className="bg-secondary text-secondary-foreground text-xs font-black px-3 py-1 rounded-full brutal-border uppercase tracking-wider">
                  Live Drop
                </span>
                <span className="bg-destructive text-destructive-foreground text-xs font-bold px-2.5 py-0.5 rounded-full brutal-border flex items-center gap-1">
                  <i className="fa-solid fa-clock"></i> 14h 25m left
                </span>
              </div>
              <h2 className="text-3xl font-black">Chipotle Burrito Feast</h2>
              <p className="text-sm font-semibold text-muted-foreground">
                Claim 50% off any burrito at Chipotle. Verified StepOne students get one redemption per week. Simply claim, get your unique code, and show it at checkout.
              </p>

              {activeDrops[0]?.isClaimed ? (
                <div className="p-4 bg-emerald-500/10 border-2 border-emerald-500 rounded-lg max-w-sm mx-auto md:mx-0">
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold uppercase">Claimed Successfully</p>
                  <p className="text-2xl font-black text-foreground mt-1">CODE: STEP50</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Show this code at store checkout to redeem.</p>
                </div>
              ) : (
                <button
                  onClick={() => claimDrop(activeDrops[0]?.id || "drop-1")}
                  className="brutal-btn bg-secondary text-secondary-foreground text-sm py-2.5 px-6"
                >
                  ⚡ Claim My Burrito Discount
                </button>
              )}
            </div>
          </div>

          {/* Upcoming Teasers */}
          <div className="space-y-4">
            <h3 className="text-xl font-black">Upcoming Drops</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcomingDrops.map((drop) => (
                <div key={drop.id} className="brutal-card brutal-shadow bg-card flex justify-between items-center gap-4">
                  <div>
                    <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded border border-primary uppercase">
                      Teaser
                    </span>
                    <h4 className="text-md font-extrabold mt-1.5">{drop.title}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{drop.offer}</p>
                  </div>
                  <span className="bg-muted text-muted-foreground text-xs font-extrabold px-3 py-1.5 rounded-lg border-2 border-border text-center shrink-0">
                    {drop.countdown}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Past Drops List */}
          <div className="space-y-4">
            <h3 className="text-xl font-black">Past Drops</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pastDrops.map((drop) => (
                <div key={drop.id} className="brutal-card brutal-shadow bg-card opacity-70 flex flex-col justify-between h-full">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="bg-muted text-muted-foreground text-[10px] font-bold px-2 py-0.5 rounded border border-border uppercase">
                        Expired
                      </span>
                      <span className="text-[10px] text-muted-foreground font-bold">{drop.date}</span>
                    </div>
                    <h4 className="text-sm font-extrabold">{drop.title}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{drop.offer}</p>
                  </div>
                  <div className="border-t border-border mt-4 pt-3 flex justify-between items-center text-[10px] font-bold text-muted-foreground">
                    <span>Used {drop.redemptionCount} times</span>
                    <span className="text-emerald-600 dark:text-emerald-400">Verified Partner</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        // BUSINESS PARTNER HUB VIEW
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Create Drop Form */}
          <div className="lg:col-span-5 space-y-6">
            <div className="brutal-card brutal-shadow-amber bg-card">
              <h3 className="text-lg font-black mb-4">Create A Weekly Drop</h3>
              
              <div className="bg-amber-500/10 border-2 border-amber-500 rounded-lg p-3 text-xs text-amber-700 dark:text-amber-400 font-semibold mb-4 flex items-start gap-2">
                <i className="fa-solid fa-triangle-exclamation mt-0.5"></i>
                <span>Notice: All drops require a 2-week lead time for student verification sync and approval.</span>
              </div>

              <form onSubmit={handleCreateDropSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-extrabold uppercase mb-1">Brand/Partner Name</label>
                  <input
                    type="text"
                    placeholder="e.g., Chipotle"
                    value={dropTitle}
                    onChange={(e) => setDropTitle(e.target.value)}
                    className="w-full p-3 brutal-border rounded-lg bg-background text-foreground font-semibold text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold uppercase mb-1">Offer Details</label>
                  <input
                    type="text"
                    placeholder="e.g., 50% off burrito"
                    value={dropOffer}
                    onChange={(e) => setDropOffer(e.target.value)}
                    className="w-full p-3 brutal-border rounded-lg bg-background text-foreground font-semibold text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold uppercase mb-1">Promo Code</label>
                  <input
                    type="text"
                    placeholder="e.g., CHIPOTLE50"
                    value={dropCode}
                    onChange={(e) => setDropCode(e.target.value)}
                    className="w-full p-3 brutal-border rounded-lg bg-background text-foreground font-semibold text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold uppercase mb-1">Launch Date</label>
                  <input
                    type="date"
                    value={dropDate}
                    onChange={(e) => setDropDate(e.target.value)}
                    className="w-full p-3 brutal-border rounded-lg bg-background text-foreground font-semibold text-sm focus:outline-none"
                  />
                </div>
                <button type="submit" className="w-full brutal-btn bg-secondary text-secondary-foreground py-2.5 text-sm font-bold">
                  Submit Drop Proposal
                </button>
              </form>
            </div>
          </div>

          {/* Business Dashboard Analytics & Calendar */}
          <div className="lg:col-span-7 space-y-6">
            {/* Calendar View */}
            <div className="brutal-card brutal-shadow bg-card">
              <h3 className="text-md font-extrabold uppercase tracking-wider mb-4 flex items-center gap-2">
                <i className="fa-solid fa-calendar-days text-primary"></i> Drop Calendar & Analytics
              </h3>
              
              <div className="grid grid-cols-7 gap-1 text-center font-bold text-[10px] text-muted-foreground border-b border-border pb-2">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
                  <span key={d}>{d}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold mt-2">
                {Array.from({ length: 28 }).map((_, i) => {
                  const day = i + 1;
                  const isDropDay = day === 2 || day === 16;
                  return (
                    <div
                      key={i}
                      className={`aspect-square flex flex-col items-center justify-center rounded border-2 border-transparent ${
                        isDropDay
                          ? "bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400"
                          : "hover:bg-accent text-muted-foreground"
                      }`}
                    >
                      <span>{day}</span>
                      {isDropDay && <span className="h-1.5 w-1.5 bg-amber-500 rounded-full mt-0.5"></span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Read-Only Demo Analytics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="brutal-card brutal-shadow bg-card p-4 text-center">
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Total Redemptions</p>
                <p className="text-3xl font-black text-primary mt-1">2,715</p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                  <i className="fa-solid fa-arrow-trend-up"></i> +15% vs last week
                </p>
              </div>
              <div className="brutal-card brutal-shadow bg-card p-4 text-center">
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Student Reach</p>
                <p className="text-3xl font-black text-secondary mt-1">12,450</p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                  <i className="fa-solid fa-circle-check"></i> 100% verified emails
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
