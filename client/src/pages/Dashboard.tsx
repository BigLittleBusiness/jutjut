import React, { useState, useRef, useEffect } from "react";
import { useApp } from "@/contexts/AppContext";
import { toast } from "sonner";

const ANON_PHRASES = [
  "🕵️ Identity hidden! Shhh... keeping it safe and secure on JutJut.",
  "🤫 Stealth mode active. No paper trails here!",
  "🛸 Undercover vibes. Your secret is safe with us!",
  "🕶️ Incognito energy. Just dropping fax, no names.",
  "🦊 Ghost protocol enabled. Now you see me, now you don't!"
];

interface DashboardProps {
  onNavigate: (page: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { conversations, activeChatId, setActiveChatId, sendMessage, userProfile, anonymousAvatarSetting, setAnonymousAvatarSetting, setSelectedKitUser } = useApp();
  const [showAdminSettings, setShowAdminSettings] = useState(false);
  const [activeTooltipIndex, setActiveTooltipIndex] = useState<Record<string, number>>({});

  const handleMouseEnterAnon = (postId: string) => {
    const randomIndex = Math.floor(Math.random() * ANON_PHRASES.length);
    setActiveTooltipIndex(prev => ({ ...prev, [postId]: randomIndex }));
  };
  const [chatOpen, setChatOpen] = useState(false);
  const [newMessageText, setNewMessageText] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Social feed posts mock
  const [posts, setPosts] = useState([
    {
      id: "p1",
      user: { 
        name: "Sarah Lin", 
        avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80", 
        school: "Downtown High",
        isVerified: true,
        email: "sarah.lin@school.edu",
        vouchedBy: [
          { name: "Principal Vance", role: "School Principal", status: "verified" },
          { name: "Coach Harris", role: "Basketball Coach", status: "verified" }
        ],
        achievements: [
          { title: "English Essay Portfolio", detail: "Scored 98% in creative writing essay collection", verified: true, verifier: "Principal Vance" },
          { title: "Volunteer Leadership", detail: "Organized local community clean-up drive", verified: true, verifier: "Principal Vance" }
        ],
        certs: [
          { name: "Starbucks Interview Record", issuer: "Starbucks", connected: true }
        ],
        gradesVerified: true,
        sportsVerified: true,
        clubVerified: true
      },
      type: "achievement",
      content: "Sarah got an interview at Starbucks! ☕",
      meta: "see her Kit",
      time: "2 hours ago",
      likes: 18,
      liked: false,
      comments: [
        { name: "John Doe", text: "Congrats Sarah! That's awesome." }
      ],
      showCommentInput: false,
      newComment: ""
    },
    {
      id: "p2",
      user: { name: "McMaster University Q&A", avatar: "🏫", school: "Official Account" },
      type: "announcement",
      content: "McMaster University Q&A: Engineering – join the live stream this Thursday to ask questions about our verified portfolio admissions!",
      meta: "join",
      time: "4 hours ago",
      likes: 42,
      liked: false,
      comments: [],
      showCommentInput: false,
      newComment: ""
    },
    {
      id: "p3",
      user: { name: "Anonymous Student", avatar: "anon", school: "Year 12 Student" },
      type: "anonymous",
      content: "Am I on track for CS with 80% average? Be honest. I have 3 verified coach vouches and some Google certs, but my math grade took a small hit this term.",
      meta: "anonymous post",
      time: "1 day ago",
      likes: 7,
      liked: false,
      comments: [
        { name: "CS_Senior_26", text: "With verified vouches and certs you're in a great position! Uni admissions look at your full kit now, not just raw math scores." }
      ],
      showCommentInput: false,
      newComment: ""
    },
    {
      id: "p4",
      user: { name: "Teal Mug Specialty Coffee", avatar: "☕", school: "Employer Partner" },
      type: "employer",
      content: "We loved meeting JutJut students at the local career fair! Your verified kits made it incredibly easy to fast-track interviews. Shoutout to the community!",
      meta: "employer shoutout",
      time: "2 days ago",
      likes: 56,
      liked: false,
      comments: [],
      showCommentInput: false,
      newComment: ""
    }
  ]);

  // Squads mock list
  const squads = [
    { name: "My School (West High)", count: 245, icon: "fa-school", id: "sq-1" },
    { name: "CS Majors 2026", count: 89, icon: "fa-code", id: "sq-2" },
    { name: "Downtown Toronto Jobs", count: 154, icon: "fa-map-location-dot", id: "sq-3" }
  ];

  const handleLike = (id: string) => {
    setPosts(prev => prev.map(p => {
      if (p.id === id) {
        return {
          ...p,
          likes: p.liked ? p.likes - 1 : p.likes + 1,
          liked: !p.liked
        };
      }
      return p;
    }));
  };

  // Helper to get anonymous avatar source
  const getAnonymousAvatar = () => {
    switch (anonymousAvatarSetting) {
      case "question":
        return "https://images.unsplash.com/photo-1557683316-973673baf926?w=150&auto=format&fit=crop&q=80"; // A colorful block with a clean look, we'll render a fallback icon on top or use stylized placeholder
      case "fox":
        return "https://images.unsplash.com/photo-1484406566174-9da000fda645?w=150&auto=format&fit=crop&q=80"; // Fox
      case "unicorn":
        return "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=150&auto=format&fit=crop&q=80"; // Tech/Unicorn theme
      case "alien":
        return "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=150&auto=format&fit=crop&q=80"; // Space/Alien theme
      default:
        return "https://images.unsplash.com/photo-1557683316-973673baf926?w=150&auto=format&fit=crop&q=80";
    }
  };

  const handleCommentSubmit = (postId: string, e: React.FormEvent) => {
    e.preventDefault();
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        if (!p.newComment.trim()) return p;
        return {
          ...p,
          comments: [...p.comments, { name: userProfile.name, text: p.newComment }],
          newComment: "",
          showCommentInput: false
        };
      }
      return p;
    }));
    toast.success("Comment posted!");
  };

  const activeChat = conversations.find(c => c.id === activeChatId);

  const handleSendMessageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || !activeChatId) return;
    sendMessage(activeChatId, newMessageText);
    setNewMessageText("");
  };

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages, chatOpen, activeChatId]);

  return (
    <div className="container mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 relative">
      
      {/* Left Sidebar: Quick Profile & Squads */}
      <div className="lg:col-span-3 space-y-6">
        {/* System Admin Settings Toggle */}
        <div className="brutal-card bg-amber-500/10 border-amber-500 brutal-shadow-amber p-4">
          <button
            onClick={() => setShowAdminSettings(!showAdminSettings)}
            className="w-full text-left font-black text-xs uppercase tracking-wider flex items-center justify-between text-amber-700 dark:text-amber-400"
          >
            <span><i className="fa-solid fa-gears"></i> System Admin Settings</span>
            <i className={`fa-solid ${showAdminSettings ? "fa-chevron-up" : "fa-chevron-down"}`}></i>
          </button>
          
          {showAdminSettings && (
            <div className="mt-4 pt-4 border-t border-amber-500/30 space-y-4 text-xs">
              <div>
                <p className="font-extrabold uppercase mb-2 text-foreground">Anonymous Post Avatar</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: "question", label: "🎨 JutJut ?" },
                    { key: "fox", label: "🦊 Fox" },
                    { key: "unicorn", label: "🦄 Unicorn" },
                    { key: "alien", label: "👽 Alien" }
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => {
                        setAnonymousAvatarSetting(opt.key as any);
                        toast.success(`Anonymous avatar changed to ${opt.label}!`);
                      }}
                      className={`p-2 rounded border-2 font-bold text-center transition-all ${
                        anonymousAvatarSetting === opt.key
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border hover:bg-accent text-foreground"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Payment Gateway Credentials ─────────────────── */}
              <div className="pt-3 border-t border-amber-500/30">
                <p className="font-extrabold uppercase mb-1 text-foreground flex items-center gap-1">
                  <i className="fa-solid fa-credit-card text-amber-600"></i> Payment Gateway (PinPayments)
                </p>
                <p className="text-[10px] text-muted-foreground mb-3 leading-relaxed">
                  Add your PinPayments API keys here once your account is approved.
                  Keys are stored as server-side environment variables and are never
                  exposed to the browser. Until configured, the credit purchase flow
                  runs in sandbox / test mode.
                </p>

                <div className="space-y-2">
                  {[
                    {
                      label: "Secret API Key",
                      envVar: "PIN_PAYMENTS_SECRET_KEY",
                      hint: "Starts with sk_live_ (production) or sk_test_ (sandbox)",
                      icon: "fa-key"
                    },
                    {
                      label: "Publishable Key",
                      envVar: "PIN_PAYMENTS_PUBLISHABLE_KEY",
                      hint: "Starts with pk_live_ or pk_test_ — safe to use in the browser",
                      icon: "fa-unlock"
                    },
                    {
                      label: "Webhook Secret",
                      envVar: "PIN_PAYMENTS_WEBHOOK_SECRET",
                      hint: "Set in your PinPayments dashboard when configuring the webhook endpoint",
                      icon: "fa-webhook"
                    },
                    {
                      label: "API Base URL",
                      envVar: "PIN_PAYMENTS_BASE_URL",
                      hint: "https://test-api.pinpayments.com/1 (sandbox) or https://api.pinpayments.com/1 (live)",
                      icon: "fa-link"
                    }
                  ].map((field) => (
                    <div key={field.envVar} className="rounded-lg border-2 border-amber-500/40 bg-amber-500/5 p-2.5">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <i className={`fa-solid ${field.icon} text-amber-600 text-[10px]`}></i>
                        <span className="font-extrabold text-[10px] uppercase tracking-wider text-foreground">{field.label}</span>
                      </div>
                      <code className="block text-[9px] font-mono text-amber-700 dark:text-amber-400 mb-1">{field.envVar}</code>
                      <p className="text-[9px] text-muted-foreground leading-relaxed">{field.hint}</p>
                      <button
                        onClick={() => {
                          navigator.clipboard?.writeText(field.envVar);
                          toast.info(`Copied env var name: ${field.envVar}`);
                        }}
                        className="mt-1.5 text-[9px] font-bold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1"
                      >
                        <i className="fa-regular fa-copy"></i> Copy env var name
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-3 rounded-lg border-2 border-dashed border-amber-500/50 bg-amber-500/5 p-2.5 text-center">
                  <p className="text-[9px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1">
                    How to add credentials
                  </p>
                  <ol className="text-[9px] text-muted-foreground text-left space-y-1 list-decimal list-inside">
                    <li>Open the <strong>Secrets</strong> panel in the Manus project settings.</li>
                    <li>Add each env var above with its value from your PinPayments dashboard.</li>
                    <li>Restart the server — the payment flow activates automatically.</li>
                  </ol>
                </div>
              </div>

              {/* ── Quick links ─────────────────────────────────── */}
              <div className="pt-3 border-t border-amber-500/30">
                <p className="font-extrabold uppercase mb-2 text-foreground">Admin Pages</p>
                <div className="space-y-1.5">
                  <button
                    onClick={() => onNavigate("employer")}
                    className="w-full text-left p-2 rounded border-2 border-border bg-background hover:bg-accent font-bold flex items-center gap-2 transition-all"
                  >
                    <i className="fa-solid fa-briefcase text-primary text-[10px]"></i>
                    <span>Employer Dashboard</span>
                  </button>
                  <button
                    onClick={() => onNavigate("admin-promos")}
                    className="w-full text-left p-2 rounded border-2 border-border bg-background hover:bg-accent font-bold flex items-center gap-2 transition-all"
                  >
                    <i className="fa-solid fa-tag text-primary text-[10px]"></i>
                    <span>Promo Codes</span>
                  </button>
                  <button
                    onClick={() => onNavigate("admin-waitlist")}
                    className="w-full text-left p-2 rounded border-2 border-border bg-background hover:bg-accent font-bold flex items-center gap-2 transition-all"
                  >
                    <i className="fa-solid fa-list-check text-primary text-[10px]"></i>
                    <span>Waitlist Signups</span>
                  </button>
                  <button
                    onClick={() => onNavigate("school-portal")}
                    className="w-full text-left p-2 rounded border-2 border-teal-500 bg-teal-50 hover:bg-teal-100 font-bold flex items-center gap-2 transition-all"
                  >
                    <i className="fa-solid fa-school text-teal-600 text-[10px]"></i>
                    <span className="text-teal-700">Schools Portal</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Profile Card */}
        <div className="brutal-card brutal-shadow-teal bg-card">
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              <img
                src={userProfile.avatar}
                alt={userProfile.name}
                className="w-20 h-20 rounded-full object-cover brutal-border mb-3"
              />
              <span className="absolute bottom-3 right-0 bg-emerald-500 text-white text-xs h-6 w-6 rounded-full brutal-border flex items-center justify-center" title="Verified Account">
                <i className="fa-solid fa-check"></i>
              </span>
            </div>
            <h3 className="text-xl font-extrabold">{userProfile.name}</h3>
            <p className="text-xs text-muted-foreground font-bold mt-1 uppercase tracking-wider">{userProfile.school}</p>
            
            <div className="w-full border-t border-border my-4 pt-4 flex justify-around text-center">
              <div>
                <p className="text-lg font-extrabold text-primary">2</p>
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Vouches</p>
              </div>
              <div className="border-l border-border h-8"></div>
              <div>
                <p className="text-lg font-extrabold text-secondary">3</p>
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Badges</p>
              </div>
            </div>

            <button
              onClick={() => onNavigate("my-kit")}
              className="w-full brutal-btn bg-primary text-primary-foreground text-xs py-2"
            >
              <i className="fa-solid fa-briefcase"></i> View My Kit
            </button>
          </div>
        </div>

        {/* Squads Card */}
        <div className="brutal-card brutal-shadow bg-card">
          <h4 className="text-md font-extrabold uppercase tracking-wider mb-3 flex items-center gap-2">
            <i className="fa-solid fa-users text-primary"></i> My Squads
          </h4>
          <div className="space-y-2">
            {squads.map((squad) => (
              <button
                key={squad.id}
                onClick={() => toast.info(`Squad: "${squad.name}" chat feed is simulated for demo.`)}
                className="w-full p-2.5 rounded-lg border-2 border-border bg-background hover:bg-accent text-left transition-all active:translate-x-[1px] active:translate-y-[1px] flex items-center justify-between"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-8 w-8 rounded bg-primary/10 text-primary flex items-center justify-center font-bold">
                    <i className={`fa-solid ${squad.icon}`}></i>
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-extrabold truncate">{squad.name}</p>
                    <p className="text-[10px] text-muted-foreground">{squad.count} students</p>
                  </div>
                </div>
                <i className="fa-solid fa-chevron-right text-xs text-muted-foreground"></i>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Center: Social Feed */}
      <div className="lg:col-span-6 space-y-6">
        {/* Create Post Mock */}
        <div className="brutal-card brutal-shadow-amber bg-card">
          <div className="flex gap-3 items-start">
            <img src={userProfile.avatar} alt={userProfile.name} className="w-10 h-10 rounded-full object-cover brutal-border" />
            <div className="flex-1">
              <textarea
                placeholder="What achievements are we verifying today? Got a tutor vouch?"
                className="w-full p-3 brutal-border rounded-lg bg-background text-foreground font-semibold text-sm h-20 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
              <div className="flex justify-between items-center mt-3">
                <div className="flex gap-2">
                  <button onClick={() => toast.info("Report card verification upload mock in My Kit page.")} className="p-2 text-primary hover:bg-accent rounded-lg text-sm" title="Add Verification Document">
                    <i className="fa-solid fa-file-shield"></i> <span className="hidden sm:inline text-xs font-bold">Verify</span>
                  </button>
                  <button onClick={() => toast.info("Sports achievement verification mock in My Kit page.")} className="p-2 text-secondary hover:bg-accent rounded-lg text-sm" title="Add Sport Vouch">
                    <i className="fa-solid fa-basketball"></i> <span className="hidden sm:inline text-xs font-bold">Sport</span>
                  </button>
                </div>
                <button
                  onClick={() => toast.success("Post submitted! In this demo, new posts are simulate-only.")}
                  className="brutal-btn bg-primary text-primary-foreground text-xs py-1.5 px-4"
                >
                  Post to Feed
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Social Feed List */}
        <div className="space-y-4">
          {posts.map((post) => (
            <div key={post.id} className="brutal-card brutal-shadow bg-card">
              {/* Post Header */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex gap-3 items-center">
                  {post.type === "anonymous" ? (
                    <div 
                      className="relative w-10 h-10 shrink-0 group cursor-help"
                      onMouseEnter={() => handleMouseEnterAnon(post.id)}
                    >
                      {anonymousAvatarSetting === "question" ? (
                        <svg className="w-10 h-10 rounded-full object-cover brutal-border transition-all duration-300 group-hover:scale-110 group-hover:rotate-12 group-hover:shadow-md" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect width="100" height="100" fill="#0D9488" />
                          <circle cx="50" cy="50" r="35" fill="#F59E0B" className="transition-transform duration-300 origin-center group-hover:scale-95" />
                          <text x="50" y="62" font-family="Space Grotesk, sans-serif" font-weight="900" font-size="46" fill="#0F172A" text-anchor="middle" className="transition-transform duration-300 origin-center group-hover:rotate-[-12deg] group-hover:scale-105">?</text>
                        </svg>
                      ) : (
                        <img 
                          src={getAnonymousAvatar()} 
                          alt="Anonymous Avatar" 
                          className="w-10 h-10 rounded-full object-cover brutal-border transition-transform group-hover:scale-105" 
                        />
                      )}
                      {/* Playful identity-hidden tooltip */}
                      <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:flex flex-col items-center z-30 w-48">
                        <div className="bg-slate-900 text-white text-[11px] font-extrabold px-3 py-2 rounded-lg border-2 border-slate-900 shadow-md text-center leading-snug">
                          {ANON_PHRASES[activeTooltipIndex[post.id] ?? 0]}
                        </div>
                        <div className="w-2.5 h-2.5 bg-slate-900 rotate-45 -mt-1 border-r-2 border-b-2 border-slate-900"></div>
                      </div>
                    </div>
                  ) : typeof post.user.avatar === "string" && post.user.avatar.startsWith("http") ? (
                    <img src={post.user.avatar} alt={post.user.name} className="w-10 h-10 rounded-full object-cover brutal-border" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg brutal-border">
                      {post.user.avatar}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-sm font-extrabold">{post.user.name}</h4>
                      {post.type === "anonymous" && (
                        <span className="bg-slate-500/10 text-slate-500 dark:text-slate-400 text-[10px] px-1.5 py-0.5 rounded-full font-bold">Anon</span>
                      )}
                      {post.type === "employer" && (
                        <span className="bg-teal-500/10 text-teal-600 text-[10px] px-1.5 py-0.5 rounded-full font-bold">Partner</span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{post.user.school}</p>
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground font-bold">{post.time}</span>
              </div>

              {/* Post Content */}
              <div className="p-3 bg-background rounded-lg border-2 border-border mb-3">
                <p className="text-sm font-semibold leading-relaxed">{post.content}</p>
                {post.meta && (
                  <button
                    onClick={() => {
                      if (post.type === "achievement") {
                        // View specific user kit (Sarah's Kit)
                        setSelectedKitUser(post.user as any);
                        onNavigate("my-kit");
                        toast.info(`Viewing ${post.user.name}'s verified Kit.`);
                      }
                      else if (post.type === "announcement") onNavigate("university");
                      else if (post.type === "employer") onNavigate("jobs");
                      else toast.info(`Viewing details for: ${post.meta}`);
                    }}
                    className="mt-2 text-xs font-extrabold text-primary hover:underline flex items-center gap-1"
                  >
                    <span>Click to {post.meta}</span>
                    <i className="fa-solid fa-arrow-right-long text-[10px]"></i>
                  </button>
                )}
              </div>

              {/* Post Actions */}
              <div className="flex gap-4 border-t border-border pt-3 text-xs font-bold text-muted-foreground">
                <button
                  onClick={() => handleLike(post.id)}
                  className={`flex items-center gap-1.5 hover:text-red-500 transition-colors ${post.liked ? "text-red-500" : ""}`}
                >
                  <i className={`fa-${post.liked ? "solid" : "regular"} fa-heart`}></i>
                  <span>{post.likes} Likes</span>
                </button>
                <button
                  onClick={() => setPosts(prev => prev.map(p => p.id === post.id ? { ...p, showCommentInput: !p.showCommentInput } : p))}
                  className="flex items-center gap-1.5 hover:text-primary transition-colors"
                >
                  <i className="fa-regular fa-comment"></i>
                  <span>{post.comments.length} Comments</span>
                </button>
              </div>

              {/* Comments Section */}
              {post.comments.length > 0 && (
                <div className="mt-3 space-y-2 border-t border-border pt-3">
                  {post.comments.map((comment, idx) => (
                    <div key={idx} className="bg-muted p-2 rounded-lg border border-border text-xs">
                      <span className="font-extrabold text-foreground">{comment.name}: </span>
                      <span className="text-muted-foreground font-medium">{comment.text}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Comment Input */}
              {post.showCommentInput && (
                <form onSubmit={(e) => handleCommentSubmit(post.id, e)} className="mt-3 flex gap-2">
                  <input
                    type="text"
                    placeholder="Write a comment..."
                    value={post.newComment}
                    onChange={(e) => setPosts(prev => prev.map(p => p.id === post.id ? { ...p, newComment: e.target.value } : p))}
                    className="flex-1 p-2 brutal-border rounded-lg bg-background text-foreground font-semibold text-xs focus:outline-none"
                  />
                  <button type="submit" className="brutal-btn bg-primary text-primary-foreground text-xs py-1 px-3">
                    Reply
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Right Sidebar: Active Drops Teaser & Messaging Hub */}
      <div className="lg:col-span-3 space-y-6">
        {/* Drops Teaser Widget */}
        <div className="brutal-card brutal-shadow-amber bg-card">
          <div className="flex justify-between items-start mb-3">
            <h4 className="text-md font-extrabold uppercase tracking-wider">
              🔥 The Drop
            </h4>
            <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full brutal-border">
              Active
            </span>
          </div>
          <div className="p-3 bg-amber-500/10 border-2 border-amber-500 rounded-lg text-center mb-3">
            <p className="text-xs font-extrabold text-amber-600 dark:text-amber-400">50% off burrito at Chipotle</p>
            <p className="text-lg font-black text-foreground mt-1">CODE: STEP50</p>
          </div>
          <button
            onClick={() => onNavigate("drops")}
            className="w-full brutal-btn bg-secondary text-secondary-foreground text-xs py-2"
          >
            Claim Perks Page
          </button>
        </div>

        {/* Messaging Hub Widget */}
        <div className="brutal-card brutal-shadow bg-card">
          <h4 className="text-md font-extrabold uppercase tracking-wider mb-3 flex items-center gap-2">
            <i className="fa-solid fa-message text-primary"></i> Direct Messages
          </h4>
          <div className="space-y-2">
            {conversations.map((chat) => (
              <button
                key={chat.id}
                onClick={() => {
                  setActiveChatId(chat.id);
                  setChatOpen(true);
                }}
                className={`w-full p-2 rounded-lg border-2 border-border text-left transition-all flex items-center justify-between ${
                  chat.unread ? "bg-primary/5 border-primary" : "bg-background hover:bg-accent"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="relative">
                    {typeof chat.participant.avatar === "string" && chat.participant.avatar.startsWith("http") ? (
                      <img src={chat.participant.avatar} alt={chat.participant.name} className="w-8 h-8 rounded-full object-cover brutal-border" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold brutal-border text-sm">
                        {chat.participant.avatar}
                      </div>
                    )}
                    {chat.participant.online && (
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 bg-emerald-500 rounded-full border border-white"></span>
                    )}
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-extrabold truncate flex items-center gap-1">
                      <span>{chat.participant.name}</span>
                      {chat.unread && <span className="h-1.5 w-1.5 bg-primary rounded-full"></span>}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">{chat.lastMessage}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Floating Direct Message Chat Overlay Panel */}
      {chatOpen && activeChat && (
        <div className="fixed bottom-0 right-4 w-80 brutal-card brutal-shadow-teal bg-card p-0 rounded-b-none z-50 flex flex-col h-96 max-h-[90vh]">
          {/* Chat Header */}
          <div className="bg-primary text-primary-foreground p-3 flex items-center justify-between border-b-2 border-border">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm">{activeChat.participant.name}</span>
              <span className="text-[10px] opacity-80">({activeChat.participant.role})</span>
            </div>
            <button onClick={() => setChatOpen(false)} className="text-primary-foreground hover:opacity-80">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-background">
            <div className="p-2 bg-amber-500/10 border border-amber-500 text-[10px] rounded-lg text-amber-700 dark:text-amber-400 font-semibold flex items-start gap-1.5">
              <i className="fa-solid fa-shield-halved mt-0.5"></i>
              <span>Guardrail active: Student safety enabled. Image sharing is disabled.</span>
            </div>

            {activeChat.messages.map((msg) => (
              <div key={msg.id} className={`flex flex-col ${msg.sender.isSelf ? "items-end" : "items-start"}`}>
                <div className={`p-2.5 rounded-lg text-xs max-w-[85%] font-semibold border-2 border-border ${
                  msg.sender.isSelf
                    ? "bg-primary text-primary-foreground rounded-tr-none"
                    : "bg-card text-foreground rounded-tl-none"
                }`}>
                  {msg.text}
                </div>
                <span className="text-[8px] text-muted-foreground mt-1 font-bold">{msg.timestamp}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSendMessageSubmit} className="p-2 border-t-2 border-border bg-card flex gap-1.5">
            <input
              type="text"
              placeholder="Send message..."
              value={newMessageText}
              onChange={(e) => setNewMessageText(e.target.value)}
              className="flex-1 p-2 brutal-border rounded-lg bg-background text-foreground font-semibold text-xs focus:outline-none"
            />
            <button type="submit" className="brutal-btn bg-primary text-primary-foreground py-1 px-3 text-xs">
              <i className="fa-solid fa-paper-plane"></i>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
