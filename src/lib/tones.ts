import { AssetTone } from '../types';

export interface ToneStyle {
  border: string;       // border colour
  bg: string;           // light background tint
  imageBg: string;      // illustration well background
  accent: string;       // accent / illustration stroke colour
  pillBg: string;       // pill background for the tone label
  pillText: string;     // pill text
}

const TONE_MAP: Record<AssetTone, ToneStyle> = {
  sky:     { border: '#bae6fd', bg: '#f0f9ff', imageBg: '#e0f2fe', accent: '#0284c7', pillBg: '#e0f2fe', pillText: '#075985' },
  rose:    { border: '#fecdd3', bg: '#fff1f2', imageBg: '#ffe4e6', accent: '#e11d48', pillBg: '#ffe4e6', pillText: '#9f1239' },
  amber:   { border: '#fde68a', bg: '#fffbeb', imageBg: '#fef3c7', accent: '#d97706', pillBg: '#fef3c7', pillText: '#92400e' },
  lime:    { border: '#bef264', bg: '#f7fee7', imageBg: '#ecfccb', accent: '#65a30d', pillBg: '#ecfccb', pillText: '#3f6212' },
  emerald: { border: '#a7f3d0', bg: '#ecfdf5', imageBg: '#d1fae5', accent: '#059669', pillBg: '#d1fae5', pillText: '#065f46' },
  orange:  { border: '#fed7aa', bg: '#fff7ed', imageBg: '#ffedd5', accent: '#ea580c', pillBg: '#ffedd5', pillText: '#9a3412' },
  violet:  { border: '#ddd6fe', bg: '#f5f3ff', imageBg: '#ede9fe', accent: '#7c3aed', pillBg: '#ede9fe', pillText: '#5b21b6' },
  slate:   { border: '#e2e8f0', bg: '#f8fafc', imageBg: '#f1f5f9', accent: '#475569', pillBg: '#f1f5f9', pillText: '#334155' },
};

export function toneStyle(tone: AssetTone | undefined): ToneStyle {
  return TONE_MAP[tone ?? 'slate'];
}
