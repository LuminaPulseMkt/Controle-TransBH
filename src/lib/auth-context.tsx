import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  ALL_TRUE,
  COLLABORATOR_DEFAULTS,
  type PermKey,
} from "@/lib/permissions";

export type AppRole = "administrator" | "collaborator";

interface AuthState {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  loading: boolean;
  isAdmin: boolean;
  permissions: Record<PermKey, boolean>;
  can: (key: PermKey) => boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<{ error: string | null; needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [permissions, setPermissions] = useState<Record<PermKey, boolean>>(COLLABORATOR_DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        setTimeout(() => loadAccess(sess.user.id), 0);
      } else {
        setRole(null);
        setPermissions(COLLABORATOR_DEFAULTS);
      }
    });

    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) loadAccess(sess.user.id);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const loadAccess = async (userId: string) => {
    const [{ data: roleData }, { data: permsData }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
      supabase.from("user_permissions").select("permission, granted").eq("user_id", userId),
    ]);
    const r = (roleData?.role as AppRole) ?? "collaborator";
    setRole(r);
    if (r === "administrator") {
      setPermissions(ALL_TRUE);
    } else {
      const eff = { ...COLLABORATOR_DEFAULTS };
      (permsData ?? []).forEach((p) => {
        eff[p.permission as PermKey] = p.granted;
      });
      setPermissions(eff);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { display_name: displayName },
      },
    });
    return {
      error: error?.message ?? null,
      // Com confirmação de e-mail ativa, o signUp não cria sessão.
      needsEmailConfirmation: !error && !data.session,
    };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
    setPermissions(COLLABORATOR_DEFAULTS);
  };

  const isAdmin = role === "administrator";
  const can = (key: PermKey) => isAdmin || permissions[key] === true;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        loading,
        isAdmin,
        permissions,
        can,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
