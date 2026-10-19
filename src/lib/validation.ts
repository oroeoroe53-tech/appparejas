import { z } from "zod";
import { MESSAGE_LIMITS, MESSAGE_TYPES, REACTIONS } from "./message-types";

export const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const passwordSchema = z.string().min(8).max(72);
export const displayNameSchema = z.string().trim().min(1).max(40);

export const registerSchema = z.object({ email: emailSchema, password: passwordSchema, displayName: displayNameSchema });
export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1).max(72) });

export const sendMessageSchema = z
  .object({
    content: z.string().trim().min(1, "empty"),
    type: z.enum(MESSAGE_TYPES),
    clientId: z.string().uuid(),
  })
  .superRefine((value, ctx) => {
    if (Array.from(value.content).length > MESSAGE_LIMITS[value.type]) {
      ctx.addIssue({ code: "custom", path: ["content"], message: "tooLong" });
    }
  });

export const profileSchema = z.object({
  displayName: displayNameSchema,
  partnerNickname: z.string().trim().max(40).optional().transform((v) => (v ? v : null)),
  avatarUrl: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || /^https:\/\/\S+$/.test(v), "avatar"),
});

export const reactionSchema = z.enum(REACTIONS).nullable();
export const uuidSchema = z.string().uuid();

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url().startsWith("https://").max(2048),
  keys: z.object({ p256dh: z.string().min(10).max(256), auth: z.string().min(10).max(256) }),
});
export const pushEndpointSchema = z.object({ endpoint: z.string().url().max(2048) });
