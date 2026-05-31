/**
 * LandingPage.tsx
 * Public marketing landing page for JutJut.
 * Renders the self-contained landing.html in a full-viewport iframe so the
 * page has its own nav/footer without the app shell wrapping it.
 *
 * The landing page communicates back to the app via postMessage:
 *   { type: 'JUTJUT_NAVIGATE', page: 'login' }
 */
import { useEffect } from "react";

interface LandingPageProps {
  onSignIn?: () => void;
}

export default function LandingPage({ onSignIn }: LandingPageProps) {
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data && event.data.type === "JUTJUT_NAVIGATE") {
        const page = event.data.page as string;
        if (page === "login") {
          onSignIn?.();
        }
        // Deep-link pages (my-kit, jobs, etc.) are handled by App.tsx
        // via a custom event so the main layout can route to them
        if (page && page !== "login") {
          window.dispatchEvent(new CustomEvent("jutjut:navigate", { detail: { page } }));
        }
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onSignIn]);

  return (
    <iframe
      src="/manus-storage/landing_d6ab6c19.html"
      title="JutJut – Turn your proof into your future"
      style={{
        width: "100%",
        height: "100vh",
        border: "none",
        display: "block",
      }}
    />
  );
}
