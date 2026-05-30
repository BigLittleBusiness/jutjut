import React, { useState, useRef, useEffect } from "react";
import { useApp } from "@/contexts/AppContext";
import { toast } from "sonner";

export const YourWay: React.FC = () => {
  const {
    quietMode, setQuietMode,
    taskBreakdown, setTaskBreakdown,
    simplifyJobs, setSimplifyJobs
  } = useApp();

  // Profile Form breakdown states (Demo of Task Breakdown)
  const [currentStep, setCurrentStep] = useState(1);
  const [profileName, setProfileName] = useState("Alex Mercer");
  const [profileBio, setProfileBio] = useState("Basketball captain and aspiring software engineer.");
  const [profileGoal, setProfileGoal] = useState("part-time");

  // AI Chat Prep state
  const [aiMessages, setAiMessages] = useState([
    { id: "ai-1", sender: "ai", text: "Hey! Let's practice some common interview questions. There is absolutely no pressure here—take your time. Ready? Tell me about yourself!" }
  ]);
  const [userChatText, setUserChatText] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // University Disclosure Helper states
  const [disclosureStep, setDisclosureStep] = useState(1);
  const [disclosureType, setDisclosureType] = useState("");
  const [disclosureSupport, setDisclosureTypeSupport] = useState("");
  const [generatedStatement, setGeneratedStatement] = useState("");

  const handleAiChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userChatText.trim()) return;

    const userMsg = { id: `user-${Date.now()}`, sender: "user", text: userChatText };
    setAiMessages(prev => [...prev, userMsg]);
    setUserChatText("");

    // Simulate AI response
    setTimeout(() => {
      let aiText = "That's a fantastic start! Remember, employers love to hear about specific times you solved a problem. What's a project or achievement you are most proud of?";
      if (userChatText.toLowerCase().includes("proud") || userChatText.toLowerCase().includes("achievement")) {
        aiText = "Incredible! Mentioning your sports leadership and verified vouches really demonstrates reliability. Next question: How do you handle stressful situations at work or school?";
      }
      setAiMessages(prev => [...prev, { id: `ai-${Date.now()}`, sender: "ai", text: aiText }]);
    }, 1000);
  };

  const handleGenerateDisclosure = (e: React.FormEvent) => {
    e.preventDefault();
    if (!disclosureType || !disclosureSupport) {
      toast.error("Please fill in the disclosure helper fields.");
      return;
    }

    const statement = `Dear Admissions Committee, I am writing to share that I thrive best in environments with ${disclosureSupport}. Having ${disclosureType}, I have developed strong skills in focus and systematic organization. I look forward to contributing these strengths to your campus community while utilizing corresponding support structures.`;
    setGeneratedStatement(statement);
    setDisclosureStep(3);
    toast.success("Disclosure statement generated!");
  };

  const handleCopyDisclosure = () => {
    navigator.clipboard.writeText(generatedStatement);
    toast.success("Statement copied to clipboard!");
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages]);

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl space-y-8">
      
      {/* Page Header */}
      <div className="brutal-card bg-gradient-to-r from-teal-500/10 to-amber-500/10 border-primary brutal-shadow p-6 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="space-y-2 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <h2 className="text-3xl font-black">Your Way</h2>
            <span className="bg-primary text-primary-foreground text-xs font-bold px-2.5 py-0.5 rounded-full brutal-border">
              Accessibility
            </span>
          </div>
          <p className="text-sm font-semibold text-muted-foreground">
            Customize JutJut to match your learning and working style. Toggle cognitive aids, practice interviews, or generate university disclosure letters.
          </p>
        </div>
        <div className="w-24 h-24 shrink-0 hidden md:block">
          <img
            src="https://d2xsxph8kpxj0f.cloudfront.net/310419663031090894/jZSR8X26xXSKh5UB6X9gHJ/yourway-illustration-NKJjAk4H3YH8J4qFiLiRXe.webp"
            alt="Your Way Brain Illustration"
            className="w-full h-auto rounded-xl brutal-border object-cover aspect-square"
          />
        </div>
      </div>

      {/* Grid: Accessibility Toggles & Cognitive Demos */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Accessibility Toggles */}
        <div className="lg:col-span-4 space-y-6">
          <div className="brutal-card brutal-shadow bg-card">
            <h3 className="text-md font-extrabold uppercase tracking-wider mb-4 flex items-center gap-2">
              <i className="fa-solid fa-sliders text-primary"></i> Interface Settings
            </h3>
            
            <div className="space-y-4">
              {/* Quiet Mode Toggle */}
              <div className="flex items-start justify-between gap-4 p-3 bg-background rounded-lg border-2 border-border">
                <div>
                  <p className="text-xs font-extrabold">Quiet Mode</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Removes animations, motion, and visual distractions.</p>
                </div>
                <button
                  onClick={() => setQuietMode(!quietMode)}
                  className={`h-6 w-11 rounded-full border-2 border-border transition-colors relative shrink-0 ${
                    quietMode ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-card border border-border transition-transform ${
                    quietMode ? "translate-x-5" : ""
                  }`}></span>
                </button>
              </div>

              {/* Task Breakdown Toggle */}
              <div className="flex items-start justify-between gap-4 p-3 bg-background rounded-lg border-2 border-border">
                <div>
                  <p className="text-xs font-extrabold">Task Breakdown</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Breaks down long forms into bite-sized steps.</p>
                </div>
                <button
                  onClick={() => setTaskBreakdown(!taskBreakdown)}
                  className={`h-6 w-11 rounded-full border-2 border-border transition-colors relative shrink-0 ${
                    taskBreakdown ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-card border border-border transition-transform ${
                    taskBreakdown ? "translate-x-5" : ""
                  }`}></span>
                </button>
              </div>

              {/* Simplify Job Descriptions */}
              <div className="flex items-start justify-between gap-4 p-3 bg-background rounded-lg border-2 border-border">
                <div>
                  <p className="text-xs font-extrabold">Simplify Job Boards</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Rewrites complex job descriptions into plain language.</p>
                </div>
                <button
                  onClick={() => setSimplifyJobs(!simplifyJobs)}
                  className={`h-6 w-11 rounded-full border-2 border-border transition-colors relative shrink-0 ${
                    simplifyJobs ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-card border border-border transition-transform ${
                    simplifyJobs ? "translate-x-5" : ""
                  }`}></span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Demo of Task Breakdown */}
        <div className="lg:col-span-8 space-y-6">
          <div className="brutal-card brutal-shadow bg-card">
            <h3 className="text-md font-extrabold uppercase tracking-wider mb-2 flex items-center gap-2">
              <i className="fa-solid fa-list-check text-secondary"></i> Form Breakdown Demo
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Toggle the "Task Breakdown" switch on the left to see how we automatically chunk complex profile completion forms.
            </p>

            {taskBreakdown ? (
              /* STEPPED FORM VIEW */
              <div className="space-y-4">
                {/* Step indicators */}
                <div className="flex items-center gap-2 mb-4">
                  {[1, 2, 3].map((step) => (
                    <div key={step} className="flex items-center gap-2">
                      <span className={`h-6 w-6 rounded-full border-2 border-border flex items-center justify-center text-xs font-bold ${
                        currentStep === step
                          ? "bg-primary text-primary-foreground"
                          : currentStep > step
                          ? "bg-emerald-500 text-white"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {currentStep > step ? <i className="fa-solid fa-check"></i> : step}
                      </span>
                      {step < 3 && <span className="h-0.5 w-8 bg-border"></span>}
                    </div>
                  ))}
                </div>

                <div className="p-4 bg-background border-2 border-border rounded-lg min-h-[120px]">
                  {currentStep === 1 && (
                    <div className="space-y-2">
                      <label className="block text-xs font-extrabold uppercase">Step 1: Your Profile Name</label>
                      <input
                        type="text"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        className="w-full p-2.5 brutal-border rounded bg-card text-xs font-semibold"
                      />
                    </div>
                  )}
                  {currentStep === 2 && (
                    <div className="space-y-2">
                      <label className="block text-xs font-extrabold uppercase">Step 2: Short Bio / Strengths</label>
                      <textarea
                        value={profileBio}
                        onChange={(e) => setProfileBio(e.target.value)}
                        className="w-full p-2.5 brutal-border rounded bg-card text-xs font-semibold h-16 resize-none"
                      />
                    </div>
                  )}
                  {currentStep === 3 && (
                    <div className="space-y-2">
                      <label className="block text-xs font-extrabold uppercase">Step 3: Primary Career Goal</label>
                      <select
                        value={profileGoal}
                        onChange={(e) => setProfileGoal(e.target.value)}
                        className="w-full p-2.5 brutal-border rounded bg-card text-xs font-semibold"
                      >
                        <option value="part-time">Part-Time Student Job</option>
                        <option value="internship">Summer Internship</option>
                        <option value="university">University Placement</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="flex justify-between">
                  <button
                    onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
                    disabled={currentStep === 1}
                    className="brutal-btn bg-card text-foreground text-xs py-1 px-3 disabled:opacity-50"
                  >
                    Back
                  </button>
                  {currentStep < 3 ? (
                    <button
                      onClick={() => setCurrentStep(prev => prev + 1)}
                      className="brutal-btn bg-primary text-primary-foreground text-xs py-1 px-3"
                    >
                      Next Step
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        toast.success("Profile demo completed!");
                        setCurrentStep(1);
                      }}
                      className="brutal-btn bg-secondary text-secondary-foreground text-xs py-1 px-3"
                    >
                      Submit Profile
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* STANDARD FLAT FORM VIEW */
              <form onSubmit={(e) => { e.preventDefault(); toast.success("Profile demo completed!"); }} className="space-y-4 p-4 bg-background border-2 border-border rounded-lg">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-extrabold uppercase mb-1">Profile Name</label>
                    <input
                      type="text"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="w-full p-2.5 brutal-border rounded bg-card text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold uppercase mb-1">Primary Career Goal</label>
                    <select
                      value={profileGoal}
                      onChange={(e) => setProfileGoal(e.target.value)}
                      className="w-full p-2.5 brutal-border rounded bg-card text-xs font-semibold"
                    >
                      <option value="part-time">Part-Time Student Job</option>
                      <option value="internship">Summer Internship</option>
                      <option value="university">University Placement</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-extrabold uppercase mb-1">Short Bio / Strengths</label>
                  <textarea
                    value={profileBio}
                    onChange={(e) => setProfileBio(e.target.value)}
                    className="w-full p-2.5 brutal-border rounded bg-card text-xs font-semibold h-16 resize-none"
                  />
                </div>
                <button type="submit" className="brutal-btn bg-primary text-primary-foreground text-xs py-2 px-4">
                  Save All Settings
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Grid: AI Interview Prep & University Disclosure Helper */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: AI Chatbot Interview Prep */}
        <div className="lg:col-span-6 space-y-6">
          <div className="brutal-card brutal-shadow bg-card flex flex-col h-[400px]">
            <h3 className="text-md font-extrabold uppercase tracking-wider mb-2 flex items-center gap-2">
              <i className="fa-solid fa-comments text-primary"></i> AI Interview Practice (Low Pressure)
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              Practice answering common interview questions in a stress-free environment.
            </p>

            {/* Chat feed */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-background border-2 border-border rounded-lg mb-3">
              {aiMessages.map((msg) => (
                <div key={msg.id} className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}>
                  <div className={`p-2.5 rounded-lg text-xs max-w-[85%] font-semibold border-2 border-border ${
                    msg.sender === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-none"
                      : "bg-card text-foreground rounded-tl-none"
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Input form */}
            <form onSubmit={handleAiChatSubmit} className="flex gap-2">
              <input
                type="text"
                placeholder="Type your response here..."
                value={userChatText}
                onChange={(e) => setUserChatText(e.target.value)}
                className="flex-1 p-2.5 brutal-border rounded-lg bg-background text-foreground font-semibold text-xs focus:outline-none"
              />
              <button type="submit" className="brutal-btn bg-primary text-primary-foreground py-2 px-4 text-xs">
                Send
              </button>
            </form>
          </div>
        </div>

        {/* Right: University Disclosure Helper */}
        <div className="lg:col-span-6 space-y-6">
          <div className="brutal-card brutal-shadow-amber bg-card flex flex-col h-[400px]">
            <h3 className="text-md font-extrabold uppercase tracking-wider mb-2 flex items-center gap-2">
              <i className="fa-solid fa-pen-nib text-secondary"></i> Uni Disclosure Helper
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Create a personalized, professional disclosure statement to share accommodations or neurodiverse conditions with university partners.
            </p>

            <div className="flex-1 bg-background border-2 border-border rounded-lg p-4 flex flex-col justify-between overflow-y-auto">
              {disclosureStep === 1 && (
                <div className="space-y-4">
                  <p className="text-xs font-extrabold text-foreground">Step 1: Select your accommodation style</p>
                  <div className="space-y-2">
                    {[
                      { key: "adhd", label: "ADHD (Systematic organization & active study blocks)" },
                      { key: "asd", label: "Autism Spectrum (Calm spaces & written structured guidance)" },
                      { key: "dyslexia", label: "Dyslexia (Digital reading aids & oral exams options)" }
                    ].map((item) => (
                      <label key={item.key} className="flex items-center gap-2 text-xs font-semibold cursor-pointer p-2 bg-card border border-border rounded hover:bg-accent">
                        <input
                          type="radio"
                          name="disclosure_type"
                          value={item.label}
                          onChange={(e) => setDisclosureType(e.target.value)}
                          className="h-4 w-4 text-primary accent-primary"
                        />
                        <span>{item.label}</span>
                      </label>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      if (!disclosureType) {
                        toast.error("Please select an option.");
                        return;
                      }
                      setDisclosureStep(2);
                    }}
                    className="w-full brutal-btn bg-primary text-primary-foreground text-xs py-2"
                  >
                    Continue
                  </button>
                </div>
              )}

              {disclosureStep === 2 && (
                <div className="space-y-4">
                  <p className="text-xs font-extrabold text-foreground">Step 2: What support helps you thrive?</p>
                  <div className="space-y-2">
                    {[
                      "Extra time on exam essays",
                      "Quiet study rooms & visual aids",
                      "Recorded audio lectures"
                    ].map((support) => (
                      <label key={support} className="flex items-center gap-2 text-xs font-semibold cursor-pointer p-2 bg-card border border-border rounded hover:bg-accent">
                        <input
                          type="radio"
                          name="disclosure_support"
                          value={support}
                          onChange={(e) => setDisclosureTypeSupport(e.target.value)}
                          className="h-4 w-4 text-primary accent-primary"
                        />
                        <span>{support}</span>
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDisclosureStep(1)}
                      className="flex-1 brutal-btn bg-card text-foreground text-xs py-2"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleGenerateDisclosure}
                      className="flex-1 brutal-btn bg-primary text-primary-foreground text-xs py-2"
                    >
                      Generate Statement
                    </button>
                  </div>
                </div>
              )}

              {disclosureStep === 3 && (
                <div className="space-y-4 flex-1 flex flex-col justify-between">
                  <div className="p-3 bg-card border-2 border-border rounded-lg text-xs leading-relaxed font-semibold italic">
                    "{generatedStatement}"
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setDisclosureStep(1);
                        setDisclosureType("");
                        setDisclosureTypeSupport("");
                        setGeneratedStatement("");
                      }}
                      className="flex-1 brutal-btn bg-card text-foreground text-xs py-2"
                    >
                      Start Over
                    </button>
                    <button
                      onClick={handleCopyDisclosure}
                      className="flex-1 brutal-btn bg-secondary text-secondary-foreground text-xs py-2"
                    >
                      <i className="fa-solid fa-copy"></i> Copy Text
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
