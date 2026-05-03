import { Scenario } from '../types';

/**
 * Encodes a scenario into a URL-safe base64 string suitable for a share link.
 * The recipient's app decodes the same string and imports the scenario.
 */
export function encodeScenarioForShare(scenario: Scenario): string {
  const json = JSON.stringify(scenario);
  // Use URL-safe base64 (RFC 4648 §5): + → -, / → _, strip padding.
  const utf8 = unescape(encodeURIComponent(json));
  const b64 = btoa(utf8);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeShareToScenario(payload: string): Scenario | null {
  try {
    const norm = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = norm + '='.repeat((4 - (norm.length % 4)) % 4);
    const utf8 = atob(padded);
    const json = decodeURIComponent(escape(utf8));
    const sc = JSON.parse(json) as Scenario;
    if (!sc || typeof sc !== 'object' || !sc.id || !Array.isArray(sc.assets)) {
      return null;
    }
    return sc;
  } catch {
    return null;
  }
}

/**
 * Builds the full share URL for a scenario, anchored at the current app
 * origin (the GitHub Pages base path is included automatically).
 */
export function buildShareUrl(scenario: Scenario): string {
  const payload = encodeScenarioForShare(scenario);
  if (typeof window === 'undefined') {
    return `?import=${payload}`;
  }
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('import', payload);
  return url.toString();
}

/** Reads `?import=...` from the current URL and returns the decoded scenario, or null. */
export function readImportFromUrl(): Scenario | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const payload = params.get('import');
  if (!payload) return null;
  return decodeShareToScenario(payload);
}

/** Removes `?import=...` from the address bar without a navigation. */
export function clearImportFromUrl(): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.delete('import');
  window.history.replaceState({}, '', url.toString());
}
