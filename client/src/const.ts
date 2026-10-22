export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

function makeNonce() {
  const bytes = new Uint8Array(24);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

// Generate login URL at runtime so redirect URI reflects the current origin. The
// state cookie binds the callback to this browser; it is not account data.
export const getLoginUrl = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(JSON.stringify({ redirectUri, nonce: makeNonce() }));
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `jutjut_oauth_state=${encodeURIComponent(state)}; Path=/; SameSite=Lax; Max-Age=600${secure}`;

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};
