/**
 * LandingPage.tsx
 * Full native React marketing landing page for JutJut.
 * All sections use hardcoded inline styles / Tailwind utilities with explicit
 * colour values so there are zero CSS-variable dependencies that could break
 * in the deployed environment.
 *
 * Sections:
 *  1. Navbar
 *  2. Hero
 *  3. For Students
 *  4. Your Way (accessibility)
 *  5. For Employers
 *  6. The Drop
 *  7. Pricing
 *  8. Trust / Social proof
 *  9. FAQ accordion
 * 10. Waitlist CTA
 * 11. Footer
 */
import React, { useState, useEffect, useRef } from "react";

interface LandingPageProps {
  onSignIn?: () => void;
}

// ── Scroll-reveal hook ────────────────────────────────────────────────────────
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

// ── Reusable reveal wrapper ───────────────────────────────────────────────────
function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(28px)",
        transition: `opacity 0.55s cubic-bezier(0.23,1,0.32,1) ${delay}ms, transform 0.55s cubic-bezier(0.23,1,0.32,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ── FAQ data ──────────────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  { q: "Is JutJut really free for students?", a: "Yes — 100% free for students, forever. We make money from employers who post jobs, not from you." },
  { q: "How does skill verification work?", a: "Your teacher, coach, or employer logs in and confirms your skill directly on JutJut. Once verified, it shows a green tick on your My Kit profile that employers can trust." },
  { q: "What is The Drop?", a: "The Drop is our weekly perks board. Local businesses post exclusive discounts, freebies, and offers just for JutJut students. New drops every Monday." },
  { q: "Can I use JutJut to apply for university?", a: "Yes. The YourWay portal lets you submit your verified My Kit directly to participating universities as evidence of skills and character alongside your academic results." },
  { q: "What accessibility features does JutJut have?", a: "JutJut has Quiet Mode (reduces motion and visual clutter), Plain Language Mode (simplifies all text), and Stepped Forms (one question at a time). All features are free and always on." },
  { q: "How do employers see my profile?", a: "When you apply for a job with one click, your My Kit — including verified skills, report card grades, and credentials — is shared with that employer. You control what is visible." },
  { q: "Is my data safe?", a: "Your data belongs to you. We never sell it. You can delete your account and all associated data at any time from your settings." },
];

// ── Pricing data ─────────────────────────────────────────────────────────────
const PRICING = [
  {
    name: "Starter",
    price: "$0",
    period: "forever",
    highlight: false,
    tag: null,
    features: ["1 active job post", "Basic applicant profiles", "Email support", "JutJut job board listing"],
  },
  {
    name: "Growth",
    price: "$49",
    period: "per month",
    highlight: true,
    tag: "Most popular",
    features: ["5 active job posts", "Full My Kit profiles", "Priority listing", "Promo code access", "Auto-repost", "Chat support"],
  },
  {
    name: "Scale",
    price: "$129",
    period: "per month",
    highlight: false,
    tag: null,
    features: ["Unlimited job posts", "Verified applicants only filter", "Dedicated account manager", "Analytics dashboard", "Custom branding", "API access"],
  },
];

// ── Student features ──────────────────────────────────────────────────────────
const STUDENT_FEATURES = [
  { icon: "🎓", title: "My Kit", desc: "Your verified digital portfolio. Skills, grades, credentials — all in one place, confirmed by real people." },
  { icon: "💼", title: "Jobs Board", desc: "Part-time and casual roles matched to your skills. Apply with one click — your Kit is attached automatically." },
  { icon: "🎁", title: "The Drop", desc: "Weekly exclusive perks from local businesses. Discounts, freebies, and offers just for JutJut students." },
  { icon: "🏛️", title: "YourWay", desc: "Submit your verified profile directly to participating universities as evidence beyond your ATAR." },
];

// ── Employer features ─────────────────────────────────────────────────────────
const EMPLOYER_FEATURES = [
  { icon: "✅", title: "Verified applicants", desc: "Every student's skills are confirmed by teachers and coaches — no more guessing from a resume." },
  { icon: "⚡", title: "One-click hiring", desc: "Students apply with their full verified Kit. You see real evidence, not just a cover letter." },
  { icon: "🔁", title: "Auto-repost", desc: "Roles automatically re-post when they expire so you never miss a candidate." },
  { icon: "📊", title: "Analytics", desc: "See who viewed, applied, and was hired. Understand your reach in the student market." },
];

// ── Trust stats ───────────────────────────────────────────────────────────────
const TRUST_STATS = [
  { value: "1,247+", label: "Students on waitlist" },
  { value: "94%", label: "Would recommend JutJut" },
  { value: "3 min", label: "Average time to apply" },
  { value: "100%", label: "Free for students" },
];

// ─────────────────────────────────────────────────────────────────────────────
export default function LandingPage({ onSignIn }: LandingPageProps) {
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const handleWaitlist = (e: React.FormEvent) => {
    e.preventDefault();
    if (waitlistEmail) setWaitlistSubmitted(true);
  };

  // ── NAV LINKS ───────────────────────────────────────────────────────────────
  const navLinks = [
    { label: "For Students", id: "students" },
    { label: "Your Way", id: "yourway" },
    { label: "For Employers", id: "employers" },
    { label: "The Drop", id: "thedrop" },
    { label: "Pricing", id: "pricing" },
  ];

  return (
    <div style={{ fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif", background: "#f9fafb", color: "#1f2937", overflowX: "hidden" }}>

      {/* ── NAVBAR ─────────────────────────────────────────────────────────── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: scrolled ? "rgba(255,255,255,0.97)" : "#fff",
        borderBottom: "2px solid #1f2937",
        boxShadow: scrolled ? "0 2px 12px rgba(0,0,0,0.08)" : "none",
        transition: "box-shadow 0.2s",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => scrollTo("hero")}>
            <div style={{ width: 36, height: 36, background: "#0d9488", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: "#fff", fontSize: 16, border: "2px solid #1f2937" }}>
              JJ
            </div>
            <span style={{ fontWeight: 900, fontSize: 20, letterSpacing: "-0.5px", color: "#1f2937" }}>jutjut</span>
          </div>

          {/* Desktop nav */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }} className="hidden md:flex">
            {navLinks.map(l => (
              <button key={l.id} onClick={() => scrollTo(l.id)} style={{ background: "none", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 14, color: "#374151", padding: "6px 12px", borderRadius: 6, transition: "background 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#f3f4f6")}
                onMouseLeave={e => (e.currentTarget.style.background = "none")}
              >{l.label}</button>
            ))}
          </div>

          {/* CTA buttons */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={onSignIn} style={{ background: "none", border: "2px solid #1f2937", borderRadius: 8, padding: "8px 18px", fontWeight: 800, fontSize: 14, cursor: "pointer", color: "#1f2937", transition: "all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "#f3f4f6"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "none"; }}
            >Sign in</button>
            <button onClick={() => scrollTo("waitlist")} style={{ background: "#0d9488", border: "2px solid #1f2937", borderRadius: 8, padding: "8px 18px", fontWeight: 800, fontSize: 14, cursor: "pointer", color: "#fff", transition: "all 0.15s", boxShadow: "3px 3px 0 #1f2937" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translate(-2px,-2px)"; e.currentTarget.style.boxShadow = "5px 5px 0 #1f2937"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "3px 3px 0 #1f2937"; }}
            >Join waitlist</button>
            {/* Mobile hamburger */}
            <button className="flex md:hidden" onClick={() => setMobileMenuOpen(v => !v)} style={{ background: "none", border: "2px solid #1f2937", borderRadius: 6, padding: "6px 10px", cursor: "pointer", fontWeight: 900, fontSize: 16 }}>☰</button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div style={{ background: "#fff", borderTop: "2px solid #1f2937", padding: "1rem 1.5rem", display: "flex", flexDirection: "column", gap: 8 }}>
            {navLinks.map(l => (
              <button key={l.id} onClick={() => scrollTo(l.id)} style={{ background: "none", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 15, color: "#374151", textAlign: "left", padding: "8px 0" }}>{l.label}</button>
            ))}
            <button onClick={onSignIn} style={{ background: "none", border: "2px solid #1f2937", borderRadius: 8, padding: "10px", fontWeight: 800, fontSize: 14, cursor: "pointer", marginTop: 4 }}>Sign in</button>
          </div>
        )}
      </nav>

      {/* ── URGENCY BANNER ─────────────────────────────────────────────────── */}
      <div style={{ background: "#1f2937", color: "#fff", textAlign: "center", padding: "10px 1rem", fontSize: 14, fontWeight: 700 }}>
        🔥 <span style={{ color: "#f59e0b" }}>1,247 students</span> already on the waitlist — spots filling fast!
      </div>

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <section id="hero" style={{ background: "linear-gradient(135deg, #f0fdf9 0%, #fefce8 100%)", borderBottom: "2px solid #1f2937", padding: "5rem 1.5rem" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3rem", alignItems: "center" }} className="grid-cols-1 md:grid-cols-2">
          {/* Left */}
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: "1.5rem", flexWrap: "wrap" }}>
              <span style={{ background: "#dcfce7", border: "2px solid #16a34a", borderRadius: 6, padding: "4px 12px", fontSize: 12, fontWeight: 800, color: "#15803d", textTransform: "uppercase", letterSpacing: 1 }}>🎓 Free for students</span>
              <span style={{ background: "#fef9c3", border: "2px solid #ca8a04", borderRadius: 6, padding: "4px 12px", fontSize: 12, fontWeight: 800, color: "#92400e", textTransform: "uppercase", letterSpacing: 1 }}>🇦🇺 Australian owned</span>
            </div>
            <h1 style={{ fontSize: "clamp(2.2rem, 5vw, 3.5rem)", fontWeight: 900, lineHeight: 1.1, marginBottom: "1.25rem", color: "#1f2937" }}>
              Turn your proof into{" "}
              <span style={{ color: "#0d9488", textDecoration: "underline", textDecorationColor: "#f59e0b", textDecorationThickness: 4 }}>your future</span>{" "}
              – JutJut.
            </h1>
            <p style={{ fontSize: "1.15rem", color: "#4b5563", marginBottom: "2rem", lineHeight: 1.6, maxWidth: 480 }}>
              Verified skills, part-time jobs, university entry, and weekly student perks. Free for students. Always.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: "1.5rem" }}>
              <button onClick={() => scrollTo("waitlist")} style={{ background: "#0d9488", border: "2px solid #1f2937", borderRadius: 10, padding: "14px 28px", fontWeight: 800, fontSize: 15, color: "#fff", cursor: "pointer", boxShadow: "4px 4px 0 #1f2937", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translate(-2px,-2px)"; e.currentTarget.style.boxShadow = "6px 6px 0 #1f2937"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "4px 4px 0 #1f2937"; }}
              >🎓 I'm a student – join waitlist</button>
              <button onClick={() => scrollTo("employers")} style={{ background: "#f59e0b", border: "2px solid #1f2937", borderRadius: 10, padding: "14px 28px", fontWeight: 800, fontSize: 15, color: "#1f2937", cursor: "pointer", boxShadow: "4px 4px 0 #1f2937", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translate(-2px,-2px)"; e.currentTarget.style.boxShadow = "6px 6px 0 #1f2937"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "4px 4px 0 #1f2937"; }}
              >💼 I'm hiring – post a job</button>
            </div>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap", fontSize: 13, color: "#6b7280", fontWeight: 600 }}>
              <span>✅ 100% free for students</span>
              <span>✅ No credit card needed</span>
              <span>✅ Your data, your control</span>
            </div>
          </div>

          {/* Right — My Kit mockup */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div style={{ background: "#fff", border: "2px solid #1f2937", borderRadius: 16, padding: "1.5rem", width: "100%", maxWidth: 340, boxShadow: "6px 6px 0 #1f2937" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "1rem" }}>
                <div style={{ width: 48, height: 48, background: "#0d9488", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 16, border: "2px solid #1f2937" }}>JC</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: "#1f2937" }}>Jamie Chen</div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>Year 11 · Westfield High, Sydney</div>
                </div>
              </div>
              {[
                { label: "Mathematics 92%", sub: "✅ Verified by Ms. Taylor" },
                { label: "Leadership", sub: "✅ Verified by Coach Rivera" },
                { label: "Python Certification", sub: "✅ Google Career Certificates" },
              ].map((item, i) => (
                <div key={i} style={{ background: "#f0fdf9", border: "2px solid #0d9488", borderRadius: 10, padding: "10px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 24, height: 24, background: "#0d9488", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, flexShrink: 0 }}>✓</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "#1f2937" }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: "#6b7280" }}>{item.sub}</div>
                  </div>
                </div>
              ))}
              <div style={{ marginTop: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6 }}>
                  <span>Kit completeness</span><span style={{ color: "#0d9488" }}>80%</span>
                </div>
                <div style={{ background: "#e5e7eb", borderRadius: 99, height: 8, overflow: "hidden", border: "1px solid #d1d5db" }}>
                  <div style={{ width: "80%", height: "100%", background: "#0d9488", borderRadius: 99 }} />
                </div>
                <div style={{ textAlign: "center", marginTop: 10, fontSize: 11, fontWeight: 800, color: "#0d9488", letterSpacing: 1, textTransform: "uppercase" }}>MY KIT · JUTJUT</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOR STUDENTS ───────────────────────────────────────────────────── */}
      <section id="students" style={{ background: "#fff", borderBottom: "2px solid #1f2937", padding: "5rem 1.5rem" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: "3rem" }}>
              <span style={{ background: "#f0fdf9", border: "2px solid #0d9488", borderRadius: 6, padding: "4px 14px", fontSize: 12, fontWeight: 800, color: "#0d9488", textTransform: "uppercase", letterSpacing: 1 }}>For Students</span>
              <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 900, marginTop: "1rem", marginBottom: "0.75rem", color: "#1f2937" }}>Everything you need to get ahead</h2>
              <p style={{ fontSize: "1.05rem", color: "#6b7280", maxWidth: 520, margin: "0 auto" }}>One platform for verified skills, jobs, perks, and university pathways. Built for Australian students.</p>
            </div>
          </Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.5rem" }}>
            {STUDENT_FEATURES.map((f, i) => (
              <Reveal key={i} delay={i * 80}>
                <div style={{ background: "#f9fafb", border: "2px solid #1f2937", borderRadius: 14, padding: "1.75rem", boxShadow: "4px 4px 0 #1f2937", transition: "transform 0.15s, box-shadow 0.15s", cursor: "default" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translate(-2px,-2px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "6px 6px 0 #1f2937"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ""; (e.currentTarget as HTMLDivElement).style.boxShadow = "4px 4px 0 #1f2937"; }}
                >
                  <div style={{ fontSize: 36, marginBottom: "0.75rem" }}>{f.icon}</div>
                  <h3 style={{ fontWeight: 800, fontSize: 18, color: "#1f2937", marginBottom: "0.5rem" }}>{f.title}</h3>
                  <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.6 }}>{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={400}>
            <div style={{ textAlign: "center", marginTop: "2.5rem", display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={() => scrollTo("waitlist")} style={{ background: "#0d9488", border: "2px solid #1f2937", borderRadius: 10, padding: "12px 28px", fontWeight: 800, fontSize: 14, color: "#fff", cursor: "pointer", boxShadow: "4px 4px 0 #1f2937", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translate(-2px,-2px)"; e.currentTarget.style.boxShadow = "6px 6px 0 #1f2937"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "4px 4px 0 #1f2937"; }}
              >🎓 Explore My Kit →</button>
              <button onClick={() => scrollTo("waitlist")} style={{ background: "#fff", border: "2px solid #1f2937", borderRadius: 10, padding: "12px 28px", fontWeight: 800, fontSize: 14, color: "#1f2937", cursor: "pointer", boxShadow: "4px 4px 0 #1f2937", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translate(-2px,-2px)"; e.currentTarget.style.boxShadow = "6px 6px 0 #1f2937"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "4px 4px 0 #1f2937"; }}
              >Join the waitlist</button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── YOUR WAY (ACCESSIBILITY) ────────────────────────────────────────── */}
      <section id="yourway" style={{ background: "#1f2937", borderBottom: "2px solid #0d9488", padding: "5rem 1.5rem" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3rem", alignItems: "center" }} className="grid-cols-1 md:grid-cols-2">
          <Reveal>
            <div>
              <span style={{ background: "#0d9488", border: "2px solid #5eead4", borderRadius: 6, padding: "4px 14px", fontSize: 12, fontWeight: 800, color: "#fff", textTransform: "uppercase", letterSpacing: 1 }}>Your Way</span>
              <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)", fontWeight: 900, marginTop: "1rem", marginBottom: "1rem", color: "#f9fafb" }}>JutJut works the way <em>you</em> work</h2>
              <p style={{ fontSize: "1.05rem", color: "#9ca3af", lineHeight: 1.7, marginBottom: "1.5rem" }}>
                We built JutJut with accessibility at its core — not as an afterthought. Every student deserves a platform that meets them where they are.
              </p>
              {[
                { icon: "🔕", title: "Quiet Mode", desc: "Reduces motion, animations, and visual clutter for a calmer experience." },
                { icon: "💬", title: "Plain Language", desc: "Simplifies all text across the platform — no jargon, no confusion." },
                { icon: "📋", title: "Stepped Forms", desc: "One question at a time. No overwhelming walls of fields." },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 14, marginBottom: "1.25rem", alignItems: "flex-start" }}>
                  <div style={{ width: 40, height: 40, background: "#374151", border: "2px solid #4b5563", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{item.icon}</div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15, color: "#f9fafb", marginBottom: 2 }}>{item.title}</div>
                    <div style={{ fontSize: 13, color: "#9ca3af" }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>

          {/* Accessibility settings mockup */}
          <Reveal delay={150}>
            <div style={{ background: "#374151", border: "2px solid #4b5563", borderRadius: 16, padding: "1.75rem", boxShadow: "6px 6px 0 #0d9488" }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#9ca3af", letterSpacing: 2, textTransform: "uppercase", marginBottom: "1.25rem" }}>Accessibility Settings</div>
              {[
                { label: "Quiet Mode", sub: "Reduces motion & clutter", on: true },
                { label: "Plain Language", sub: "Simplify all text", on: true },
                { label: "Stepped Forms", sub: "One question at a time", on: false },
              ].map((s, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: i < 2 ? "1px solid #4b5563" : "none" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "#f9fafb" }}>{s.label}</div>
                    <div style={{ fontSize: 12, color: "#9ca3af" }}>{s.sub}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 48, height: 26, background: s.on ? "#0d9488" : "#4b5563", borderRadius: 99, position: "relative", border: "2px solid " + (s.on ? "#5eead4" : "#6b7280"), transition: "background 0.2s" }}>
                      <div style={{ position: "absolute", top: 2, left: s.on ? 22 : 2, width: 18, height: 18, background: "#fff", borderRadius: "50%", transition: "left 0.2s" }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 800, color: s.on ? "#5eead4" : "#9ca3af" }}>{s.on ? "ON" : "OFF"}</span>
                  </div>
                </div>
              ))}
              <div style={{ marginTop: "1.25rem", display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ background: "#4b5563", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#fca5a5", fontWeight: 600 }}>● Without Quiet Mode: busy, animated, lots happening</div>
                <div style={{ background: "#134e4a", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#5eead4", fontWeight: 600 }}>● With Quiet Mode: calm, clear, focused on what matters</div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FOR EMPLOYERS ──────────────────────────────────────────────────── */}
      <section id="employers" style={{ background: "#fefce8", borderBottom: "2px solid #1f2937", padding: "5rem 1.5rem" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: "3rem" }}>
              <span style={{ background: "#fef9c3", border: "2px solid #ca8a04", borderRadius: 6, padding: "4px 14px", fontSize: 12, fontWeight: 800, color: "#92400e", textTransform: "uppercase", letterSpacing: 1 }}>For Employers</span>
              <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 900, marginTop: "1rem", marginBottom: "0.75rem", color: "#1f2937" }}>Hire verified students with confidence</h2>
              <p style={{ fontSize: "1.05rem", color: "#6b7280", maxWidth: 520, margin: "0 auto" }}>No more unverified resumes. Every JutJut applicant comes with confirmed skills, real grades, and a digital portfolio.</p>
            </div>
          </Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.5rem" }}>
            {EMPLOYER_FEATURES.map((f, i) => (
              <Reveal key={i} delay={i * 80}>
                <div style={{ background: "#fff", border: "2px solid #1f2937", borderRadius: 14, padding: "1.75rem", boxShadow: "4px 4px 0 #1f2937", transition: "transform 0.15s, box-shadow 0.15s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translate(-2px,-2px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "6px 6px 0 #1f2937"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ""; (e.currentTarget as HTMLDivElement).style.boxShadow = "4px 4px 0 #1f2937"; }}
                >
                  <div style={{ fontSize: 36, marginBottom: "0.75rem" }}>{f.icon}</div>
                  <h3 style={{ fontWeight: 800, fontSize: 18, color: "#1f2937", marginBottom: "0.5rem" }}>{f.title}</h3>
                  <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.6 }}>{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={400}>
            <div style={{ textAlign: "center", marginTop: "2.5rem" }}>
              <button onClick={() => scrollTo("pricing")} style={{ background: "#f59e0b", border: "2px solid #1f2937", borderRadius: 10, padding: "14px 32px", fontWeight: 800, fontSize: 15, color: "#1f2937", cursor: "pointer", boxShadow: "4px 4px 0 #1f2937", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translate(-2px,-2px)"; e.currentTarget.style.boxShadow = "6px 6px 0 #1f2937"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "4px 4px 0 #1f2937"; }}
              >💼 Start hiring verified students →</button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── THE DROP ───────────────────────────────────────────────────────── */}
      <section id="thedrop" style={{ background: "#fff", borderBottom: "2px solid #1f2937", padding: "5rem 1.5rem" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3rem", alignItems: "center" }} className="grid-cols-1 md:grid-cols-2">
          <Reveal>
            <div>
              <span style={{ background: "#fdf4ff", border: "2px solid #a855f7", borderRadius: 6, padding: "4px 14px", fontSize: 12, fontWeight: 800, color: "#7e22ce", textTransform: "uppercase", letterSpacing: 1 }}>The Drop</span>
              <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)", fontWeight: 900, marginTop: "1rem", marginBottom: "1rem", color: "#1f2937" }}>Weekly perks, just for you</h2>
              <p style={{ fontSize: "1.05rem", color: "#6b7280", lineHeight: 1.7, marginBottom: "1.5rem" }}>
                Every Monday, local businesses drop exclusive discounts, freebies, and offers exclusively for JutJut students. Free coffee, gym passes, software deals, and more.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {["🎯 New drops every Monday", "🏪 Local businesses near your school", "🆓 Completely free to claim", "⏰ Limited time — first come, first served"].map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, fontWeight: 600, color: "#374151" }}>{item}</div>
                ))}
              </div>
              <button onClick={() => scrollTo("waitlist")} style={{ marginTop: "1.75rem", background: "#a855f7", border: "2px solid #1f2937", borderRadius: 10, padding: "12px 28px", fontWeight: 800, fontSize: 14, color: "#fff", cursor: "pointer", boxShadow: "4px 4px 0 #1f2937", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translate(-2px,-2px)"; e.currentTarget.style.boxShadow = "6px 6px 0 #1f2937"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "4px 4px 0 #1f2937"; }}
              >🎁 See this week's drops</button>
            </div>
          </Reveal>

          {/* Drop cards mockup */}
          <Reveal delay={150}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { emoji: "☕", title: "Free Coffee", biz: "The Grind Café", tag: "Expires in 2 days", tagColor: "#ef4444", claimed: "47 / 50 claimed" },
                { emoji: "💻", title: "3 months free Canva Pro", biz: "Canva", tag: "New this week", tagColor: "#0d9488", claimed: "12 / 100 claimed" },
                { emoji: "🏋️", title: "1 week free gym pass", biz: "Anytime Fitness", tag: "Expires in 5 days", tagColor: "#f59e0b", claimed: "28 / 30 claimed" },
              ].map((drop, i) => (
                <div key={i} style={{ background: "#f9fafb", border: "2px solid #1f2937", borderRadius: 12, padding: "1rem 1.25rem", display: "flex", alignItems: "center", gap: 14, boxShadow: "3px 3px 0 #1f2937" }}>
                  <div style={{ width: 48, height: 48, background: "#fff", border: "2px solid #e5e7eb", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>{drop.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: "#1f2937" }}>{drop.title}</div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>{drop.biz}</div>
                    <div style={{ display: "flex", gap: 8, marginTop: 4, alignItems: "center" }}>
                      <span style={{ background: drop.tagColor + "20", color: drop.tagColor, border: `1px solid ${drop.tagColor}`, borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{drop.tag}</span>
                      <span style={{ fontSize: 11, color: "#9ca3af" }}>{drop.claimed}</span>
                    </div>
                  </div>
                  <button style={{ background: "#0d9488", border: "2px solid #1f2937", borderRadius: 8, padding: "6px 14px", fontWeight: 800, fontSize: 12, color: "#fff", cursor: "pointer" }}>Claim</button>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── PRICING ────────────────────────────────────────────────────────── */}
      <section id="pricing" style={{ background: "#f9fafb", borderBottom: "2px solid #1f2937", padding: "5rem 1.5rem" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: "3rem" }}>
              <span style={{ background: "#eff6ff", border: "2px solid #3b82f6", borderRadius: 6, padding: "4px 14px", fontSize: 12, fontWeight: 800, color: "#1d4ed8", textTransform: "uppercase", letterSpacing: 1 }}>Pricing</span>
              <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 900, marginTop: "1rem", marginBottom: "0.75rem", color: "#1f2937" }}>Simple, transparent pricing</h2>
              <p style={{ fontSize: "1.05rem", color: "#6b7280", maxWidth: 480, margin: "0 auto" }}>Free for students. Employers pay only for what they need. No lock-in contracts.</p>
            </div>
          </Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.5rem", alignItems: "start" }}>
            {PRICING.map((plan, i) => (
              <Reveal key={i} delay={i * 100}>
                <div style={{
                  background: plan.highlight ? "#1f2937" : "#fff",
                  border: "2px solid #1f2937",
                  borderRadius: 16,
                  padding: "2rem",
                  boxShadow: plan.highlight ? "6px 6px 0 #0d9488" : "4px 4px 0 #1f2937",
                  position: "relative",
                  transform: plan.highlight ? "scale(1.03)" : "none",
                }}>
                  {plan.tag && (
                    <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", background: "#f59e0b", border: "2px solid #1f2937", borderRadius: 99, padding: "4px 16px", fontSize: 12, fontWeight: 800, color: "#1f2937", whiteSpace: "nowrap" }}>{plan.tag}</div>
                  )}
                  <div style={{ fontWeight: 800, fontSize: 18, color: plan.highlight ? "#f9fafb" : "#1f2937", marginBottom: "0.5rem" }}>{plan.name}</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: "0.25rem" }}>
                    <span style={{ fontSize: 40, fontWeight: 900, color: plan.highlight ? "#5eead4" : "#0d9488" }}>{plan.price}</span>
                    <span style={{ fontSize: 14, color: plan.highlight ? "#9ca3af" : "#6b7280", fontWeight: 600 }}>{plan.period}</span>
                  </div>
                  <div style={{ borderTop: `1px solid ${plan.highlight ? "#374151" : "#e5e7eb"}`, margin: "1.25rem 0", paddingTop: "1.25rem", display: "flex", flexDirection: "column", gap: 10 }}>
                    {plan.features.map((f, j) => (
                      <div key={j} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: plan.highlight ? "#d1d5db" : "#374151" }}>
                        <span style={{ color: "#0d9488", fontWeight: 800, flexShrink: 0 }}>✓</span>{f}
                      </div>
                    ))}
                  </div>
                  <button onClick={() => scrollTo("waitlist")} style={{ width: "100%", background: plan.highlight ? "#0d9488" : "#fff", border: "2px solid " + (plan.highlight ? "#5eead4" : "#1f2937"), borderRadius: 10, padding: "12px", fontWeight: 800, fontSize: 14, color: plan.highlight ? "#fff" : "#1f2937", cursor: "pointer", boxShadow: "3px 3px 0 " + (plan.highlight ? "#5eead4" : "#1f2937"), transition: "all 0.15s" }}
                    onMouseEnter={e => { e.currentTarget.style.transform = "translate(-1px,-1px)"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ""; }}
                  >Get started</button>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRUST / SOCIAL PROOF ───────────────────────────────────────────── */}
      <section style={{ background: "#0d9488", borderBottom: "2px solid #1f2937", padding: "4rem 1.5rem" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
              <h2 style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)", fontWeight: 900, color: "#fff" }}>Students and employers trust JutJut</h2>
            </div>
          </Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1.5rem", marginBottom: "3rem" }}>
            {TRUST_STATS.map((s, i) => (
              <Reveal key={i} delay={i * 80}>
                <div style={{ textAlign: "center", background: "rgba(255,255,255,0.12)", border: "2px solid rgba(255,255,255,0.3)", borderRadius: 14, padding: "1.5rem" }}>
                  <div style={{ fontSize: "2.4rem", fontWeight: 900, color: "#fff", marginBottom: 4 }}>{s.value}</div>
                  <div style={{ fontSize: 13, color: "#ccfbf1", fontWeight: 600 }}>{s.label}</div>
                </div>
              </Reveal>
            ))}
          </div>
          {/* Testimonials */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
            {[
              { quote: "I got my first job through JutJut in three days. My teacher verified my maths skills and the café hired me on the spot.", name: "Priya, Year 12", school: "Parramatta High" },
              { quote: "The Drop saved me so much money. Free coffee every week and a Canva Pro subscription — I use it for all my assignments.", name: "Marcus, Year 10", school: "Brisbane State High" },
              { quote: "We hired four students through JutJut last month. The verified profiles meant we could trust the applications from day one.", name: "Sarah", school: "Owner, The Grind Café" },
            ].map((t, i) => (
              <Reveal key={i} delay={i * 100}>
                <div style={{ background: "#fff", border: "2px solid #1f2937", borderRadius: 14, padding: "1.5rem", boxShadow: "4px 4px 0 #1f2937" }}>
                  <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.7, marginBottom: "1rem", fontStyle: "italic" }}>"{t.quote}"</p>
                  <div style={{ fontWeight: 800, fontSize: 14, color: "#1f2937" }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>{t.school}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────────── */}
      <section id="faq" style={{ background: "#fff", borderBottom: "2px solid #1f2937", padding: "5rem 1.5rem" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: "3rem" }}>
              <span style={{ background: "#f0fdf9", border: "2px solid #0d9488", borderRadius: 6, padding: "4px 14px", fontSize: 12, fontWeight: 800, color: "#0d9488", textTransform: "uppercase", letterSpacing: 1 }}>FAQ</span>
              <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)", fontWeight: 900, marginTop: "1rem", marginBottom: "0.5rem", color: "#1f2937" }}>Common questions</h2>
              <p style={{ fontSize: "1rem", color: "#6b7280" }}>Everything you need to know about JutJut.</p>
            </div>
          </Reveal>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {FAQ_ITEMS.map((item, i) => (
              <Reveal key={i} delay={i * 60}>
                <div style={{ border: "2px solid #1f2937", borderRadius: 12, overflow: "hidden", boxShadow: faqOpen === i ? "4px 4px 0 #0d9488" : "3px 3px 0 #1f2937", transition: "box-shadow 0.2s" }}>
                  <button
                    onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                    style={{ width: "100%", background: faqOpen === i ? "#f0fdf9" : "#fff", border: "none", padding: "1.1rem 1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", textAlign: "left", transition: "background 0.15s" }}
                  >
                    <span style={{ fontWeight: 800, fontSize: 15, color: "#1f2937", paddingRight: "1rem" }}>{item.q}</span>
                    <span style={{ fontSize: 20, color: "#0d9488", flexShrink: 0, transform: faqOpen === i ? "rotate(45deg)" : "none", transition: "transform 0.2s", fontWeight: 900 }}>+</span>
                  </button>
                  {faqOpen === i && (
                    <div style={{ padding: "0 1.25rem 1.25rem", background: "#f0fdf9", borderTop: "1px solid #d1fae5" }}>
                      <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.7, margin: 0, paddingTop: "0.75rem" }}>{item.a}</p>
                    </div>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── WAITLIST CTA ───────────────────────────────────────────────────── */}
      <section id="waitlist" style={{ background: "#1f2937", padding: "5rem 1.5rem" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
          <Reveal>
            <div style={{ fontSize: 48, marginBottom: "1rem" }}>🚀</div>
            <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 900, color: "#f9fafb", marginBottom: "1rem" }}>
              Be first when JutJut launches
            </h2>
            <p style={{ fontSize: "1.05rem", color: "#9ca3af", marginBottom: "2rem", lineHeight: 1.6 }}>
              Join 1,247+ students already on the waitlist. We'll notify you the moment your school goes live.
            </p>
            {waitlistSubmitted ? (
              <div style={{ background: "#134e4a", border: "2px solid #5eead4", borderRadius: 14, padding: "2rem", boxShadow: "4px 4px 0 #0d9488" }}>
                <div style={{ fontSize: 40, marginBottom: "0.75rem" }}>🎉</div>
                <div style={{ fontWeight: 800, fontSize: 20, color: "#5eead4", marginBottom: "0.5rem" }}>You're on the list!</div>
                <div style={{ fontSize: 14, color: "#99f6e4" }}>We'll be in touch as soon as JutJut launches in your area.</div>
              </div>
            ) : (
              <form onSubmit={handleWaitlist} style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
                <input
                  type="email"
                  required
                  placeholder="your@email.com"
                  value={waitlistEmail}
                  onChange={e => setWaitlistEmail(e.target.value)}
                  style={{ flex: "1 1 240px", background: "#374151", border: "2px solid #4b5563", borderRadius: 10, padding: "14px 18px", fontSize: 15, color: "#f9fafb", outline: "none" }}
                  onFocus={e => { e.currentTarget.style.borderColor = "#0d9488"; }}
                  onBlur={e => { e.currentTarget.style.borderColor = "#4b5563"; }}
                />
                <button type="submit" style={{ background: "#0d9488", border: "2px solid #5eead4", borderRadius: 10, padding: "14px 28px", fontWeight: 800, fontSize: 15, color: "#fff", cursor: "pointer", boxShadow: "4px 4px 0 #5eead4", transition: "all 0.15s", whiteSpace: "nowrap" }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translate(-2px,-2px)"; e.currentTarget.style.boxShadow = "6px 6px 0 #5eead4"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "4px 4px 0 #5eead4"; }}
                >Join the waitlist →</button>
              </form>
            )}
            <p style={{ fontSize: 12, color: "#6b7280", marginTop: "1rem" }}>No spam. Unsubscribe any time. We respect your privacy.</p>
          </Reveal>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer style={{ background: "#111827", borderTop: "2px solid #374151", padding: "2.5rem 1.5rem" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, background: "#0d9488", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: "#fff", fontSize: 13, border: "2px solid #374151" }}>JJ</div>
            <span style={{ fontWeight: 900, fontSize: 16, color: "#f9fafb" }}>jutjut</span>
            <span style={{ fontSize: 12, color: "#6b7280" }}>© 2026 JutJut. Built with care for student success.</span>
          </div>
          <div style={{ display: "flex", gap: 20, fontSize: 13, color: "#9ca3af", fontWeight: 600 }}>
            <button onClick={onSignIn} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontWeight: 600, fontSize: 13 }}>Sign in</button>
            <span style={{ cursor: "pointer" }} onClick={() => alert("Privacy Policy — coming soon")}>Privacy</span>
            <span style={{ cursor: "pointer" }} onClick={() => alert("Terms of Service — coming soon")}>Terms</span>
            <span style={{ cursor: "pointer" }} onClick={() => alert("Contact — coming soon")}>Contact</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
