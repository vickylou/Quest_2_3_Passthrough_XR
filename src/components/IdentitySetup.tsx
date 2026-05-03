import { useState } from 'react';
import { Author, AUTHORS } from '../types';
import { saveIdentity } from '../lib/cloud';
import type { User } from '@supabase/supabase-js';

export function IdentitySetup({
  user,
  familyId,
  initialRole,
  onSaved,
  onCancel,
}: {
  user: User;
  familyId: string;
  initialRole?: Author;
  onSaved: (role: Author) => void;
  onCancel?: () => void;
}) {
  const [role, setRole] = useState<Author>(initialRole ?? 'lisa');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await saveIdentity(user, role, familyId);
      onSaved(role);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-3 md:items-center md:p-6">
      <div className="card w-full max-w-md">
        <h2 className="mb-2 text-lg font-semibold">Who are you in the family?</h2>
        <p className="mb-3 text-xs text-slate-500">
          Pick once. From now on, scenarios you create are tagged with this name, and you only see
          scenarios that are public, authored by you, or shared with you. Signed in as{' '}
          <strong>{user.email ?? user.id}</strong>.
        </p>

        <div className="mb-3 grid grid-cols-2 gap-2">
          {AUTHORS.map((a) => {
            const sel = role === a.id;
            return (
              <button
                key={a.id}
                className={`rounded-md border px-3 py-2 text-sm ${
                  sel
                    ? 'border-slate-700 bg-slate-700 text-white'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
                onClick={() => setRole(a.id)}
              >
                {a.name}
              </button>
            );
          })}
        </div>

        {error && (
          <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </div>
        )}

        <p className="mb-3 text-[11px] text-slate-500">
          You can change this later from the same menu, but be careful — switching means scenarios
          you authored under the old role will no longer be writable from this account.
        </p>

        <div className="flex justify-end gap-2">
          {onCancel && (
            <button className="btn" onClick={onCancel}>
              Cancel
            </button>
          )}
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
