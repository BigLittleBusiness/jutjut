/**
 * LandingPage.tsx
 * Public marketing landing page for JutJut.
 * Renders the self-contained landing.html in a full-viewport iframe so the
 * page has its own nav/footer without the app shell wrapping it.
 */
interface LandingPageProps {
  onSignIn?: () => void;
}

export default function LandingPage({ onSignIn: _onSignIn }: LandingPageProps) {
  return (
    <iframe
      src="/manus-storage/landing_0bc644ef.html"
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
