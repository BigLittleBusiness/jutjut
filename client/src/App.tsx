import React, { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AppProvider, useApp } from "./contexts/AppContext";
import { Navbar } from "./components/Navbar";
import { useUserRole } from "./hooks/useUserRole";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { MyKit } from "./pages/MyKit";
import { JobBoard } from "./pages/JobBoard";
import { TheDrop } from "./pages/TheDrop";
import { UniversityPortal } from "./pages/UniversityPortal";
import { YourWay } from "./pages/YourWay";
import EmployerDashboard from "./pages/EmployerDashboard";
import AdminPromoCodes from "./pages/AdminPromoCodes";
import AdminWaitlist from "./pages/AdminWaitlist";
import SchoolPortal from "./pages/SchoolPortal";
import AdminDashboard from "./pages/AdminDashboard";
import LandingPage from "./pages/LandingPage";
import EmailPreferences from "./pages/EmailPreferences";
import PrivacySettings from "./pages/PrivacySettings";
import BusinessDashboard from "./pages/BusinessDashboard";
import TeacherPortal from "./pages/TeacherPortal";

function MainLayout() {
  const { isAuthenticated } = useApp();
  const { defaultPage, loading: roleLoading } = useUserRole();
  // Simple state-based routing for static prototype navigation
  const [currentPage, setCurrentPage] = useState<string>(() => {
    return isAuthenticated ? "dashboard" : "landing";
  });
  // Preserve deep-link destination so we can route there after login
  const [pendingDeepLink, setPendingDeepLink] = useState<string | null>(null);

  const PAGE_TITLES: Record<string, string> = {
    landing: "JutJut — Turn your proof into your future",
    login: "Sign in — JutJut",
    dashboard: "Dashboard — JutJut",
    "my-kit": "My Kit — JutJut",
    jobs: "Jobs Board — JutJut",
    drops: "The Drop — JutJut",
    university: "University Portal — JutJut",
    "your-way": "YourWay — JutJut",
    employer: "Employer Dashboard — JutJut",
    "admin-promos": "Promo Codes — JutJut Admin",
    "admin-waitlist": "Waitlist — JutJut Admin",
    "school-portal": "School Portal — JutJut",
    "admin-dashboard": "Admin Dashboard — JutJut",
    "email-preferences": "Email Preferences — JutJut",
    "privacy-settings": "Privacy Settings — JutJut",
    "business-dashboard": "Business Dashboard — JutJut",
    "teacher-portal": "Teacher Portal — JutJut",
  };

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    document.title = PAGE_TITLES[page] ?? "JutJut";
  };

  // Listen for deep-link navigation events dispatched by the landing page iframe
  React.useEffect(() => {
    function handleDeepLink(e: Event) {
      const page = (e as CustomEvent<{ page: string }>).detail?.page;
      if (!page) return;
      if (!isAuthenticated) {
        // Remember destination, then send to login
        setPendingDeepLink(page);
        setCurrentPage("login");
      } else {
        setCurrentPage(page);
      }
    }
    window.addEventListener("jutjut:navigate", handleDeepLink);
    return () => window.removeEventListener("jutjut:navigate", handleDeepLink);
  }, [isAuthenticated]);

  const handleLoginSuccess = () => {
    // Route to the preserved deep-link destination, or fall back to role-based default
    const destination = pendingDeepLink || defaultPage;
    setPendingDeepLink(null);
    setCurrentPage(destination);
  };

  // Sync page title on mount and when currentPage changes
  useEffect(() => {
    document.title = PAGE_TITLES[currentPage] ?? "JutJut";
  }, [currentPage]);

  // Landing page renders without the app shell (it has its own nav/footer)
  if (!isAuthenticated && currentPage === "landing") {
    return (
      <>
        {/* Skip to main content — WCAG 2.4.1 */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[9999] focus:bg-teal-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:font-bold"
        >
          Skip to main content
        </a>
        <LandingPage onSignIn={() => handleNavigate("login")} />
      </>
    );
  }

  // make sure to consider if you need authentication for certain routes
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-200">
      <Navbar onNavigate={handleNavigate} currentPage={currentPage} />
      
      {/* Skip to main content — WCAG 2.4.1 */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[9999] focus:bg-teal-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:font-bold"
      >
        Skip to main content
      </a>

      <main id="main-content" className="flex-grow">
        {!isAuthenticated ? (
          <>
            {currentPage === "login" && <Login onLoginSuccess={handleLoginSuccess} />}
          </>
        ) : (
          <>
            {currentPage === "dashboard" && <Dashboard onNavigate={handleNavigate} />}
            {currentPage === "my-kit" && <MyKit />}
            {currentPage === "jobs" && <JobBoard />}
            {currentPage === "drops" && <TheDrop />}
            {currentPage === "university" && <UniversityPortal />}
            {currentPage === "your-way" && <YourWay />}
            {currentPage === "login" && <Dashboard onNavigate={handleNavigate} />}
            {currentPage === "employer" && <EmployerDashboard />}
            {currentPage === "admin-promos" && <AdminPromoCodes />}
            {currentPage === "admin-waitlist" && <AdminWaitlist onNavigate={handleNavigate} />}
            {currentPage === "school-portal" && <SchoolPortal onNavigate={handleNavigate} />}
            {currentPage === "admin-dashboard" && <AdminDashboard onNavigate={handleNavigate} />}
            {currentPage === "email-preferences" && <EmailPreferences />}
            {currentPage === "privacy-settings" && <PrivacySettings />}
            {currentPage === "business-dashboard" && <BusinessDashboard />}
            {currentPage === "teacher-portal" && <TeacherPortal />}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-border bg-card py-6 text-center text-xs text-muted-foreground font-bold uppercase tracking-wider">
        <div className="container mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© 2026 JutJut Pty Ltd. ABN 00 000 000 000. Built with care for student success.</p>
          <div className="flex gap-4">
            <button onClick={() => handleNavigate("privacy-settings")} className="hover:underline bg-transparent border-none cursor-pointer text-muted-foreground font-bold text-xs uppercase tracking-wider">Privacy</button>
            <button onClick={() => handleNavigate("privacy-settings")} className="hover:underline bg-transparent border-none cursor-pointer text-muted-foreground font-bold text-xs uppercase tracking-wider">Terms</button>
            <button onClick={() => handleNavigate("email-preferences")} className="hover:underline bg-transparent border-none cursor-pointer text-muted-foreground font-bold text-xs uppercase tracking-wider">Support</button>
          </div>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <AppProvider>
          <TooltipProvider>
            <Toaster position="top-center" />
            <MainLayout />
          </TooltipProvider>
        </AppProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
