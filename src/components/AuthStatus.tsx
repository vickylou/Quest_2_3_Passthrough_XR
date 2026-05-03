import { useEffect, useState } from 'react';
import { Author, AUTHORS } from '../types';
import {
  getSession,
  loadIdentity,
  onAuthStateChange,
  signOut,
} from '../lib/cloud';
import { isCloudConfigured } from '../state/sync';
import { SignIn } from './SignIn';
import { IdentitySetup } from './IdentitySetup';
import { useStore } from '../state/store';
import type { Session, User } from '@supabase/supabase-js';

/**
 * Header chip that shows who's signed in (or prompts sign-in / role-pick).
 * Replaces the old "Viewing as" picker. The viewer's role is now derived
 * from the authenticated identity row on the server — impersonation by
 * switching a dropdown is no longer possible.
 */
export function AuthStatus() {
  const setViewer = useStore((s) => s.setViewer);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Author | null>(null);
  const [loadingRole, setLoadingRole] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [showIdentity, setShowIdentity] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const configured = isCloudConfigured();

  useEffect(() => {
    if (!configured) return;
    void getSession().then(setSession);
    return onAuthStateChange((s) => setSession(s));
  }, [configured]);

  useEffect(() => {
    if (!session?.user) {
      setRole(null);
      return;
    }
    setLoadingRole(true);
    void loadIdentity(session.user).then((r) => {
      setRole(r);
      if (r) setViewer(r);
      else setShowIdentity(true);
      setLoadingRole(false);
    });
  }, [session, setViewer]);

  if (!configured) return null;

  if (!session) {
    return (
      <>
        <button className="btn" onClick={() => setShowSignIn(true)}>
          Sign in
        </button>
        {showSignIn && <SignIn onCancel={() => setShowSignIn(false)} />}
      </>
    );
  }

  const author = role ? AUTHORS.find((a) => a.id === role) : null;
  const label = loadingRole
    ? 'Loading…'
    : author
      ? author.name
      : 'Pick role';

  return (
    <div className="relative">
      <button
        className="btn flex items-center gap-1"
        onClick={() => setShowMenu((v) => !v)}
        title={session.user.email ?? ''}
      >
        <span className="hidden sm:inline">Signed in as</span>
        <strong>{label}</strong>
        <span className="text-slate-400">▾</span>
      </button>
      {showMenu && (
        <div
          className="absolute right-0 z-30 mt-1 w-60 rounded-md border border-slate-200 bg-white p-1 shadow-lg"
          onMouseLeave={() => setShowMenu(false)}
        >
          <div className="px-2 py-1 text-[11px] text-slate-500">
            {session.user.email ?? session.user.id}
          </div>
          <div className="px-2 py-1 text-[10px] text-slate-400">
            Role is permanent on this account. To switch roles, sign out and sign in with another email.
          </div>
          <button
            className="block w-full rounded px-2 py-1.5 text-left text-sm text-rose-600 hover:bg-rose-50"
            onClick={async () => {
              setShowMenu(false);
              await signOut();
              setSession(null);
              setRole(null);
            }}
          >
            Sign out
          </button>
        </div>
      )}
      {showIdentity && session.user && !role && (
        <IdentitySetupWrapper
          user={session.user}
          onSaved={(r) => {
            setRole(r);
            setViewer(r);
            setShowIdentity(false);
          }}
        />
      )}
    </div>
  );
}

/** Pulls familyId from cloud config at render time so IdentitySetup stays purely presentational. */
function IdentitySetupWrapper({
  user,
  onSaved,
}: {
  user: User;
  onSaved: (role: Author) => void;
}) {
  const familyId =
    JSON.parse(localStorage.getItem('inheritance.cloud') ?? '{}').familyId ?? 'default';
  return (
    <IdentitySetup
      user={user}
      familyId={familyId}
      onSaved={onSaved}
    />
  );
}
