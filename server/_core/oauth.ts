import { COOKIE_NAME, SESSION_TTL_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { logger } from "./logger";
import { parse as parseCookieHeader } from "cookie";

const OAUTH_STATE_COOKIE = "jutjut_oauth_state";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    // State must have been minted for this browser immediately before the
    // provider redirect. Do not trust a browser-supplied redirect in isolation.
    const cookies = parseCookieHeader(req.headers.cookie ?? "");
    if (cookies[OAUTH_STATE_COOKIE] !== state) {
      res.status(400).json({ error: "invalid oauth state" });
      return;
    }
    res.clearCookie(OAUTH_STATE_COOKIE, { ...getSessionCookieOptions(req), maxAge: -1 });

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: SESSION_TTL_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: SESSION_TTL_MS });

      res.redirect(302, "/");
    } catch (error) {
      logger.error({ err: error }, "[OAuth] Callback failed");
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
