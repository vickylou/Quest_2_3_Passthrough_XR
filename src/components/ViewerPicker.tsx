import { Author, AUTHORS } from '../types';
import { useStore } from '../state/store';

export function ViewerPicker() {
  const viewerId = useStore((s) => s.viewerId);
  const setViewer = useStore((s) => s.setViewer);
  return (
    <label className="flex items-center gap-1 text-xs text-slate-600">
      <span className="hidden sm:inline">Viewing as</span>
      <select
        className="field py-1 text-xs"
        value={viewerId}
        onChange={(e) => setViewer(e.target.value as Author)}
        title="Switch which family member is using this device"
      >
        {AUTHORS.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>
    </label>
  );
}
