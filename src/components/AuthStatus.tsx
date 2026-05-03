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
          className="absolute right-0 z-30 mt-1 w-56 rounded-md border border-slate-200 bg-white p-1 shadow-lg"
          onMouseLeave={() => setShowMenu(false)}
        >
          <div className="px-2 py-1 text-[11px] text-slate-500">
            {session.user.email ?? session.user.id}
          </div>
          <button
            className="block w-full rounded px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100"
            onClick={() => {
              setShowMenu(false);
              setShowIdentity(true);
            }}
          >
            Change my role
          </button>
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
      {showIdentity && session.user && (
        <IdentitySetupWrapper
          user={session.user}
          initialRole={role ?? undefined}
          onSaved={(r) => {
            setRole(r);
            setViewer(r);
            setShowIdentity(false);
          }}
          onCancel={role ? () => setShowIdentity(false) : undefined}
        />
      )}
    </div>
  );
}

/** Pulls familyId from cloud config at render time so IdentitySetup stays purely presentational. */
function IdentitySetupWrapper({
  user,
  initialRole,
  onSaved,
  onCancel,
}: {
  user: User;
  initialRole?: Author;
  onSaved: (role: Author) => void;
  onCancel?: () => void;
}) {
  const familyId =
    JSON.parse(localStorage.getItem('inheritance.cloud') ?? '{}').familyId ?? 'default';
  return (
    <IdentitySetup
      user={user}
      familyId={familyId}
      initialRole={initialRole}
      onSaved={onSaved}
      onCancel={onCancel}
    />
  );
}
