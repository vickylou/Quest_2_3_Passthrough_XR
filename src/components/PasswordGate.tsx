import { useEffect, useState } from 'react';

const STORAGE_KEY = 'family-gate-unlocked';
const EXPECTED_HASH = (import.meta.env.VITE_GATE_PASSWORD_HASH ?? '').trim().toLowerCase();

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function PasswordGate({ children }: { children: React.ReactNode }) {
  // No hash configured (e.g. local dev without the env var) — gate is disabled.
  const gateActive = EXPECTED_HASH.length === 64;

  const [unlocked, setUnlocked] = useState<boolean>(() => {
    if (!gateActive) return true;
    try {
      return localStorage.getItem(STORAGE_KEY) === EXPECTED_HASH;
    } catch {
      return false;
    }
  });

  // If the deployed password hash changes, previously-unlocked devices get re-locked.
  useEffect(() => {
    if (!gateActive) return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && saved !== EXPECTED_HASH) {
        localStorage.removeItem(STORAGE_KEY);
        setUnlocked(false);
      }
    } catch {
      /* ignore */
    }
  }, [gateActive]);

  const [password, setPassword] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!password) return;
    setChecking(true);
    setError(null);
    const hex = await sha256Hex(password);
    setChecking(false);
    if (hex === EXPECTED_HASH) {
      try {
        localStorage.setItem(STORAGE_KEY, EXPECTED_HASH);
      } catch {
        /* ignore */
      }
      setUnlocked(true);
    } else {
      setError('Wrong password.');
      setPassword('');
    }
  }

  if (unlocked) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-50 p-3 md:items-center md:p-6">
      <div className="card w-full max-w-md">
        <div className="mb-4 text-center">
          <h1 className="text-xl font-semibold tracking-tight text-slate-800">
            Inheritance Calculator
          </h1>
          <p className="text-xs text-slate-500">Lisa · Vicky · Jackie · Alexa</p>
        </div>
        <h2 className="mb-2 text-lg font-semibold">Enter family password</h2>
        <p className="mb-3 text-xs text-slate-500">
          One-time password for this device. After unlocking, you'll be asked to sign in with your
          email.
        </p>

        <label className="mb-1 block text-xs font-medium text-slate-600">Password</label>
        <input
          className="field mb-2"
          type="password"
          autoComplete="current-password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void submit();
          }}
        />

        {error && (
          <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </div>
        )}

        <div className="flex justify-end">
          <button className="btn-primary" onClick={submit} disabled={checking || !password}>
            {checking ? 'Checking…' : 'Unlock'}
          </button>
        </div>
      </div>
    </div>
  );
}
