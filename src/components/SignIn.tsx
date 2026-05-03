import { useState } from 'react';
import { signInWithEmail } from '../lib/cloud';

export function SignIn({ onCancel }: { onCancel?: () => void }) {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (!email.trim()) return;
    setSending(true);
    setError(null);
    const res = await signInWithEmail(email.trim().toLowerCase());
    setSending(false);
    if (res.ok) setSent(true);
    else setError(res.error);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-3 md:items-center md:p-6">
      <div className="card w-full max-w-md">
        <h2 className="mb-2 text-lg font-semibold">Sign in to share scenarios</h2>
        <p className="mb-3 text-xs text-slate-500">
          Enter your email — we'll send you a sign-in link. Click it on this device and you're in
          for ~30 days. No password, no account creation form.
        </p>

        {!sent ? (
          <>
            <label className="mb-1 block text-xs font-medium text-slate-600">Email</label>
            <input
              className="field mb-2"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void send();
              }}
            />

            {error && (
              <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2">
              {onCancel && (
                <button className="btn" onClick={onCancel}>
                  Cancel
                </button>
              )}
              <button
                className="btn-primary"
                onClick={send}
                disabled={sending || !email.trim()}
              >
                {sending ? 'Sending…' : 'Send sign-in link'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              ✓ Check <strong>{email}</strong> on this device. Open the email and tap the sign-in
              link — it brings you straight back here, signed in.
            </div>
            <p className="mb-3 text-[11px] text-slate-500">
              The link is single-use and expires in 1 hour. No email? Check spam, or click the
              button below to send it again.
            </p>
            <div className="flex justify-end gap-2">
              {onCancel && (
                <button className="btn" onClick={onCancel}>
                  Close
                </button>
              )}
              <button
                className="btn"
                onClick={() => {
                  setSent(false);
                  setEmail(email);
                }}
              >
                Resend
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
