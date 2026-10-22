/**
 * Express middleware + route handlers for business-owned multipart image uploads.
 * SVG is deliberately not accepted: it can carry executable content when served.
 */

import { randomUUID } from "node:crypto";
import rateLimit from "express-rate-limit";
import multer from "multer";
import type { NextFunction, Request, Response } from "express";
import { getEmployerByUserId } from "./db";
import { sdk, type AuthenticatedUser } from "./_core/sdk";
import { storagePut } from "./storage";

const MAX_DROP_IMAGE_SIZE = 2 * 1024 * 1024;
const MAX_LOGO_IMAGE_SIZE = 500 * 1024;
const UPLOAD_WINDOW_MS = 15 * 60 * 1000;
const MAX_UPLOADS_PER_WINDOW = 20;

const uploadError = {
  unauthenticated: "UNAUTHENTICATED",
  forbidden: "FORBIDDEN",
  invalidFile: "INVALID_FILE",
  fileTooLarge: "FILE_TOO_LARGE",
  rateLimited: "RATE_LIMITED",
  unavailable: "UPLOAD_UNAVAILABLE",
  failed: "UPLOAD_FAILED",
} as const;

type SupportedImageMime = "image/jpeg" | "image/png" | "image/webp" | "image/gif";
type UploadRequest = Request & { user?: AuthenticatedUser };
type MulterMiddleware = (req: Request, res: Response, callback: (error?: unknown) => void) => void;

const imageExtensions: Record<SupportedImageMime, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function sendUploadError(
  res: Response,
  status: number,
  error: (typeof uploadError)[keyof typeof uploadError],
) {
  return res.status(status).json({ error });
}

function isSupportedImageMime(mimetype: string): mimetype is SupportedImageMime {
  return Object.prototype.hasOwnProperty.call(imageExtensions, mimetype);
}

/**
 * The MIME type is supplied by the client, so validate a small, format-specific
 * signature as well. This is intentionally a sanity check, not a full decoder.
 */
export function hasValidImageSignature(mimetype: string, buffer: Buffer): boolean {
  switch (mimetype) {
    case "image/jpeg":
      return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    case "image/png":
      return buffer.length >= 8
        && buffer[0] === 0x89
        && buffer[1] === 0x50
        && buffer[2] === 0x4e
        && buffer[3] === 0x47
        && buffer[4] === 0x0d
        && buffer[5] === 0x0a
        && buffer[6] === 0x1a
        && buffer[7] === 0x0a;
    case "image/webp":
      return buffer.length >= 12
        && buffer.subarray(0, 4).toString("ascii") === "RIFF"
        && buffer.subarray(8, 12).toString("ascii") === "WEBP";
    case "image/gif": {
      const signature = buffer.subarray(0, 6).toString("ascii");
      return signature === "GIF87a" || signature === "GIF89a";
    }
    default:
      return false;
  }
}

function imageFileFilter(_req: Request, file: Express.Multer.File, callback: multer.FileFilterCallback) {
  // SVG is intentionally absent from this allowlist.
  if (!isSupportedImageMime(file.mimetype)) {
    callback(new Error("invalid image upload"));
    return;
  }
  callback(null, true);
}

function createUploadRateLimiter() {
  return rateLimit({
    windowMs: UPLOAD_WINDOW_MS,
    max: MAX_UPLOADS_PER_WINDOW,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      sendUploadError(res, 429, uploadError.rateLimited);
    },
  });
}

const dropImageUploadRateLimiter = createUploadRateLimiter();
const businessLogoUploadRateLimiter = createUploadRateLimiter();

function safeMulter(middleware: MulterMiddleware) {
  return (req: Request, res: Response, next: NextFunction) => {
    middleware(req, res, (error?: unknown) => {
      if (!error) {
        next();
        return;
      }

      if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
        sendUploadError(res, 413, uploadError.fileTooLarge);
        return;
      }

      // Includes unsupported fields, malformed multipart requests, and disallowed MIME types.
      sendUploadError(res, 400, uploadError.invalidFile);
    });
  };
}

const dropImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_DROP_IMAGE_SIZE, files: 1 },
  fileFilter: imageFileFilter,
});

const businessLogoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_LOGO_IMAGE_SIZE, files: 1 },
  fileFilter: imageFileFilter,
});

async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user) {
      sendUploadError(res, 401, uploadError.unauthenticated);
      return;
    }
    if (user.status !== "active") {
      sendUploadError(res, 403, uploadError.forbidden);
      return;
    }
    (req as UploadRequest).user = user;
    next();
  } catch {
    sendUploadError(res, 401, uploadError.unauthenticated);
  }
}

/** Only the owner of an active employer profile may upload business assets. */
async function requireActiveEmployer(req: Request, res: Response, next: NextFunction) {
  const user = (req as UploadRequest).user;
  if (!user) {
    sendUploadError(res, 401, uploadError.unauthenticated);
    return;
  }

  try {
    // getEmployerByUserId scopes this lookup to the signed-in account; do not accept an ID from the request.
    const employer = await getEmployerByUserId(user.id);
    if (!employer || employer.userId !== user.id || employer.status !== "active") {
      sendUploadError(res, 403, uploadError.forbidden);
      return;
    }
    next();
  } catch {
    sendUploadError(res, 503, uploadError.unavailable);
  }
}

async function storeImage(
  req: Request,
  res: Response,
  prefix: "drops" | "business-logos",
  missingFileError: (typeof uploadError)["invalidFile"],
) {
  const file = req.file;
  const user = (req as UploadRequest).user;

  if (!file || !user || !isSupportedImageMime(file.mimetype) || !hasValidImageSignature(file.mimetype, file.buffer)) {
    sendUploadError(res, 400, missingFileError);
    return;
  }

  // UUIDs prevent predictable names and collisions while keeping each user's assets partitioned.
  const key = `${prefix}/${user.id}/${randomUUID()}.${imageExtensions[file.mimetype]}`;

  try {
    const { url } = await storagePut(key, file.buffer, file.mimetype);
    res.status(201).json({ key, url });
  } catch {
    // Storage provider details must never be returned to the client or logged raw.
    sendUploadError(res, 502, uploadError.failed);
  }
}

export async function handleDropImageUpload(req: Request, res: Response) {
  await storeImage(req, res, "drops", uploadError.invalidFile);
}

export async function handleBusinessLogoUpload(req: Request, res: Response) {
  await storeImage(req, res, "business-logos", uploadError.invalidFile);
}

export const dropImageUploadMiddleware = [
  dropImageUploadRateLimiter,
  requireAuth,
  requireActiveEmployer,
  safeMulter(dropImageUpload.single("image")),
  handleDropImageUpload,
];

export const businessLogoUploadMiddleware = [
  businessLogoUploadRateLimiter,
  requireAuth,
  requireActiveEmployer,
  safeMulter(businessLogoUpload.single("logo")),
  handleBusinessLogoUpload,
];
