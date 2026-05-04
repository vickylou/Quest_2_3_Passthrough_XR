import { useEffect, useRef, useState } from 'react';
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
import { AuthorBadge, AUTHOR_META } from './AuthorBadge';
import type { Session, User } from '@supabase/supabase-js';

/**
 * Header avatar that shows who's signed in (or prompts sign-in / role-pick).
 * On phone the trigger is just the colored AuthorBadge to save horizontal
 * space; on desktop the role's name sits next to it. Tapping opens a small
 * popover with the email and a sign-out button.
 */
export function AuthStatus() {
  const setViewer = useStore((s) => s.setViewer);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Author | null>(null);
  const [loadingRole, setLoadingRole] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [showIdentity, setShowIdentity] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

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

  // Close the menu when clicking outside.
  useEffect(() => {
    if (!showMenu) return;
    function onDown(e: MouseEvent | TouchEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setShowMenu(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [showMenu]);

  if (!configured) return null;

  if (!session) {
    return (
      <>
        <button className="btn btn-compact" onClick={() => setShowSignIn(true)}>
          Sign in
        </button>
        {showSignIn && <SignIn onCancel={() => setShowSignIn(false)} />}
      </>
    );
  }

  const author = role ? AUTHORS.find((a) => a.id === role) : null;

  return (
    <div ref={wrapRef} className="relative">
      <button
        className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-white/40"
        onClick={() => setShowMenu((v) => !v)}
        title={session.user.email ?? ''}
        aria-haspopup="menu"
        aria-expanded={showMenu}
      >
        {role ? (
          <AuthorBadge author={role} size="md" />
        ) : (
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-300 text-xs font-bold text-slate-600 shadow-sm">
            ?
          </span>
        )}
        <span className="hidden text-sm font-medium md:inline">
          {loadingRole ? 'Loading…' : author ? author.name : 'Pick role'}
        </span>
      </button>
      {showMenu && (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-1 w-64 rounded-md border border-slate-200 bg-white p-1 text-slate-800 shadow-lg"
        >
          <div className="flex items-center gap-2 px-2 py-2">
            {role && <AuthorBadge author={role} size="md" />}
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-slate-800">
                {author ? author.name : 'No role yet'}
              </div>
              <div className="truncate text-[11px] text-slate-500">
                {session.user.email ?? session.user.id}
              </div>
            </div>
          </div>
          <div className="border-t border-slate-100 px-2 py-1 text-[10px] text-slate-400">
            Role is permanent on this account. To switch roles, sign out and sign in with another email.
          </div>
          <button
            role="menuitem"
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

// AUTHOR_META export-only re-import so this file's role of "owns the avatar
// trigger" is self-contained — keeps the badge in sync with the popover info.
void AUTHOR_META;

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
