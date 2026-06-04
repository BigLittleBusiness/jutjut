import React, { useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AppProvider, useApp } from "./contexts/AppContext";
import { Navbar } from "./components/Navbar";
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

function MainLayout() {
  const { isAuthenticated } = useApp();
  // Simple state-based routing for static prototype navigation
  const [currentPage, setCurrentPage] = useState<string>(() => {
    return isAuthenticated ? "dashboard" : "landing";
  });
  // Preserve deep-link destination so we can route there after login
  const [pendingDeepLink, setPendingDeepLink] = useState<string | null>(null);

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
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
    // Route to the preserved deep-link destination, or fall back to dashboard
    const destination = pendingDeepLink || "dashboard";
    setPendingDeepLink(null);
    setCurrentPage(destination);
  };

  // Landing page renders without the app shell (it has its own nav/footer)
  if (!isAuthenticated && currentPage === "landing") {
    return (
      <LandingPage onSignIn={() => setCurrentPage("login")} />
    );
  }

  // make sure to consider if you need authentication for certain routes
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-200">
      <Navbar onNavigate={handleNavigate} currentPage={currentPage} />
      
      <main className="flex-grow">
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
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-border bg-card py-6 text-center text-xs text-muted-foreground font-bold uppercase tracking-wider">
        <div className="container mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© 2026 JutJut. Built with care for student success.</p>
          <div className="flex gap-4">
            <a href="#privacy" onClick={(e) => { e.preventDefault(); alert("Demo: Privacy Policy"); }} className="hover:underline">Privacy</a>
            <a href="#terms" onClick={(e) => { e.preventDefault(); alert("Demo: Terms of Service"); }} className="hover:underline">Terms</a>
            <a href="#contact" onClick={(e) => { e.preventDefault(); alert("Demo: Contact Support"); }} className="hover:underline">Support</a>
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
