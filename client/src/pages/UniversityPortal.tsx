import React, { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { toast } from "sonner";

export const UniversityPortal: React.FC = () => {
  const { userProfile, setUserProfile } = useApp();
  const [viewMode, setViewMode] = useState<"student" | "uni">("student");
  const [selectedUni, setSelectedUni] = useState("");
  const [transcriptUploaded, setTranscriptUploaded] = useState(false);

  // Simulated submissions
  const [submissions, setSubmissions] = useState([
    { id: "sub-1", student: "Alex Mercer", school: "West High School", items: ["State Basketball Achievement (Coach Vouch)", "Google Analytics Cert"], status: "Under Review", date: "May 25, 2026" },
    { id: "sub-2", student: "Sarah Lin", school: "Downtown High", items: ["English Essay Portfolio", "Starbucks Interview Record"], status: "Conditional Offer", date: "May 22, 2026" }
  ]);

  const handleSendToUniversity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUni) {
      toast.error("Please select a university to share your Kit with.");
      return;
    }

    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1500)),
      {
        loading: `Securing and transmitting portfolio to ${selectedUni}...`,
        success: () => {
          // Add submission to mock list
          setSubmissions(prev => [
            {
              id: `sub-${Date.now()}`,
              student: userProfile.name,
              school: userProfile.school,
              items: ["State Basketball Achievement (Coach Vouch)", "Google Analytics Cert"],
              status: "Under Review",
              date: "Today"
            },
            ...prev
          ]);
          return `Successfully shared your verified Kit with ${selectedUni}!`;
        },
        error: "Transmission failed."
      }
    );
  };

  const handleTranscriptUpload = () => {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1200)),
      {
        loading: "Encrypting and uploading transcript to conditional offer locker...",
        success: () => {
          setTranscriptUploaded(true);
          return "Transcript uploaded successfully! Offer locker updated.";
        },
        error: "Upload failed."
      }
    );
  };

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
            <i className="fa-solid fa-graduation-cap"></i> Student Portal
          </button>
          <button
            onClick={() => setViewMode("uni")}
            className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${
              viewMode === "uni"
                ? "bg-secondary text-secondary-foreground brutal-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <i className="fa-solid fa-building-columns"></i> Admissions Dashboard
          </button>
        </div>
      </div>

      {viewMode === "student" ? (
        // STUDENT PORTAL VIEW
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Share Kit Form */}
          <div className="lg:col-span-5 space-y-6">
            <div className="brutal-card brutal-shadow bg-card">
              <h3 className="text-lg font-black mb-4">Share Verified Items</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Select a university partner to securely share your verified achievements, sports vouches, credentials, and academic records.
              </p>

              <div className="p-3 bg-primary/10 border-2 border-primary rounded-lg text-xs font-semibold mb-4 space-y-2">
                <p className="font-extrabold text-foreground">📦 Items ready to share:</p>
                <ul className="space-y-1 text-muted-foreground list-disc list-inside">
                  <li>State Basketball Championship (Verified)</li>
                  <li>Google Analytics Certification (Connected)</li>
                  <li>West High School Enrollment (Verified)</li>
                </ul>
              </div>

              <form onSubmit={handleSendToUniversity} className="space-y-4">
                <div>
                  <label className="block text-xs font-extrabold uppercase mb-1">Target University</label>
                  <select
                    value={selectedUni}
                    onChange={(e) => setSelectedUni(e.target.value)}
                    className="w-full p-3 brutal-border rounded-lg bg-background text-foreground font-semibold text-sm focus:outline-none"
                  >
                    <option value="">-- Choose University --</option>
                    <option value="McMaster University">McMaster University</option>
                    <option value="University of Toronto">University of Toronto</option>
                    <option value="Waterloo University">University of Waterloo</option>
                    <option value="Western University">Western University</option>
                  </select>
                </div>

                <button type="submit" className="w-full brutal-btn bg-primary text-primary-foreground py-2.5 text-sm font-bold">
                  Send to University
                </button>
              </form>
            </div>
          </div>

          {/* Conditional Offer Locker */}
          <div className="lg:col-span-7 space-y-6">
            <div className="brutal-card brutal-shadow-amber bg-card">
              <h3 className="text-lg font-black mb-3">Conditional Offer Locker</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Have you received a conditional offer? Upload your final verified high school transcript here. It will automatically lock into your university file for final clearance.
              </p>

              <div className="p-4 bg-background border-2 border-dashed border-border rounded-xl text-center space-y-3">
                <div className="text-3xl">🔒</div>
                {transcriptUploaded ? (
                  <div className="p-3 bg-emerald-500/10 border-2 border-emerald-500 rounded-lg text-emerald-700 dark:text-emerald-400 font-bold text-xs inline-block">
                    <i className="fa-solid fa-circle-check"></i> Final Transcript Uploaded & Locked
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-extrabold">Drag & drop final transcripts here</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">PDF format only • Max 10MB</p>
                    <button
                      onClick={handleTranscriptUpload}
                      className="mt-3 brutal-btn bg-secondary text-secondary-foreground text-xs py-1.5 px-4"
                    >
                      Choose PDF File
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-muted p-3 rounded-lg border-2 border-border text-xs text-muted-foreground mt-4">
                <p className="font-bold text-foreground mb-1">ℹ️ JutJut Security Guarantee:</p>
                <p>All university transmissions are secured with peer-to-peer verification keys. No third-party data tracking. Completely free for students.</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // UNIVERSITY ADMISSIONS VIEW (SIMULATED)
        <div className="space-y-6">
          <div className="brutal-card bg-primary text-primary-foreground brutal-shadow p-6 rounded-2xl">
            <h2 className="text-2xl font-black">University Admissions Portal</h2>
            <p className="text-sm font-semibold opacity-90 mt-1">
              Welcome to the JutJut Admissions Hub. Below is the active queue of student portfolios shared directly with your institution.
            </p>
          </div>

          <div className="brutal-card brutal-shadow bg-card">
            <h3 className="text-md font-extrabold uppercase tracking-wider mb-4">
              Student Submissions Queue
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-border text-xs font-extrabold uppercase text-muted-foreground">
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">School</th>
                    <th className="py-3 px-4">Verified Items</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y border-b border-border text-xs font-semibold">
                  {submissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-accent/50 transition-colors">
                      <td className="py-3 px-4 font-extrabold">{sub.student}</td>
                      <td className="py-3 px-4 text-muted-foreground">{sub.school}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1">
                          {sub.items.map((item, idx) => (
                            <span key={idx} className="text-[10px] text-primary font-bold">
                              • {item}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase ${
                          sub.status === "Conditional Offer"
                            ? "bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400"
                            : "bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400"
                        }`}>
                          {sub.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => toast.info(`Viewing encrypted portfolio file for ${sub.student}.`)}
                          className="text-xs font-extrabold text-primary hover:underline flex items-center gap-1"
                        >
                          View Portfolio <i className="fa-solid fa-up-right-from-square text-[10px]"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
