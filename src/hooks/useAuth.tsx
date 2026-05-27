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
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    const applySession = (s: Session | null) => {
      setSession(s);
      if (s) {
        localStorage.removeItem(DEMO_AUTH_KEY);
        setIsDemo(false);
      } else {
        setIsDemo(localStorage.getItem(DEMO_AUTH_KEY) === "1");
      }
      setLoading(false);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      applySession(s);
    });
    supabase.auth.getSession().then(({ data }) => {
      applySession(data.session);
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

// Auth state lives in the provider, but consumers need the hook from the same module.
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(Ctx);
