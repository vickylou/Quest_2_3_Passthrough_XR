import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Author } from '../types';
import { getSession, isPreconfigured, loadIdentity, onAuthStateChange } from './cloud';
import { isCloudConfigured } from '../state/sync';

export interface AuthState {
  /** True when the cloud is configured (env vars baked in or local config saved). */
  configured: boolean;
  /** Active Supabase session, or null when signed out. */
  session: Session | null;
  /** Family role (lisa / vicky / …) for the signed-in user, or null until they pick one. */
  role: Author | null;
  /** True while we're waiting on the initial getSession + loadIdentity calls. */
  loading: boolean;
}

/**
 * Single hook that owns auth state. Used by the App-level gate to decide
 * whether to render the sign-in screen, the role-pick screen, or the app.
 */
export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Author | null>(null);
  const [loading, setLoading] = useState(true);
  const configured = isCloudConfigured() || isPreconfigured();

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }
    let unsub: () => void = () => {};
    void getSession().then((s) => {
      setSession(s);
      if (!s) setLoading(false);
    });
    unsub = onAuthStateChange((s) => {
      setSession(s);
      if (!s) {
        setRole(null);
        setLoading(false);
      }
    });
    return () => unsub();
  }, [configured]);

  useEffect(() => {
    if (!session?.user) return;
    setLoading(true);
    void loadIdentity(session.user).then((r) => {
      setRole(r);
      setLoading(false);
    });
  }, [session]);

  return { configured, session, role, loading };
}
