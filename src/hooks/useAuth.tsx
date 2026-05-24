import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isDemo: boolean;
  enterDemo: () => void;
  signOut: () => Promise<void>;
};

const DEMO_AUTH_KEY = "matchfoundr_demo_auth";

const demoUser = {
  id: "demo-founder",
  aud: "authenticated",
  role: "authenticated",
  email: "demo@matchfoundr.local",
  app_metadata: { provider: "demo", providers: ["demo"] },
  user_metadata: { name: "Demo Founder" },
  created_at: new Date(0).toISOString(),
  updated_at: new Date(0).toISOString(),
} as User;

const Ctx = createContext<AuthCtx>({
  user: null,
  session: null,
  loading: true,
  isDemo: false,
  enterDemo: () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(DEMO_AUTH_KEY) === "1";
  });

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s) {
        localStorage.removeItem(DEMO_AUTH_KEY);
        setIsDemo(false);
      }
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) {
        localStorage.removeItem(DEMO_AUTH_KEY);
        setIsDemo(false);
      }
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <Ctx.Provider
      value={{
        user: session?.user ?? (isDemo ? demoUser : null),
        session,
        loading,
        isDemo,
        enterDemo: () => {
          localStorage.setItem(DEMO_AUTH_KEY, "1");
          setIsDemo(true);
          setLoading(false);
        },
        signOut: async () => {
          localStorage.removeItem(DEMO_AUTH_KEY);
          setIsDemo(false);
          await supabase.auth.signOut();
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
