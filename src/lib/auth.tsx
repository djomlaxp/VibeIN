import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { openedFromRecoveryLink, supabase } from './supabase';

type AuthState = {
  session: Session | null;
  loading: boolean;
  // True after opening a password reset link, until a new password is saved.
  recovering: boolean;
  setRecovering: (value: boolean) => void;
};

const AuthContext = createContext<AuthState>({
  session: null,
  loading: true,
  recovering: false,
  setRecovering: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [recovering, setRecovering] = useState(openedFromRecoveryLink);

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

  return <AuthContext.Provider value={{ session, loading, recovering, setRecovering }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
