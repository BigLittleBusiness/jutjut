import React from "react";
import { getLoginUrl } from "@/const";

interface LoginProps {
  onLoginSuccess?: () => void;
}

/**
 * OAuth is the only supported authentication path. This intentionally contains
 * no local sign-up, password-reset or demo-account behaviour.
 */
export const Login: React.FC<LoginProps> = () => (
  <main className="container mx-auto flex min-h-[70vh] max-w-xl items-center px-4 py-10">
    <section className="brutal-card brutal-shadow w-full bg-card p-7 text-center md:p-10" aria-labelledby="secure-sign-in-heading">
      <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-primary">Secure account access</p>
      <h1 id="secure-sign-in-heading" className="mt-3 text-3xl font-black">Sign in to JutJut</h1>
      <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-muted-foreground">JutJut uses its secure authentication provider. We do not offer a demo sign-in, local password form or simulated account verification in this application.</p>
      <a href={getLoginUrl()} className="mt-6 inline-flex brutal-btn bg-primary px-5 py-3 text-sm text-primary-foreground">Continue to secure sign-in <span aria-hidden="true">→</span></a>
      <p className="mt-5 text-xs leading-5 text-muted-foreground">If you do not yet have access, register your interest through the public rollout page. A waitlist entry does not create an account.</p>
    </section>
  </main>
);
