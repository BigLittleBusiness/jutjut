import React, { useState } from "react";
import { useApp } from "@/contexts/AppContext";

interface LoginProps {
  onLoginSuccess: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const { login } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [school, setSchool] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email) {
      setError("Please enter your email.");
      return;
    }

    // School email check validation hint
    if (isSignUp) {
      if (!name || !school) {
        setError("Please fill out all fields.");
        return;
      }
      if (!email.endsWith(".edu") && !email.includes("school") && !email.includes("college") && !email.includes("uni")) {
        setError("For verified status, we recommend signing up with a student email (e.g., .edu or school address).");
        return;
      }
    }

    login(email);
    onLoginSuccess();
  };

  return (
    <div className="min-h-[calc(100vh-70px)] flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md brutal-card brutal-shadow-teal bg-card relative overflow-hidden">
        {/* Decorative corner tag */}
        <div className="absolute top-0 right-0 bg-secondary text-secondary-foreground font-bold text-xs px-3 py-1 border-b-2 border-l-2 border-border rounded-bl-lg uppercase tracking-wider">
          Student View
        </div>

        <div className="text-center mb-6">
          <h2 className="text-3xl font-extrabold tracking-tight">
            {isSignUp ? "Join StepOne 🚀" : "Welcome Back 👋"}
          </h2>
          <p className="text-muted-foreground mt-2 text-sm">
            {isSignUp
              ? "Verify your skills, unlock drops, and find jobs!"
              : "Access your student portfolio, job board, and weekly drops."}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-destructive/10 text-destructive border-2 border-destructive rounded-lg text-xs font-semibold flex items-start gap-2">
            <i className="fa-solid fa-triangle-exclamation mt-0.5"></i>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <>
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="Alex Mercer"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-3 brutal-border rounded-lg bg-background text-foreground font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider mb-1">High School or Uni</label>
                <input
                  type="text"
                  placeholder="West High School"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  className="w-full p-3 brutal-border rounded-lg bg-background text-foreground font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </>
          )}

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
            {isSignUp && (
              <p className="text-[10px] text-muted-foreground mt-1">
                💡 Sign up with a school email to automatically unlock verified badge status.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider mb-1">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 brutal-border rounded-lg bg-background text-foreground font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <button type="submit" className="w-full brutal-btn bg-primary text-primary-foreground py-3 text-base mt-2">
            {isSignUp ? "Create My Free Account" : "Sign In to StepOne"}
          </button>
        </form>

        <div className="border-t-2 border-border my-6 pt-4 text-center">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError("");
            }}
            className="text-sm font-bold text-primary hover:underline"
          >
            {isSignUp ? "Already have an account? Sign In" : "New to StepOne? Sign up for free!"}
          </button>
        </div>

        <div className="bg-muted p-3 rounded-lg border-2 border-border text-xs text-muted-foreground">
          <p className="font-bold mb-1 text-foreground">💡 Demo Quick-Access:</p>
          <p>You can enter any email (e.g. <span className="font-bold text-primary">alex.mercer@school.edu</span>) and password to log in instantly.</p>
        </div>
      </div>
    </div>
  );
};
