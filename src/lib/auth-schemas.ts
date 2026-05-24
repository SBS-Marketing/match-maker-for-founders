import { z } from "zod";

// ─────────────────────────────────────────────────────────────
// matchfoundr · Auth-Validierungsschemas (Zod)
// ─────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email("Bitte gib eine gültige E-Mail-Adresse ein."),
  password: z.string().min(8, "Passwort muss mindestens 8 Zeichen haben."),
});

export const registerSchema = z
  .object({
    email: z.string().email("Bitte gib eine gültige E-Mail-Adresse ein."),
    password: z
      .string()
      .min(8, "Passwort muss mindestens 8 Zeichen haben.")
      .regex(/[A-Z]/, "Mindestens ein Großbuchstabe.")
      .regex(/[0-9]/, "Mindestens eine Zahl.")
      .regex(/[^A-Za-z0-9]/, "Mindestens ein Sonderzeichen."),
    passwordConfirm: z.string(),
    displayName: z.string().min(2, "Name muss mindestens 2 Zeichen haben.").max(60),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: "Du musst die AGB akzeptieren." }),
    }),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Passwörter stimmen nicht überein.",
    path: ["passwordConfirm"],
  });

export const magicLinkSchema = z.object({
  email: z.string().email("Bitte gib eine gültige E-Mail-Adresse ein."),
});

export const resetPasswordSchema = z.object({
  email: z.string().email("Bitte gib eine gültige E-Mail-Adresse ein."),
});

export const updatePasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Passwort muss mindestens 8 Zeichen haben.")
      .regex(/[A-Z]/, "Mindestens ein Großbuchstabe.")
      .regex(/[0-9]/, "Mindestens eine Zahl."),
    passwordConfirm: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Passwörter stimmen nicht überein.",
    path: ["passwordConfirm"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type MagicLinkInput = z.infer<typeof magicLinkSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
