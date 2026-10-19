import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { openedFromRecoveryLink, supabase } from './supabase';

type AuthState = {
  session: Session | null;
  loading: boolean;
  role: 'user' | 'owner' | 'admin' | null;
  // True after opening a password reset link, until a new password is saved.
  recovering: boolean;
  setRecovering: (value: boolean) => void;
};

const AuthContext = createContext<AuthState>({
  session: null,
  loading: true,
  role: null,
  recovering: false,
  setRecovering: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [recovering, setRecovering] = useState(openedFromRecoveryLink);
  const [role, setRole] = useState<AuthState['role']>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;
  useEffect(() => {
    if (!userId) return setRole(null);
    supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()
      .then(({ data }) => setRole((data?.role as AuthState['role']) ?? 'user'));
  }, [userId]);

  return <AuthContext.Provider value={{ session, loading, role, recovering, setRecovering }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
