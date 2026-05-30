import React, { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { toast } from "sonner";

export const MyKit: React.FC = () => {
  const { userProfile, setUserProfile, selectedKitUser, setSelectedKitUser } = useApp();
  
  // Use selected profile if viewing someone else's Kit, otherwise use own profile
  const profile = selectedKitUser || userProfile;
  const isOwnProfile = !selectedKitUser;
  const [newSportTitle, setNewSportTitle] = useState("");
  const [newSportDetail, setNewSportDetail] = useState("");
  const [requestVouchName, setRequestVouchName] = useState("");
  const [requestVouchRole, setRequestVouchRole] = useState("");
  const [showAddSportModal, setShowAddSportModal] = useState(false);
  const [showRequestVouchModal, setShowRequestVouchModal] = useState(false);

  // Simulated File Uploads
  const [gradeFile, setGradeFile] = useState<File | null>(null);
  const [simulatedGrade, setSimulatedGrade] = useState("");
  const [simulatedGPA, setSimulatedGPA] = useState("");

  const handleReportCardUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setGradeFile(file);

    toast.promise(
      new Promise((resolve) => {
        setTimeout(() => {
          // Simulate AI OCR grading
          const randomGrade = ["A", "A-", "B+", "A+"][Math.floor(Math.random() * 4)];
          const randomGPA = (3.5 + Math.random() * 0.5).toFixed(2);
          resolve({ grade: randomGrade, gpa: randomGPA });
        }, 2000);
      }),
      {
        loading: "JutJut AI: Reading report card transcript & calculating grade average...",
        success: (data: any) => {
          setSimulatedGrade(data.grade);
          setSimulatedGPA(data.gpa);
          setUserProfile(prev => ({ ...prev, gradesVerified: true }));
          return `AI Verification Complete: Grade Average ${data.grade} (GPA: ${data.gpa})!`;
        },
        error: "AI Parsing failed."
      }
    );
  };

  const handleConnectCert = (certName: string) => {
    if (!isOwnProfile) return;
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1200)),
      {
        loading: `Connecting to ${certName} API...`,
        success: () => {
          setUserProfile(prev => ({
            ...prev,
            certs: prev.certs.map(c => c.name === certName ? { ...c, connected: true } : c)
          }));
          return `Successfully connected ${certName}!`;
        },
        error: "Connection failed."
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

    setUserProfile(prev => ({
      ...prev,
      achievements: [
        ...prev.achievements,
        { title: newSportTitle, detail: newSportDetail, verified: false }
      ]
    }));

    setNewSportTitle("");
    setNewSportDetail("");
    setShowAddSportModal(false);
    toast.success("Sport achievement added! You can now request coach verification.");
  };

  const handleRequestVouchSubmit = (e: React.FormEvent) => {
    if (!isOwnProfile) return;
    e.preventDefault();
    if (!requestVouchName || !requestVouchRole) {
      toast.error("Please fill in supervisor name and role.");
      return;
    }

    setUserProfile(prev => ({
      ...prev,
      vouchedBy: [
        ...prev.vouchedBy,
        { name: requestVouchName, role: requestVouchRole, status: "pending" }
      ]
    }));

    setRequestVouchName("");
    setRequestVouchRole("");
    setShowRequestVouchModal(false);
    toast.success(`Verification request sent to ${requestVouchName}!`);
  };

  const handleRequestVouchFromList = (supervisorName: string) => {
    toast.success(`Reminded ${supervisorName} to vouch for your achievements.`);
  };

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
              <h2 className="text-3xl font-black">{isOwnProfile ? "My Kit" : `${profile.name}'s Kit`}</h2>
              <span className="bg-secondary text-secondary-foreground text-xs font-bold px-2.5 py-1 rounded-full brutal-border flex items-center gap-1">
                <i className="fa-solid fa-circle-check text-emerald-600"></i> Verified Student
              </span>
            </div>
            <p className="text-sm font-bold opacity-90 mt-1 uppercase tracking-wider">{profile.school}</p>
            <p className="text-xs opacity-75 mt-0.5">{profile.email}</p>
          </div>
        </div>
        <div className="bg-card text-card-foreground p-3 rounded-xl brutal-border font-bold text-xs text-center min-w-[150px]">
          <p className="text-muted-foreground uppercase text-[10px]">Verification Score</p>
          <p className="text-2xl font-black text-primary mt-1">{isOwnProfile ? "85%" : "95%"}</p>
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
                  <p>Grade Average: <span className="font-black text-emerald-600">{isOwnProfile ? (simulatedGrade || "A-") : "A"}</span></p>
                  <p>GPA: <span className="font-black text-emerald-600">{isOwnProfile ? (simulatedGPA || "3.75") : "3.92"}</span></p>
                  <p className="text-[8px] mt-0.5">Verified via JutJut OCR Subsystem</p>
                </div>
              </div>
            ) : (
              isOwnProfile ? (
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
                  <p className="text-[9px] text-muted-foreground text-center">Supports PDF, PNG, JPG. AI automatically reads and calculates GPA.</p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">Grades not verified yet.</p>
              )
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
              {profile.certs.map((cert, idx) => (
                <div key={idx} className="p-3 bg-background border-2 border-border rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-xs font-extrabold">{cert.name}</p>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase">{cert.issuer}</p>
                  </div>
                  {cert.connected ? (
                    <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1">
                      <i className="fa-solid fa-circle-check"></i> Connected
                    </span>
                  ) : (
                    isOwnProfile ? (
                      <button
                        onClick={() => handleConnectCert(cert.name)}
                        className="brutal-btn bg-secondary text-secondary-foreground text-[10px] py-1 px-2.5"
                      >
                        Connect
                      </button>
                    ) : (
                      <span className="text-muted-foreground text-xs italic">Not Connected</span>
                    )
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
              {profile.achievements.map((ach, idx) => (
                <div key={idx} className="p-4 bg-background border-2 border-border rounded-lg relative overflow-hidden">
                  {ach.verified && (
                    <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[9px] font-bold px-2 py-0.5 border-b-2 border-l-2 border-border rounded-bl-lg uppercase">
                      Verified
                    </div>
                  )}
                  <h4 className="text-sm font-extrabold flex items-center gap-1.5">
                    <span>{ach.title}</span>
                    {ach.verified && <i className="fa-solid fa-circle-check text-emerald-500 text-xs"></i>}
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
                          onClick={() => toast.success("Coach verification request pinged!")}
                          className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                        >
                          Request Coach Vouch <i className="fa-solid fa-chevron-right text-[10px]"></i>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Teacher / Coach Vouch Area */}
          <div className="brutal-card brutal-shadow bg-card">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-md font-extrabold uppercase tracking-wider flex items-center gap-2">
                <i className="fa-solid fa-user-tie text-primary"></i> Supervisor Vouches
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {profile.vouchedBy.map((vouch, idx) => (
                <div key={idx} className="p-3 bg-background border-2 border-border rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-xs font-extrabold">{vouch.name}</p>
                    <p className="text-[10px] text-muted-foreground font-bold">{vouch.role}</p>
                  </div>
                  {vouch.status === "verified" ? (
                    <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold px-2 py-1 rounded-full border border-emerald-500 flex items-center gap-1">
                      <i className="fa-solid fa-check"></i> Vouched
                    </span>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold px-2 py-1 rounded-full border border-amber-500">
                        Pending
                      </span>
                      {isOwnProfile && (
                        <button
                          onClick={() => handleRequestVouchFromList(vouch.name)}
                          className="h-7 w-7 brutal-border rounded bg-card hover:bg-accent flex items-center justify-center text-xs text-muted-foreground hover:text-foreground"
                          title="Ping Reminder"
                        >
                          <i className="fa-solid fa-bell"></i>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
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
                <label className="block text-xs font-extrabold uppercase mb-1">Details & Records</label>
                <textarea
                  placeholder="e.g., won state finals with 12 points scored"
                  value={newSportDetail}
                  onChange={(e) => setNewSportDetail(e.target.value)}
                  className="w-full p-3 brutal-border rounded-lg bg-background text-foreground font-semibold text-sm h-24 focus:outline-none resize-none"
                />
              </div>
              <button type="submit" className="w-full brutal-btn bg-secondary text-secondary-foreground py-2 text-sm font-bold">
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
            <h3 className="text-lg font-black mb-4">Request Supervisor Vouch</h3>
            <form onSubmit={handleRequestVouchSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold uppercase mb-1">Supervisor Name</label>
                <input
                  type="text"
                  placeholder="e.g., Mr. John Smith"
                  value={requestVouchName}
                  onChange={(e) => setRequestVouchName(e.target.value)}
                  className="w-full p-3 brutal-border rounded-lg bg-background text-foreground font-semibold text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-extrabold uppercase mb-1">Role / Relationship</label>
                <input
                  type="text"
                  placeholder="e.g., Science Teacher, Coach"
                  value={requestVouchRole}
                  onChange={(e) => setRequestVouchRole(e.target.value)}
                  className="w-full p-3 brutal-border rounded-lg bg-background text-foreground font-semibold text-sm focus:outline-none"
                />
              </div>
              <button type="submit" className="w-full brutal-btn bg-primary text-primary-foreground py-2 text-sm font-bold">
                Send Request
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
