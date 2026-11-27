/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { Platform } from '@lumino/domutils';

const MAC_SYMBOLS: Record<string, string> = {
  Ctrl: '⌃',
  Alt: '⌥',
  Shift: '⇧',
  Accel: '⌘',
  Cmd: '⌘'
};

/**
 * Transform keystrokes for display; use + within a chord, comma-space between
 * chords. Split on ', ' (not ',') so a comma key (e.g. "Ctrl Shift ,") is kept.
 */
export function toSymbols(value: string): string {
  const mapKey = (key: string): string =>
    Platform.IS_MAC
      ? (MAC_SYMBOLS[key] ?? key)
      : key === 'Accel'
        ? 'Ctrl'
        : key;
  return value
    .split(', ')
    .map(chord =>
      chord.trim().split(/\s+/).filter(Boolean).map(mapKey).join(' + ')
    )
    .join(', ');
}
