import { Author } from '../types';

/**
 * Small circular badge showing the first letter of an author's name in their
 * sister-colour gradient (or a slate gradient for Mum / Dad / Test, who don't
 * have a colour pair). Used wherever we'd otherwise spell out the author —
 * scenario chips, the read-only banner, the signed-in avatar in the header,
 * and inside the scenario picker dropdown so authorship is visible while
 * scrolling through scenarios.
 */
export function AuthorBadge({
  author,
  size = 'sm',
}: {
  author: Author;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}) {
  const meta = AUTHOR_META[author];
  const dim =
    size === 'lg'
      ? 'h-9 w-9 text-sm'
      : size === 'md'
        ? 'h-7 w-7 text-xs'
        : size === 'xs'
          ? 'h-4 w-4 text-[9px]'
          : 'h-5 w-5 text-[10px]';
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white shadow-sm ${dim}`}
      style={{ background: meta.gradient }}
      title={meta.name}
      aria-label={meta.name}
    >
      {meta.letter}
    </span>
  );
}

export const AUTHOR_META: Record<Author, { name: string; letter: string; gradient: string }> = {
  lisa: { name: 'Lisa', letter: 'L', gradient: 'linear-gradient(135deg, #16a34a, #2563eb)' },
  vicky: { name: 'Vicky', letter: 'V', gradient: 'linear-gradient(135deg, #eab308, #f97316)' },
  jackie: { name: 'Jackie', letter: 'J', gradient: 'linear-gradient(135deg, #dc2626, #ec4899)' },
  alexa: { name: 'Alexa', letter: 'A', gradient: 'linear-gradient(135deg, #9333ea, #7c3aed)' },
  mum: { name: 'Mum', letter: 'M', gradient: 'linear-gradient(135deg, #475569, #1e293b)' },
  dad: { name: 'Dad', letter: 'D', gradient: 'linear-gradient(135deg, #334155, #0f172a)' },
  test: { name: 'Test phone', letter: 'T', gradient: 'linear-gradient(135deg, #94a3b8, #64748b)' },
};
