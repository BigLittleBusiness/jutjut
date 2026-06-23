import React, { useState, useEffect } from "react";
import { useApp } from "@/contexts/AppContext";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

export const MyKit: React.FC = () => {
  const { userProfile, setUserProfile, selectedKitUser, setSelectedKitUser } = useApp();
  const { user } = useAuth();

  // Use selected profile if viewing someone else's Kit, otherwise use own profile
  const profile = selectedKitUser || userProfile;
  const isOwnProfile = !selectedKitUser;

  // ── Achievement state ──────────────────────────────────────────────────────
  const [newSportTitle, setNewSportTitle] = useState("");
  const [newSportDetail, setNewSportDetail] = useState("");
  const [showAddSportModal, setShowAddSportModal] = useState(false);

  // ── Vouch request modal state ──────────────────────────────────────────────
  const [showRequestVouchModal, setShowRequestVouchModal] = useState(false);
  const [voucherName, setVoucherName] = useState("");
  const [voucherTitle, setVoucherTitle] = useState("");
  const [voucherOrg, setVoucherOrg] = useState("");
  const [voucherEmail, setVoucherEmail] = useState("");
  const [skillName, setSkillName] = useState("");

  // ── Simulated file upload state ────────────────────────────────────────────
  const [gradeFile, setGradeFile] = useState<File | null>(null);
  const [simulatedGrade, setSimulatedGrade] = useState("");
  const [simulatedGPA, setSimulatedGPA] = useState("");

  // ── URL-based vouch result (redirected back from /api/verify-vouch or /api/decline-vouch) ──
  const vouchResult = new URLSearchParams(window.location.search).get("vouch");
  useEffect(() => {
    if (vouchResult === "verified") {
      toast.success("Your vouch has been confirmed by your supervisor!");
    } else if (vouchResult === "declined") {
      toast.info("The vouch request was declined by your supervisor.");
    } else if (vouchResult === "expired") {
      toast.error("The vouch link has expired. Please send a new request.");
    } else if (vouchResult === "invalid" || vouchResult === "error") {
      toast.error("Something went wrong with the vouch link.");
    }
    if (vouchResult) {
      const url = new URL(window.location.href);
      url.searchParams.delete("vouch");
      window.history.replaceState({}, "", url.toString());
    }
  }, [vouchResult]);

  // ── tRPC: fetch real vouches ───────────────────────────────────────────────
  const utils = trpc.useUtils();
  const { data: vouchesData, isLoading: vouchesLoading } = trpc.vouches.list.useQuery(
    undefined,
    { enabled: isOwnProfile && !!user }
  );

  const requestVouch = trpc.vouches.request.useMutation({
    onSuccess: () => {
      toast.success(`Verification request sent to ${voucherName}!`);
      utils.vouches.list.invalidate();
      utils.alumni.badgeCounts.invalidate();
      setShowRequestVouchModal(false);
      setVoucherName("");
      setVoucherTitle("");
      setVoucherOrg("");
      setVoucherEmail("");
      setSkillName("");
    },
    onError: (err) => {
      toast.error(err.message ?? "Failed to send vouch request.");
    },
  });

  const deleteVouch = trpc.vouches.delete.useMutation({
    onSuccess: () => {
      toast.success("Vouch request cancelled.");
      utils.vouches.list.invalidate();
      utils.alumni.badgeCounts.invalidate();
    },
    onError: (err) => {
      toast.error(err.message ?? "Failed to cancel vouch.");
    },
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleReportCardUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setGradeFile(file);
    toast.promise(
      new Promise((resolve) => {
        setTimeout(() => {
          const randomGrade = ["A", "A-", "B+", "A+"][Math.floor(Math.random() * 4)];
          const randomGPA = (3.5 + Math.random() * 0.5).toFixed(2);
          resolve({ grade: randomGrade, gpa: randomGPA });
        }, 2000);
      }),
      {
        loading: "Reading your report card…",
        success: (data: any) => {
          setSimulatedGrade(data.grade);
          setSimulatedGPA(data.gpa);
          setUserProfile((prev) => ({ ...prev, gradesVerified: true }));
          return `Grades added! Average: ${data.grade} (GPA: ${data.gpa}). A teacher will verify this shortly.`;
        },
        error: "Could not read the file. Please try a clearer scan.",
      }
    );
  };

  const handleConnectCert = (certName: string) => {
    if (!isOwnProfile) return;
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1200)),
      {
        loading: `Connecting ${certName}…`,
        success: () => {
          setUserProfile((prev) => ({
            ...prev,
            certs: prev.certs.map((c) =>
              c.name === certName ? { ...c, connected: true } : c
            ),
          }));
          return `${certName} connected and added to your Kit!`;
        },
        error: "Connection failed. Please try again.",
      }
    );
  };

  const handleAddSportAchievement = (e: React.FormEvent) => {
    if (!isOwnProfile) return;
    e.preventDefault();
    if (!newSportTitle || !newSportDetail) {
      toast.error("Please fill in all achievement fields.");
      return;
    }
    setUserProfile((prev) => ({
      ...prev,
      achievements: [
        ...prev.achievements,
        { title: newSportTitle, detail: newSportDetail, verified: false },
      ],
    }));
    setNewSportTitle("");
    setNewSportDetail("");
    setShowAddSportModal(false);
    toast.success("Sport achievement added! You can now request coach verification.");
  };

  const handleRequestVouchSubmit = (e: React.FormEvent) => {
    if (!isOwnProfile) return;
    e.preventDefault();
    if (!voucherName || !voucherEmail) {
      toast.error("Please fill in supervisor name and email.");
      return;
    }
    requestVouch.mutate({
      voucherName,
      voucherTitle: voucherTitle || undefined,
      voucherOrg: voucherOrg || undefined,
      voucherEmail,
      skillName: skillName || undefined,
      origin: window.location.origin,
    });
  };

  const handleDeleteVouch = (vouchId: number) => {
    if (!isOwnProfile) return;
    deleteVouch.mutate({ vouchId });
  };

  // Decide which vouch list to render: real data for own profile, mock for others
  const displayVouches = isOwnProfile
    ? (vouchesData ?? [])
    : (profile.vouchedBy ?? []).map((v: any) => ({
        id: 0,
        voucherName: v.name,
        voucherTitle: v.role,
        voucherOrg: null,
        voucherEmail: null,
        skillName: null,
        status: v.status,
        message: null,
      }));

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl space-y-8">
      {/* Back to feed button when viewing someone else's kit */}
      {!isOwnProfile && (
        <button
          onClick={() => setSelectedKitUser(null)}
          className="brutal-btn bg-card text-foreground text-xs py-1.5 px-4 mb-2"
        >
          <i className="fa-solid fa-arrow-left"></i> Back to Home Feed
        </button>
      )}

      {/* Page Header */}
      <div className="brutal-card bg-primary text-primary-foreground brutal-shadow-amber flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4 text-center md:text-left flex-col md:flex-row">
          <img
            src={profile.avatar}
            alt={profile.name}
            className="w-24 h-24 rounded-2xl object-cover brutal-border"
          />
          <div>
            <div className="flex items-center justify-center md:justify-start gap-2">
              <h2 className="text-3xl font-black">
                {isOwnProfile ? "My Kit" : `${profile.name}'s Kit`}
              </h2>
              <span className="bg-secondary text-secondary-foreground text-xs font-bold px-2.5 py-1 rounded-full brutal-border flex items-center gap-1">
                <i className="fa-solid fa-circle-check text-emerald-600"></i> Verified Student
              </span>
            </div>
            <p className="text-sm font-bold opacity-90 mt-1 uppercase tracking-wider">
              {profile.school}
            </p>
            <p className="text-xs opacity-75 mt-0.5">{profile.email}</p>
          </div>
        </div>
        <div className="bg-card text-card-foreground p-3 rounded-xl brutal-border font-bold text-xs text-center min-w-[150px]">
          <p className="text-muted-foreground uppercase text-[10px]">Verification Score</p>
          <p className="text-2xl font-black text-primary mt-1">
            {isOwnProfile ? "85%" : "95%"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Verification Documents & Certs */}
        <div className="md:col-span-1 space-y-6">
          {/* Document Upload Widget */}
          <div className="brutal-card brutal-shadow bg-card">
            <h3 className="text-md font-extrabold uppercase tracking-wider mb-3 flex items-center gap-2">
              <i className="fa-solid fa-file-shield text-primary"></i> Verification
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Upload your official school documents to instantly verify your high school grades.
            </p>

            {profile.gradesVerified ? (
              <div className="p-3 bg-emerald-500/10 border-2 border-emerald-500 rounded-lg text-emerald-700 dark:text-emerald-400 font-bold text-xs flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-circle-check text-lg text-emerald-600"></i>
                  <span>Report Card Verified</span>
                </div>
                <div className="text-[10px] text-muted-foreground mt-1 bg-background p-1.5 rounded border border-emerald-500/30">
                  <p className="font-extrabold text-foreground uppercase">AI Extracted Stats:</p>
                  <p>
                    Grade Average:{" "}
                    <span className="font-black text-emerald-600">
                      {isOwnProfile ? simulatedGrade || "A-" : "A"}
                    </span>
                  </p>
                  <p>
                    GPA:{" "}
                    <span className="font-black text-emerald-600">
                      {isOwnProfile ? simulatedGPA || "3.75" : "3.92"}
                    </span>
                  </p>
                  <p className="text-[8px] mt-0.5">Verified via JutJut OCR Subsystem</p>
                </div>
              </div>
            ) : isOwnProfile ? (
              <div className="space-y-2">
                <label className="w-full brutal-btn bg-primary text-primary-foreground text-xs py-2.5 cursor-pointer flex items-center justify-center gap-2">
                  <i className="fa-solid fa-cloud-arrow-up"></i>
                  <span>Upload Report Card Photo</span>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleReportCardUpload}
                    className="hidden"
                  />
                </label>
                <p className="text-[9px] text-muted-foreground text-center">
                  Supports PDF, PNG, JPG. AI automatically reads and calculates GPA.
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">Grades not verified yet.</p>
            )}
          </div>

          {/* Connected Certifications */}
          <div className="brutal-card brutal-shadow bg-card">
            <h3 className="text-md font-extrabold uppercase tracking-wider mb-3 flex items-center gap-2">
              <i className="fa-solid fa-award text-secondary"></i> Credentials
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Link your third-party credentials to import badges automatically.
            </p>
            <div className="space-y-3">
              {profile.certs.map((cert: any, idx: number) => (
                <div
                  key={idx}
                  className="p-3 bg-background border-2 border-border rounded-lg flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-extrabold">{cert.name}</p>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase">
                      {cert.issuer}
                    </p>
                  </div>
                  {cert.connected ? (
                    <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1">
                      <i className="fa-solid fa-circle-check"></i> Connected
                    </span>
                  ) : isOwnProfile ? (
                    <button
                      onClick={() => handleConnectCert(cert.name)}
                      className="brutal-btn bg-secondary text-secondary-foreground text-[10px] py-1 px-2.5"
                    >
                      Connect
                    </button>
                  ) : (
                    <span className="text-muted-foreground text-xs italic">Not Connected</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Achievements & Vouches */}
        <div className="md:col-span-2 space-y-6">
          {/* Sporting & Achievements Section */}
          <div className="brutal-card brutal-shadow bg-card">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-md font-extrabold uppercase tracking-wider flex items-center gap-2">
                <i className="fa-solid fa-basketball text-secondary"></i> Achievements & Sports
              </h3>
              {isOwnProfile && (
                <button
                  onClick={() => setShowAddSportModal(true)}
                  className="brutal-btn bg-secondary text-secondary-foreground text-xs py-1 px-3"
                >
                  + Add Achievement
                </button>
              )}
            </div>

            <div className="space-y-3">
              {profile.achievements.map((ach: any, idx: number) => (
                <div
                  key={idx}
                  className="p-4 bg-background border-2 border-border rounded-lg relative overflow-hidden"
                >
                  {ach.verified && (
                    <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[9px] font-bold px-2 py-0.5 border-b-2 border-l-2 border-border rounded-bl-lg uppercase">
                      Verified
                    </div>
                  )}
                  <h4 className="text-sm font-extrabold flex items-center gap-1.5">
                    <span>{ach.title}</span>
                    {ach.verified && (
                      <i className="fa-solid fa-circle-check text-emerald-500 text-xs"></i>
                    )}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1 font-semibold">{ach.detail}</p>
                  {ach.verified ? (
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-2">
                      Verified by {ach.verifier}
                    </p>
                  ) : (
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-[10px] text-amber-500 font-bold">Unverified</span>
                      {isOwnProfile && (
                        <button
                          onClick={() => toast.success("Vouch request sent! Your coach will receive an email to verify this achievement.")}
                          className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                        >
                          Request Coach Vouch{" "}
                          <i className="fa-solid fa-chevron-right text-[10px]"></i>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── Supervisor Vouches (real data) ───────────────────────────── */}
          <div className="brutal-card brutal-shadow bg-card">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-md font-extrabold uppercase tracking-wider flex items-center gap-2">
                <i className="fa-solid fa-user-tie text-primary"></i> Supervisor Vouches
                {isOwnProfile && vouchesData && (
                  <span className="text-xs font-bold text-muted-foreground">
                    ({vouchesData.filter((v) => v.status === "verified").length} verified)
                  </span>
                )}
              </h3>
              {isOwnProfile && (
                <button
                  onClick={() => setShowRequestVouchModal(true)}
                  className="brutal-btn bg-primary text-primary-foreground text-xs py-1 px-3"
                >
                  Request Vouch
                </button>
              )}
            </div>

            {isOwnProfile && vouchesLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-16 bg-muted rounded-lg animate-pulse"
                  />
                ))}
              </div>
            ) : displayVouches.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <i className="fa-solid fa-user-tie text-3xl mb-2 opacity-30"></i>
                <p className="text-sm font-semibold">No vouches yet</p>
                {isOwnProfile && (
                  <p className="text-xs mt-1">
                    Request a vouch from a teacher, coach, or supervisor.
                  </p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {displayVouches.map((vouch: any, idx: number) => (
                  <div
                    key={vouch.id || idx}
                    className="p-3 bg-background border-2 border-border rounded-lg"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold truncate">{vouch.voucherName}</p>
                        {vouch.voucherTitle && (
                          <p className="text-[10px] text-muted-foreground font-bold truncate">
                            {vouch.voucherTitle}
                            {vouch.voucherOrg ? ` · ${vouch.voucherOrg}` : ""}
                          </p>
                        )}
                        {vouch.skillName && (
                          <p className="text-[10px] text-primary font-bold mt-0.5 truncate">
                            Re: {vouch.skillName}
                          </p>
                        )}
                        {vouch.message && vouch.status === "verified" && (
                          <p className="text-[10px] text-muted-foreground italic mt-1 line-clamp-2">
                            "{vouch.message}"
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {vouch.status === "verified" ? (
                          <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold px-2 py-1 rounded-full border border-emerald-500 flex items-center gap-1 whitespace-nowrap">
                            <i className="fa-solid fa-check"></i> Vouched
                          </span>
                        ) : vouch.status === "rejected" ? (
                          <span className="bg-red-500/10 text-red-600 dark:text-red-400 text-[10px] font-bold px-2 py-1 rounded-full border border-red-400 whitespace-nowrap">
                            Declined
                          </span>
                        ) : (
                          <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold px-2 py-1 rounded-full border border-amber-500 whitespace-nowrap">
                            Pending
                          </span>
                        )}

                        {isOwnProfile && vouch.status === "pending" && vouch.id > 0 && (
                          <button
                            onClick={() => handleDeleteVouch(vouch.id)}
                            disabled={deleteVouch.isPending}
                            className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                            title="Cancel request"
                          >
                            <i className="fa-solid fa-xmark"></i> Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Achievement Modal */}
      {showAddSportModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md brutal-card brutal-shadow bg-card relative">
            <button
              onClick={() => setShowAddSportModal(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
            <h3 className="text-lg font-black mb-4">Add Achievement</h3>
            <form onSubmit={handleAddSportAchievement} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold uppercase mb-1">Title</label>
                <input
                  type="text"
                  placeholder="e.g., state basketball championship"
                  value={newSportTitle}
                  onChange={(e) => setNewSportTitle(e.target.value)}
                  className="w-full p-3 brutal-border rounded-lg bg-background text-foreground font-semibold text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-extrabold uppercase mb-1">
                  Details & Records
                </label>
                <textarea
                  placeholder="e.g., won state finals with 12 points scored"
                  value={newSportDetail}
                  onChange={(e) => setNewSportDetail(e.target.value)}
                  className="w-full p-3 brutal-border rounded-lg bg-background text-foreground font-semibold text-sm h-24 focus:outline-none resize-none"
                />
              </div>
              <button
                type="submit"
                className="w-full brutal-btn bg-secondary text-secondary-foreground py-2 text-sm font-bold"
              >
                Add Achievement
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Request Vouch Modal */}
      {showRequestVouchModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md brutal-card brutal-shadow bg-card relative">
            <button
              onClick={() => setShowRequestVouchModal(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
            <h3 className="text-lg font-black mb-1">Request Supervisor Vouch</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Your supervisor will receive an email with a link to confirm your vouch. The link
              expires after 7 days.
            </p>
            <form onSubmit={handleRequestVouchSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-extrabold uppercase mb-1">
                  Supervisor Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Mr. John Smith"
                  value={voucherName}
                  onChange={(e) => setVoucherName(e.target.value)}
                  className="w-full p-3 brutal-border rounded-lg bg-background text-foreground font-semibold text-sm focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-extrabold uppercase mb-1">
                  Supervisor Email <span className="text-destructive">*</span>
                </label>
                <input
                  type="email"
                  placeholder="e.g., j.smith@school.edu.au"
                  value={voucherEmail}
                  onChange={(e) => setVoucherEmail(e.target.value)}
                  className="w-full p-3 brutal-border rounded-lg bg-background text-foreground font-semibold text-sm focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-extrabold uppercase mb-1">
                  Role / Title
                </label>
                <input
                  type="text"
                  placeholder="e.g., Science Teacher, Coach"
                  value={voucherTitle}
                  onChange={(e) => setVoucherTitle(e.target.value)}
                  className="w-full p-3 brutal-border rounded-lg bg-background text-foreground font-semibold text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-extrabold uppercase mb-1">
                  Organisation / School
                </label>
                <input
                  type="text"
                  placeholder="e.g., Springfield High School"
                  value={voucherOrg}
                  onChange={(e) => setVoucherOrg(e.target.value)}
                  className="w-full p-3 brutal-border rounded-lg bg-background text-foreground font-semibold text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-extrabold uppercase mb-1">
                  Skill / Achievement Being Vouched
                </label>
                <input
                  type="text"
                  placeholder="e.g., Leadership, Teamwork, Science project"
                  value={skillName}
                  onChange={(e) => setSkillName(e.target.value)}
                  className="w-full p-3 brutal-border rounded-lg bg-background text-foreground font-semibold text-sm focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={requestVouch.isPending}
                className="w-full brutal-btn bg-primary text-primary-foreground py-2 text-sm font-bold disabled:opacity-60"
              >
                {requestVouch.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <i className="fa-solid fa-spinner fa-spin"></i> Sending…
                  </span>
                ) : (
                  "Send Request"
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
