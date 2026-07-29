/**
 * uploadHandler.ts
 * Express middleware + route handler for multipart image uploads.
 * Stores files in S3 via storagePut and returns { key, url }.
 *
 * Endpoint: POST /api/upload/drop-image
 * Auth: JWT cookie required (same session cookie used by tRPC)
 * Field name: "image"
 * Limits: 2 MB, JPEG/PNG/WebP/GIF only
 */

import multer from "multer";
import type { Request, Response, NextFunction } from "express";
import { storagePut } from "./storage";
import { sdk } from "./_core/sdk";

// ─── Multer config — memory storage (no temp files) ──────────────────────────

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, WebP, and GIF images are accepted."));
    }
  },
});

// ─── Auth middleware ──────────────────────────────────────────────────────────

async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user) {
      res.status(401).json({ error: "Unauthorised" });
      return;
    }
    (req as any).user = user;
    next();
  } catch {
    res.status(401).json({ error: "Unauthorised" });
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function handleDropImageUpload(req: Request, res: Response) {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "No image file provided." });
      return;
    }

    const user = (req as any).user as { id: string };
    const ext = file.mimetype.split("/")[1].replace("jpeg", "jpg");
    const key = `drops/${user.id}/${Date.now()}.${ext}`;

    const { url } = await storagePut(key, file.buffer, file.mimetype);

    res.json({ key, url });
  } catch (err: any) {
    console.error("[uploadHandler] Drop image upload failed:", err);
    res.status(500).json({ error: err?.message ?? "Upload failed." });
  }
}

// ─── Composed middleware stack ────────────────────────────────────────────────

export const dropImageUploadMiddleware = [
  requireAuth,
  upload.single("image"),
  handleDropImageUpload,
];
