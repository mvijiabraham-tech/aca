import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

// Temporary: bypass Supabase email auth for testing. Set to false for production.
export const BYPASS_AUTH = true;

const BYPASS_STORAGE_KEY = "aca-bypass-auth-email";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  organisation: string | null;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  signIn: async () => ({ error: "AuthProvider not mounted" }),
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch profile from the profiles table
  const fetchProfile = useCallback(async (userId: string) => {
    if (!supabase) return;
    const { data } = await supabase
      .from("profiles")
      .select("id, email, full_name, organisation")
      .eq("id", userId)
      .single();
    if (data) setProfile(data as Profile);
  }, []);

  useEffect(() => {
    // Bypass mode: check localStorage for a stored email
    if (BYPASS_AUTH) {
      const storedEmail = localStorage.getItem(BYPASS_STORAGE_KEY);
      if (storedEmail) {
        const fakeUser = { id: `bypass-${storedEmail}`, email: storedEmail } as User;
        setUser(fakeUser);
        setProfile({
          id: `bypass-${storedEmail}`,
          email: storedEmail,
          full_name: storedEmail.split("@")[0].replace(/[._]/g, " "),
          organisation: storedEmail.split("@")[1]?.split(".")[0] ?? null,
        });
      }
      setLoading(false);
      return;
    }

    if (!supabase) {
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchProfile(s.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, s) => {
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          fetchProfile(s.user.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
      },
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signIn = useCallback(async (email: string): Promise<{ error: string | null }> => {
    // Bypass mode: store email and fake sign-in
    if (BYPASS_AUTH) {
      localStorage.setItem(BYPASS_STORAGE_KEY, email);
      const fakeUser = { id: `bypass-${email}`, email } as User;
      setUser(fakeUser);
      setProfile({
        id: `bypass-${email}`,
        email,
        full_name: email.split("@")[0].replace(/[._]/g, " "),
        organisation: email.split("@")[1]?.split(".")[0] ?? null,
      });
      return { error: null };
    }

    if (!supabase) return { error: "Supabase is not configured" };
    const redirectTo = window.location.origin;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    if (BYPASS_AUTH) {
      localStorage.removeItem(BYPASS_STORAGE_KEY);
      setUser(null);
      setSession(null);
      setProfile(null);
      return;
    }
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
