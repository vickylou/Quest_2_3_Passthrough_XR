import { ReactNode, useEffect, useState } from 'react';

/**
 * Site-wide password gate that wraps the app. The plaintext password is
 * never stored anywhere — only its SHA-256 hash is baked into the bundle
 * via `VITE_GATE_PASSWORD_HASH`. On submit we hash the user's input and
 * compare. Once a hash matches we cache it in localStorage so the gate
 * stays unlocked on that device until the family rotates the password
 * (which changes the hash and forces everyone to re-enter).
 *
 * This is *not* a substitute for real auth — Supabase's magic link still
 * runs after the gate. The point is to keep casual visitors from being
 * able to even request a magic link, since open email signups in
 * Supabase let any email get a sign-in link.
 *
 * If the env var isn't set (e.g. in local dev without the secret) the
 * gate is bypassed entirely so development isn't blocked.
 */

const GATE_HASH = (import.meta.env.VITE_GATE_PASSWORD_HASH ?? '').trim().toLowerCase();
const STORAGE_KEY = 'inheritance.gate';

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function PasswordGate({ children }: { children: ReactNode }) {
  const enabled = GATE_HASH.length === 64;
  const [unlocked, setUnlocked] = useState(!enabled);
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!enabled) return;
    try {
      // Storing the hash itself (not a separate flag) means rotating the
      // password automatically locks every device — the next load won't
      // match and the gate reappears.
      if (localStorage.getItem(STORAGE_KEY) === GATE_HASH) {
        setUnlocked(true);
      }
    } catch {
      /* ignore */
    }
  }, [enabled]);

  if (unlocked) return <>{children}</>;

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const h = await sha256Hex(pw);
      if (h === GATE_HASH) {
        try {
          localStorage.setItem(STORAGE_KEY, GATE_HASH);
        } catch {
          /* localStorage disabled — still unlock for this session */
        }
        setUnlocked(true);
      } else {
        setError('That password isn’t right.');
        setPw('');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-800">Inheritance calculator</h1>
        <p className="mt-1 text-sm text-slate-600">
          Enter the family password to continue.
        </p>
        <form onSubmit={submit} className="mt-4 space-y-2">
          <input
            type="password"
            autoFocus
            autoComplete="current-password"
            className="field w-full"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            disabled={busy}
          />
          {error && <p className="text-xs text-rose-700">{error}</p>}
          <button type="submit" className="btn w-full" disabled={busy || pw.length === 0}>
            {busy ? 'Checking…' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
