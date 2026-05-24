import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { LoginInput, RegisterInput, MagicLinkInput, ResetPasswordInput, UpdatePasswordInput } from "@/lib/auth-schemas";

// ─────────────────────────────────────────────────────────────
// matchfoundr · Auth Actions Hook
// Kapselt alle Supabase Auth-Operationen mit Fehlerbehandlung
// ─────────────────────────────────────────────────────────────

export type AuthError = { message: string; code?: string } | null;

export function useAuthActions() {
  const { enterDemo, signOut } = useAuth();

  const loginWithEmail = useCallback(async (input: LoginInput): Promise<AuthError> => {
    const { error } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });
    if (error) return { message: error.message, code: error.code };
    return null;
  }, []);

  const registerWithEmail = useCallback(async (input: RegisterInput): Promise<AuthError> => {
    const { error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          full_name: input.displayName,
        },
      },
    });
    if (error) return { message: error.message, code: error.code };
    return null;
  }, []);

  const sendMagicLink = useCallback(async (input: MagicLinkInput): Promise<AuthError> => {
    const { error } = await supabase.auth.signInWithOtp({
      email: input.email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) return { message: error.message, code: error.code };
    return null;
  }, []);

  const loginWithGoogle = useCallback(async (): Promise<AuthError> => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
    if (error) return { message: error.message, code: error.code };
    return null;
  }, []);

  const resetPassword = useCallback(async (input: ResetPasswordInput): Promise<AuthError> => {
    const { error } = await supabase.auth.resetPasswordForEmail(input.email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });
    if (error) return { message: error.message, code: error.code };
    return null;
  }, []);

  const updatePassword = useCallback(async (input: UpdatePasswordInput): Promise<AuthError> => {
    const { error } = await supabase.auth.updateUser({
      password: input.password,
    });
    if (error) return { message: error.message, code: error.code };
    return null;
  }, []);

  const resendConfirmation = useCallback(async (email: string): Promise<AuthError> => {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
    });
    if (error) return { message: error.message, code: error.code };
    return null;
  }, []);

  return {
    loginWithEmail,
    registerWithEmail,
    sendMagicLink,
    loginWithGoogle,
    resetPassword,
    updatePassword,
    resendConfirmation,
    signOut,
    enterDemo,
  };
}
