import { useState } from 'react';
import { CloudConfig, loadCloudConfig, saveCloudConfig, SCHEMA_SQL, testConnection } from '../lib/cloud';

export function CloudSetup({ onClose }: { onClose: () => void }) {
  const initial = loadCloudConfig();
  const [url, setUrl] = useState(initial?.url ?? '');
  const [anonKey, setAnonKey] = useState(initial?.anonKey ?? '');
  const [familyId, setFamilyId] = useState(initial?.familyId ?? 'default');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<null | { ok: true } | { ok: false; error: string }>(
    null
  );
  const [copied, setCopied] = useState(false);

  async function runTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const cfg: CloudConfig = { url: url.trim().replace(/\/+$/, ''), anonKey: anonKey.trim(), familyId: familyId.trim() || 'default' };
      const res = await testConnection(cfg);
      setTestResult(res);
    } finally {
      setTesting(false);
    }
  }

  function save() {
    if (!url.trim() || !anonKey.trim()) return;
    const cfg: CloudConfig = {
      url: url.trim().replace(/\/+$/, ''),
      anonKey: anonKey.trim(),
      familyId: familyId.trim() || 'default',
    };
    saveCloudConfig(cfg);
    onClose();
  }

  function disconnect() {
    if (confirm('Disconnect from cloud sync? Your local scenarios stay; the family will keep their cloud copies.')) {
      saveCloudConfig(null);
      onClose();
    }
  }

  function copySchema() {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(SCHEMA_SQL).then(() => setCopied(true));
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-3 md:p-6">
      <div className="card w-full max-w-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Family cloud sync</h2>
          <button className="btn-ghost px-2 py-0.5" onClick={onClose}>×</button>
        </div>
        <p className="mb-3 text-xs text-slate-500">
          One person in the family creates a free Supabase project and shares the URL + anon key
          with the others. Once everyone pastes the same two values into their phones, scenarios
          marked Public or Shared sync automatically across all devices.
        </p>

        <ol className="mb-4 list-decimal space-y-2 pl-5 text-xs text-slate-700">
          <li>
            Sign up at{' '}
            <a
              href="https://supabase.com"
              target="_blank"
              rel="noreferrer"
              className="text-slate-700 underline"
            >
              supabase.com
            </a>{' '}
            (free, no credit card).
          </li>
          <li>Click <strong>New project</strong>. Pick any name and a strong database password (you won't need it again).</li>
          <li>
            Wait ~2 minutes for the project to provision, then open the <strong>SQL Editor</strong>{' '}
            (left sidebar).
          </li>
          <li>
            Paste the SQL below into a new query and click <strong>Run</strong>:
            <div className="my-2 rounded-md border border-slate-200 bg-slate-50 p-2">
              <pre className="max-h-40 overflow-auto whitespace-pre-wrap text-[10px] text-slate-700">
                {SCHEMA_SQL}
              </pre>
              <button onClick={copySchema} className="btn-ghost mt-1 px-2 py-0.5 text-xs">
                {copied ? '✓ Copied' : 'Copy SQL'}
              </button>
            </div>
          </li>
          <li>
            Open <strong>Settings → API</strong>. Copy <strong>Project URL</strong> and{' '}
            <strong>anon / public</strong> key, paste them below.
          </li>
          <li>Click <strong>Test connection</strong>, then <strong>Save</strong>.</li>
          <li>
            Send the URL + anon key (e.g. on WhatsApp) to the rest of the family so they can paste
            the same values on their phones.
          </li>
        </ol>

        <label className="mb-1 block text-xs font-medium text-slate-600">
          Project URL
        </label>
        <input
          className="field mb-2"
          placeholder="https://abcdefghij.supabase.co"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <label className="mb-1 block text-xs font-medium text-slate-600">
          Anon (public) key
        </label>
        <input
          className="field mb-2"
          placeholder="eyJhbGciOi…"
          value={anonKey}
          onChange={(e) => setAnonKey(e.target.value)}
        />
        <label className="mb-1 block text-xs font-medium text-slate-600">
          Family identifier (optional)
        </label>
        <input
          className="field mb-3"
          placeholder="default"
          value={familyId}
          onChange={(e) => setFamilyId(e.target.value)}
          title="Lets one Supabase project host multiple family circles. Leave as 'default' if unsure."
        />

        {testResult && (
          <div
            className={`mb-3 rounded-md border px-3 py-2 text-xs ${
              testResult.ok
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-rose-200 bg-rose-50 text-rose-700'
            }`}
          >
            {testResult.ok
              ? '✓ Connected successfully. The scenarios table is reachable.'
              : `✗ ${testResult.error || 'Could not connect. Double-check the URL and key.'}`}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <button
              className="btn"
              onClick={runTest}
              disabled={testing || !url.trim() || !anonKey.trim()}
            >
              {testing ? 'Testing…' : 'Test connection'}
            </button>
            {initial && (
              <button className="btn-ghost text-rose-600" onClick={disconnect}>
                Disconnect
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button className="btn" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={save}
              disabled={!url.trim() || !anonKey.trim()}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
