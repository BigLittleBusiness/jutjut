import React, { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { toast } from "sonner";

interface LoginProps {
  onLoginSuccess: () => void;
}

type LoginView = "signin" | "signup" | "forgot" | "forgot-sent" | "forgot-reset";

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const { login } = useApp();

  // ── View state ──────────────────────────────────────────────────
  const [view, setView] = useState<LoginView>("signin");

  // ── Sign-in / sign-up fields ────────────────────────────────────
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [school, setSchool] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  // ── Forgot password fields ──────────────────────────────────────
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

  // ── Handlers ────────────────────────────────────────────────────
  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email) { setError("Please enter your email."); return; }
    login(email);
    onLoginSuccess();
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name || !school || !email || !password) {
      setError("Please fill out all fields.");
      return;
    }
    if (!email.endsWith(".edu") && !email.includes("school") && !email.includes("college") && !email.includes("uni")) {
      setError("For verified status, we recommend signing up with a student email (e.g., .edu or school address).");
      return;
    }
    login(email);
    onLoginSuccess();
  };

  const handleForgotRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    if (!forgotEmail) { setForgotError("Please enter your email address."); return; }
    // Demo: simulate sending the code
    setView("forgot-sent");
    toast.success(`Reset code sent to ${forgotEmail}`);
  };

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    if (!resetCode) { setForgotError("Please enter the 6-digit code."); return; }
    if (resetCode.length < 6) { setForgotError("The code must be 6 digits."); return; }
    // Demo: any 6-digit code is accepted
    setView("forgot-reset");
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    if (!newPassword) { setForgotError("Please enter a new password."); return; }
    if (newPassword.length < 8) { setForgotError("Password must be at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { setForgotError("Passwords do not match."); return; }
    toast.success("Password reset successfully! You can now sign in.");
    setView("signin");
    setForgotEmail("");
    setResetCode("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const resetToSignIn = () => {
    setView("signin");
    setForgotEmail("");
    setResetCode("");
    setForgotError("");
    setError("");
  };

  // ── Render helpers ───────────────────────────────────────────────
  const renderSignIn = () => (
    <>
      <div className="text-center mb-6">
        <h2 className="text-3xl font-extrabold tracking-tight">Welcome Back 👋</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          Access your student portfolio, job board, and weekly drops.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-destructive/10 text-destructive border-2 border-destructive rounded-lg text-xs font-semibold flex items-start gap-2">
          <i className="fa-solid fa-triangle-exclamation mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSignIn} className="space-y-4">
        <div>
          <label className="block text-xs font-extrabold uppercase tracking-wider mb-1 flex justify-between">
            <span>Email Address</span>
            <span className="text-primary text-[10px] lowercase font-normal">hint: use @school.edu</span>
          </label>
          <input
            type="email"
            placeholder="alex.mercer@school.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 brutal-border rounded-lg bg-background text-foreground font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-xs font-extrabold uppercase tracking-wider mb-1 flex justify-between">
            <span>Password</span>
            <button
              type="button"
              onClick={() => { setForgotEmail(email); setView("forgot"); }}
              className="text-[10px] text-primary font-bold hover:underline lowercase"
            >
              Forgot password?
            </button>
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 pr-10 brutal-border rounded-lg bg-background text-foreground font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <i className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"} text-sm`} />
            </button>
          </div>
        </div>

        <button type="submit" className="w-full brutal-btn bg-primary text-primary-foreground py-3 text-base mt-2">
          Sign In to JutJut
        </button>
      </form>

      <div className="border-t-2 border-border my-6 pt-4 text-center">
        <button onClick={() => { setView("signup"); setError(""); }} className="text-sm font-bold text-primary hover:underline">
          New to JutJut? Sign up for free!
        </button>
      </div>

      <div className="bg-muted p-3 rounded-lg border-2 border-border text-xs text-muted-foreground">
        <p className="font-bold mb-1 text-foreground">💡 Demo Quick-Access:</p>
        <p>Enter any email (e.g. <span className="font-bold text-primary">alex.mercer@school.edu</span>) and any password to log in instantly.</p>
      </div>
    </>
  );

  const renderSignUp = () => (
    <>
      <div className="text-center mb-6">
        <h2 className="text-3xl font-extrabold tracking-tight">Join JutJut 🚀</h2>
        <p className="text-muted-foreground mt-2 text-sm">Verify your skills, unlock drops, and find jobs!</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-destructive/10 text-destructive border-2 border-destructive rounded-lg text-xs font-semibold flex items-start gap-2">
          <i className="fa-solid fa-triangle-exclamation mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSignUp} className="space-y-4">
        <div>
          <label className="block text-xs font-extrabold uppercase tracking-wider mb-1">Full Name</label>
          <input type="text" placeholder="Alex Mercer" value={name} onChange={(e) => setName(e.target.value)}
            className="w-full p-3 brutal-border rounded-lg bg-background text-foreground font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <div>
          <label className="block text-xs font-extrabold uppercase tracking-wider mb-1">High School or Uni</label>
          <input type="text" placeholder="West High School" value={school} onChange={(e) => setSchool(e.target.value)}
            className="w-full p-3 brutal-border rounded-lg bg-background text-foreground font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <div>
          <label className="block text-xs font-extrabold uppercase tracking-wider mb-1 flex justify-between">
            <span>Email Address</span>
          </label>
          <input type="email" placeholder="alex.mercer@school.edu" value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 brutal-border rounded-lg bg-background text-foreground font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          <p className="text-[10px] text-muted-foreground mt-1">💡 Sign up with a school email to automatically unlock verified badge status.</p>
        </div>
        <div>
          <label className="block text-xs font-extrabold uppercase tracking-wider mb-1">Password</label>
          <div className="relative">
            <input type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 pr-10 brutal-border rounded-lg bg-background text-foreground font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <i className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"} text-sm`} />
            </button>
          </div>
        </div>
        <button type="submit" className="w-full brutal-btn bg-primary text-primary-foreground py-3 text-base mt-2">
          Create My Free Account
        </button>
      </form>

      <div className="border-t-2 border-border my-6 pt-4 text-center">
        <button onClick={() => { setView("signin"); setError(""); }} className="text-sm font-bold text-primary hover:underline">
          Already have an account? Sign In
        </button>
      </div>
    </>
  );

  const renderForgotRequest = () => (
    <>
      <button onClick={resetToSignIn} className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground mb-5 transition-colors">
        <i className="fa-solid fa-arrow-left text-[11px]" /> Back to sign in
      </button>

      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center mx-auto mb-4">
          <i className="fa-solid fa-lock-open text-primary text-xl" />
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight">Forgot your password?</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          Enter the email address linked to your JutJut account. We will send you a 6-digit reset code.
        </p>
      </div>

      {forgotError && (
        <div className="mb-4 p-3 bg-destructive/10 text-destructive border-2 border-destructive rounded-lg text-xs font-semibold flex items-start gap-2">
          <i className="fa-solid fa-triangle-exclamation mt-0.5" />
          <span>{forgotError}</span>
        </div>
      )}

      <form onSubmit={handleForgotRequest} className="space-y-4">
        <div>
          <label className="block text-xs font-extrabold uppercase tracking-wider mb-1">Email Address</label>
          <input
            type="email"
            placeholder="alex.mercer@school.edu"
            value={forgotEmail}
            onChange={(e) => setForgotEmail(e.target.value)}
            autoFocus
            className="w-full p-3 brutal-border rounded-lg bg-background text-foreground font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <button type="submit" className="w-full brutal-btn bg-primary text-primary-foreground py-3 text-base">
          Send Reset Code
        </button>
      </form>
    </>
  );

  const renderForgotSent = () => (
    <>
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-full bg-emerald-100 border-2 border-emerald-500 flex items-center justify-center mx-auto mb-4">
          <i className="fa-solid fa-envelope-circle-check text-emerald-600 text-xl" />
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight">Check your inbox</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          We sent a 6-digit code to <span className="font-bold text-foreground">{forgotEmail}</span>. It expires in 10 minutes.
        </p>
      </div>

      {forgotError && (
        <div className="mb-4 p-3 bg-destructive/10 text-destructive border-2 border-destructive rounded-lg text-xs font-semibold flex items-start gap-2">
          <i className="fa-solid fa-triangle-exclamation mt-0.5" />
          <span>{forgotError}</span>
        </div>
      )}

      <form onSubmit={handleVerifyCode} className="space-y-4">
        <div>
          <label className="block text-xs font-extrabold uppercase tracking-wider mb-1">6-Digit Reset Code</label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="123456"
            value={resetCode}
            onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ""))}
            autoFocus
            className="w-full p-3 brutal-border rounded-lg bg-background text-foreground font-black text-2xl text-center tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <button type="submit" className="w-full brutal-btn bg-primary text-primary-foreground py-3 text-base">
          Verify Code
        </button>
      </form>

      <div className="mt-4 text-center">
        <button onClick={() => { setView("forgot"); setForgotError(""); }} className="text-xs font-bold text-muted-foreground hover:text-primary hover:underline">
          Didn't receive it? Try a different email
        </button>
      </div>

      <div className="mt-3 text-center">
        <button onClick={resetToSignIn} className="text-xs font-bold text-muted-foreground hover:text-foreground hover:underline">
          Back to sign in
        </button>
      </div>
    </>
  );

  const renderForgotReset = () => (
    <>
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center mx-auto mb-4">
          <i className="fa-solid fa-key text-primary text-xl" />
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight">Set a new password</h2>
        <p className="text-muted-foreground mt-2 text-sm">Choose a strong password for your JutJut account.</p>
      </div>

      {forgotError && (
        <div className="mb-4 p-3 bg-destructive/10 text-destructive border-2 border-destructive rounded-lg text-xs font-semibold flex items-start gap-2">
          <i className="fa-solid fa-triangle-exclamation mt-0.5" />
          <span>{forgotError}</span>
        </div>
      )}

      <form onSubmit={handleResetPassword} className="space-y-4">
        <div>
          <label className="block text-xs font-extrabold uppercase tracking-wider mb-1">New Password</label>
          <div className="relative">
            <input
              type={showNewPassword ? "text" : "password"}
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoFocus
              className="w-full p-3 pr-10 brutal-border rounded-lg bg-background text-foreground font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <i className={`fa-solid ${showNewPassword ? "fa-eye-slash" : "fa-eye"} text-sm`} />
            </button>
          </div>
          {newPassword.length > 0 && (
            <div className="mt-1.5 flex gap-1">
              {[...Array(4)].map((_, i) => (
                <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                  newPassword.length >= [8, 12, 16, 20][i]
                    ? i < 2 ? "bg-amber-400" : "bg-emerald-500"
                    : "bg-muted"
                }`} />
              ))}
              <span className="text-[10px] text-muted-foreground ml-1 self-center">
                {newPassword.length < 8 ? "Too short" : newPassword.length < 12 ? "Fair" : newPassword.length < 16 ? "Good" : "Strong"}
              </span>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-extrabold uppercase tracking-wider mb-1">Confirm New Password</label>
          <input
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={`w-full p-3 brutal-border rounded-lg bg-background text-foreground font-semibold text-sm focus:outline-none focus:ring-2 ${
              confirmPassword && confirmPassword !== newPassword
                ? "focus:ring-destructive border-destructive"
                : "focus:ring-primary"
            }`}
          />
          {confirmPassword && confirmPassword !== newPassword && (
            <p className="text-[10px] text-destructive mt-1 font-semibold">Passwords do not match.</p>
          )}
        </div>

        <button type="submit" className="w-full brutal-btn bg-primary text-primary-foreground py-3 text-base">
          Reset Password
        </button>
      </form>
    </>
  );

  return (
    <div className="min-h-[calc(100vh-70px)] flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md brutal-card brutal-shadow-teal bg-card relative overflow-hidden">
        {/* Decorative corner tag */}
        <div className="absolute top-0 right-0 bg-secondary text-secondary-foreground font-bold text-xs px-3 py-1 border-b-2 border-l-2 border-border rounded-bl-lg uppercase tracking-wider">
          {view === "signin" || view === "signup" ? "Student View" : "Account Recovery"}
        </div>

        {view === "signin" && renderSignIn()}
        {view === "signup" && renderSignUp()}
        {view === "forgot" && renderForgotRequest()}
        {view === "forgot-sent" && renderForgotSent()}
        {view === "forgot-reset" && renderForgotReset()}
      </div>
    </div>
  );
};
