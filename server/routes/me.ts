import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Express } from "express";
import multer from "multer";
import { z } from "zod";
import {
  deleteUserTag,
  getUserTagById,
  getUserTagSummary,
  listUserTags,
  setTagPhotoUrls,
  upsertUserTag,
} from "../db/userTags.ts";
import { requireUser, type AuthedRequest } from "./auth.ts";

const MAX_PHOTOS = 5;
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

const upsertSchema = z.object({
  entityType: z.enum(["recipe", "drink", "restaurant"]),
  entityId: z.string().min(1).max(200),
  entityName: z.string().min(1).max(200),
  countryCode: z.string().min(2).max(2),
  intent: z.enum(["want", "did"]),
  rating: z.number().int().min(0).max(5).nullable().optional(),
  reviewText: z.string().max(4000).nullable().optional(),
});

const removePhotoSchema = z.object({
  url: z.string().min(1).max(500),
});

const uploadsRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../uploads",
);

function ensureUploadDir(userId: string): string {
  const dir = path.join(uploadsRoot, "reviews", userId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

const upload = multer({
  storage: multer.diskStorage({
    destination(req, _file, cb) {
      try {
        const user = (req as AuthedRequest).user;
        if (!user) {
          cb(new Error("Not signed in"), "");
          return;
        }
        cb(null, ensureUploadDir(user.id));
      } catch (error) {
        cb(error as Error, "");
      }
    },
    filename(_req, file, cb) {
      const ext =
        file.mimetype === "image/png"
          ? ".png"
          : file.mimetype === "image/webp"
            ? ".webp"
            : ".jpg";
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
    },
  }),
  limits: { fileSize: MAX_PHOTO_BYTES, files: MAX_PHOTOS },
  fileFilter(_req, file, cb) {
    if (
      file.mimetype === "image/jpeg" ||
      file.mimetype === "image/png" ||
      file.mimetype === "image/webp"
    ) {
      cb(null, true);
      return;
    }
    cb(new Error("Only JPEG, PNG, or WebP images are allowed."));
  },
});

function publicPhotoUrl(userId: string, filename: string): string {
  return `/uploads/reviews/${userId}/${filename}`;
}

function unlinkIfOwned(userId: string, url: string): void {
  const prefix = `/uploads/reviews/${userId}/`;
  if (!url.startsWith(prefix)) return;
  const filename = path.basename(url);
  if (filename !== url.slice(prefix.length)) return;
  const full = path.join(uploadsRoot, "reviews", userId, filename);
  try {
    fs.unlinkSync(full);
  } catch {
    // ignore missing files
  }
}

export function registerMeRoutes(app: Express): void {
  app.get("/api/me/tags/summary", requireUser, async (req, res) => {
    try {
      const user = (req as AuthedRequest).user!;
      const summary = await getUserTagSummary(user.id);
      res.json({ summary });
    } catch (error) {
      console.error("Tag summary failed", error);
      res.status(500).json({ message: "Could not load profile summary." });
    }
  });

  app.get("/api/me/tags", requireUser, async (req, res) => {
    try {
      const user = (req as AuthedRequest).user!;
      const intent =
        req.query.intent === "want" || req.query.intent === "did"
          ? req.query.intent
          : undefined;
      const entityType =
        req.query.entity_type === "recipe" ||
        req.query.entity_type === "drink" ||
        req.query.entity_type === "restaurant"
          ? req.query.entity_type
          : undefined;
      const countryCode =
        typeof req.query.country_code === "string"
          ? req.query.country_code
          : undefined;
      const minRatingRaw =
        typeof req.query.min_rating === "string"
          ? Number(req.query.min_rating)
          : undefined;
      const minRating =
        minRatingRaw != null && Number.isFinite(minRatingRaw)
          ? minRatingRaw
          : undefined;

      const tags = await listUserTags(user.id, {
        intent,
        entityType,
        countryCode,
        minRating,
      });
      res.json({ tags });
    } catch (error) {
      console.error("List tags failed", error);
      res.status(500).json({ message: "Could not load tags." });
    }
  });

  app.put("/api/me/tags", requireUser, async (req, res) => {
    const parsed = upsertSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid tag payload." });
      return;
    }
    try {
      const user = (req as AuthedRequest).user!;
      const tag = await upsertUserTag({
        userId: user.id,
        entityType: parsed.data.entityType,
        entityId: parsed.data.entityId,
        entityName: parsed.data.entityName,
        countryCode: parsed.data.countryCode,
        intent: parsed.data.intent,
        rating: parsed.data.rating,
        reviewText: parsed.data.reviewText,
        updateRating: parsed.data.rating !== undefined,
        updateReview: parsed.data.reviewText !== undefined,
      });
      res.json({ tag });
    } catch (error) {
      console.error("Upsert tag failed", error);
      res.status(500).json({ message: "Could not save tag." });
    }
  });

  app.delete("/api/me/tags/:id", requireUser, async (req, res) => {
    try {
      const user = (req as AuthedRequest).user!;
      const id = String(req.params.id ?? "");
      const existing = await getUserTagById(user.id, id);
      if (!existing) {
        res.status(404).json({ message: "Tag not found." });
        return;
      }
      for (const url of existing.photoUrls) {
        unlinkIfOwned(user.id, url);
      }
      await deleteUserTag(user.id, id);
      res.json({ ok: true });
    } catch (error) {
      console.error("Delete tag failed", error);
      res.status(500).json({ message: "Could not delete tag." });
    }
  });

  app.post(
    "/api/me/tags/:id/photos",
    requireUser,
    (req, res, next) => {
      upload.array("photos", MAX_PHOTOS)(req, res, (err) => {
        if (err) {
          const message =
            err instanceof Error ? err.message : "Upload failed.";
          res.status(400).json({ message });
          return;
        }
        next();
      });
    },
    async (req, res) => {
      try {
        const user = (req as AuthedRequest).user!;
        const id = String(req.params.id ?? "");
        const existing = await getUserTagById(user.id, id);
        if (!existing) {
          res.status(404).json({ message: "Tag not found." });
          return;
        }
        const files = (req.files as Express.Multer.File[] | undefined) ?? [];
        if (files.length === 0) {
          res.status(400).json({ message: "No photos uploaded." });
          return;
        }
        const room = MAX_PHOTOS - existing.photoUrls.length;
        if (room <= 0) {
          for (const file of files) {
            try {
              fs.unlinkSync(file.path);
            } catch {
              /* ignore */
            }
          }
          res.status(400).json({
            message: `You can attach up to ${MAX_PHOTOS} photos.`,
          });
          return;
        }
        const accepted = files.slice(0, room);
        for (const file of files.slice(room)) {
          try {
            fs.unlinkSync(file.path);
          } catch {
            /* ignore */
          }
        }
        const added = accepted.map((file) =>
          publicPhotoUrl(user.id, file.filename),
        );
        const tag = await setTagPhotoUrls(user.id, id, [
          ...existing.photoUrls,
          ...added,
        ]);
        res.json({ tag });
      } catch (error) {
        console.error("Photo upload failed", error);
        res.status(500).json({ message: "Could not upload photos." });
      }
    },
  );

  app.delete("/api/me/tags/:id/photos", requireUser, async (req, res) => {
    const parsed = removePhotoSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Photo url required." });
      return;
    }
    try {
      const user = (req as AuthedRequest).user!;
      const id = String(req.params.id ?? "");
      const existing = await getUserTagById(user.id, id);
      if (!existing) {
        res.status(404).json({ message: "Tag not found." });
        return;
      }
      const nextUrls = existing.photoUrls.filter((url) => url !== parsed.data.url);
      if (nextUrls.length === existing.photoUrls.length) {
        res.status(404).json({ message: "Photo not found on this tag." });
        return;
      }
      unlinkIfOwned(user.id, parsed.data.url);
      const tag = await setTagPhotoUrls(user.id, id, nextUrls);
      res.json({ tag });
    } catch (error) {
      console.error("Remove photo failed", error);
      res.status(500).json({ message: "Could not remove photo." });
    }
  });
}

/** Absolute path to uploads directory (for static serving). */
export function getUploadsRoot(): string {
  fs.mkdirSync(uploadsRoot, { recursive: true });
  return uploadsRoot;
}
