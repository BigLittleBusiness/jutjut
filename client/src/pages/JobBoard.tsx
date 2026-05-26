import React, { useState } from "react";
import { useApp, Job } from "@/contexts/AppContext";

export const JobBoard: React.FC = () => {
  const { jobs, applyToJob, simplifyJobs } = useApp();
  
  // Filter states
  const [distance, setDistance] = useState<number>(5);
  const [timing, setTiming] = useState<string[]>([]);
  const [minWage, setWage] = useState<number>(15);
  const [noCoverLetterOnly, setNoCoverLetter] = useState<boolean>(false);
  const [neuroFriendlyOnly, setNeuroFriendly] = useState<boolean>(false);

  // Selected job for apply modal
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  // Handle Timing Checkbox Changes
  const handleTimingChange = (time: string) => {
    setTiming(prev =>
      prev.includes(time) ? prev.filter(t => t !== time) : [...prev, time]
    );
  };

  // Filter Jobs logic
  const filteredJobs = jobs.filter((job) => {
    // Distance check (Remote jobs have radius 0)
    if (job.radius > distance && job.radius !== 0) return false;
    
    // Wage check
    if (job.wage < minWage) return false;
    
    // Timing check
    if (timing.length > 0 && !timing.includes(job.timing)) return false;
    
    // No cover letter badge check
    if (noCoverLetterOnly && !job.noCoverLetter) return false;
    
    // Neurodiverse friendly check
    if (neuroFriendlyOnly && !job.neuroFriendly) return false;

    return true;
  });

  const handleApplyClick = (job: Job) => {
    setSelectedJob(job);
  };

  const handleConfirmApply = () => {
    if (selectedJob) {
      applyToJob(selectedJob.id);
      setSelectedJob(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* Left Column: Job Board Filters */}
      <div className="lg:col-span-3 space-y-6">
        <div className="brutal-card brutal-shadow bg-card">
          <h3 className="text-md font-extrabold uppercase tracking-wider mb-4 flex items-center gap-2">
            <i className="fa-solid fa-filter text-primary"></i> Filters
          </h3>

          <div className="space-y-6">
            {/* Distance Radius Slider */}
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider mb-1 flex justify-between">
                <span>Distance Radius</span>
                <span className="text-primary font-black">{distance} km</span>
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={distance}
                onChange={(e) => setDistance(Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary border-2 border-border"
              />
              <span className="text-[10px] text-muted-foreground mt-1 block">Includes remote roles (0km)</span>
            </div>

            {/* Minimum Wage Slider */}
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider mb-1 flex justify-between">
                <span>Minimum Wage</span>
                <span className="text-primary font-black">${minWage}/hr</span>
              </label>
              <input
                type="range"
                min="15"
                max="30"
                value={minWage}
                onChange={(e) => setWage(Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary border-2 border-border"
              />
            </div>

            {/* Time of Day / Timing checkboxes */}
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider mb-2">
                Time of Day
              </label>
              <div className="space-y-2">
                {["evenings", "weekends", "flexible"].map((time) => (
                  <label key={time} className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={timing.includes(time)}
                      onChange={() => handleTimingChange(time)}
                      className="h-4 w-4 rounded brutal-border bg-background text-primary accent-primary cursor-pointer"
                    />
                    <span className="capitalize">{time}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Special Badges checkboxes */}
            <div className="border-t border-border pt-4 space-y-3">
              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={noCoverLetterOnly}
                  onChange={(e) => setNoCoverLetter(e.target.checked)}
                  className="h-4 w-4 rounded brutal-border bg-background text-primary accent-primary cursor-pointer"
                />
                <span className="flex items-center gap-1">
                  ⚡ No Cover Letter Required
                </span>
              </label>

              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={neuroFriendlyOnly}
                  onChange={(e) => setNeuroFriendly(e.target.checked)}
                  className="h-4 w-4 rounded brutal-border bg-background text-primary accent-primary cursor-pointer"
                />
                <span className="flex items-center gap-1 text-primary">
                  🧠 Neurodiverse-friendly
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Job List */}
      <div className="lg:col-span-9 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-black">
            Available Jobs ({filteredJobs.length})
          </h2>
          {simplifyJobs && (
            <span className="bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full brutal-border flex items-center gap-1.5">
              <i className="fa-solid fa-circle-check"></i> Plain-Language Descriptions Enabled
            </span>
          )}
        </div>

        {filteredJobs.length === 0 ? (
          <div className="brutal-card bg-card text-center py-12">
            <div className="text-4xl mb-3">🔍</div>
            <h3 className="text-lg font-black">No jobs match your filters</h3>
            <p className="text-xs text-muted-foreground mt-1">Try expanding your distance radius or reducing minimum wage requirements.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredJobs.map((job) => (
              <div key={job.id} className="brutal-card brutal-shadow bg-card hover:translate-y-[-2px] transition-transform">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-start gap-4">
                    {/* Mock Logo */}
                    <div className="h-12 w-12 rounded-xl brutal-border bg-primary/10 text-primary flex items-center justify-center text-2xl shrink-0">
                      {job.logo}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-extrabold">{job.title}</h3>
                        {job.noCoverLetter && (
                          <span className="bg-secondary/20 text-secondary-foreground text-[10px] font-extrabold px-2 py-0.5 rounded border border-secondary uppercase">
                            No Cover Letter
                          </span>
                        )}
                        {job.neuroFriendly && (
                          <span className="bg-primary/10 text-primary text-[10px] font-extrabold px-2 py-0.5 rounded border border-primary uppercase">
                            🧠 Neurodiverse-friendly
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-muted-foreground mt-0.5">{job.company} • {job.location}</p>
                    </div>
                  </div>

                  {/* Wage & Action */}
                  <div className="text-left sm:text-right shrink-0">
                    <p className="text-lg font-black text-primary">${job.wage}/hr</p>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider capitalize mt-0.5">{job.timing}</p>
                  </div>
                </div>

                {/* Job Description (Simple or Normal based on setting) */}
                <div className="mt-4 p-3 bg-background rounded-lg border-2 border-border text-xs font-semibold text-muted-foreground leading-relaxed">
                  {simplifyJobs ? (
                    <div>
                      <p className="text-foreground font-bold mb-1">💡 Simplified Description:</p>
                      <p>{job.simplifiedDescription}</p>
                    </div>
                  ) : (
                    <p>{job.description}</p>
                  )}
                </div>

                {/* Apply Actions */}
                <div className="mt-4 flex justify-between items-center">
                  <span className="text-[10px] text-muted-foreground font-bold">
                    💡 Verified credentials from "My Kit" will be attached.
                  </span>
                  <button
                    onClick={() => handleApplyClick(job)}
                    className="brutal-btn bg-primary text-primary-foreground text-xs py-2 px-4"
                  >
                    Apply with One-Click
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Apply Confirmation Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md brutal-card brutal-shadow bg-card relative">
            <button
              onClick={() => setSelectedJob(null)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
            
            <div className="text-center mb-6">
              <div className="h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-3xl mx-auto mb-3 brutal-border">
                {selectedJob.logo}
              </div>
              <h3 className="text-xl font-black">Confirm One-Click Apply</h3>
              <p className="text-xs text-muted-foreground mt-1">Applying to <span className="font-bold text-foreground">{selectedJob.company}</span></p>
            </div>

            <div className="bg-muted p-4 rounded-lg border-2 border-border text-xs space-y-3 mb-6">
              <p className="font-extrabold text-foreground border-b border-border pb-1">💼 Included in Your Application:</p>
              <div className="space-y-1 font-semibold text-muted-foreground">
                <p className="flex items-center gap-2 text-foreground">
                  <i className="fa-solid fa-circle-check text-emerald-500"></i> Verified Student Status
                </p>
                <p className="flex items-center gap-2 text-foreground">
                  <i className="fa-solid fa-circle-check text-emerald-500"></i> Sports Achievement (Basketball Coach Vouch)
                </p>
                <p className="flex items-center gap-2 text-muted-foreground">
                  <i className="fa-solid fa-circle-xmark text-muted-foreground"></i> High School Report Card (Unverified)
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setSelectedJob(null)}
                className="flex-1 brutal-btn bg-card text-foreground py-2 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmApply}
                className="flex-1 brutal-btn bg-primary text-primary-foreground py-2 text-xs"
              >
                Send My Kit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
