// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { SourceChange } from '@jupyter/ydoc';

/**
 * Whether a source change should trigger continuous completion.
 *
 * Continuous completion is limited to a single identifier character so that
 * punctuation, whitespace, and multi-character edits such as pastes do not
 * open the completer.
 */
export function isContinuousHintingChange(changed: SourceChange): boolean {
  const sourceChange = changed.sourceChange;
  if (
    sourceChange == null ||
    sourceChange.some(delta => delta.delete != null)
  ) {
    return false;
  }

  const inserted = sourceChange.map(delta => delta.insert ?? '').join('');
  return /^[\p{L}\p{N}\p{M}_$]$/u.test(inserted);
}

/**
 * Determines whether the given MIME type is suitable for code completion.
 *
 * @param mimeType - The MIME type of the current editor context.
 * @returns `true` if the MIME type supports code completion; otherwise, `false`.
 */
export function isHintableMimeType(mimeType: string): boolean {
  const excludedMimeTypes = new Set([
    'text/plain',
    'text/markdown',
    'text/x-ipythongfm',
    'text/x-rst',
    'text/latex',
    'application/json',
    'text/html',
    'text/css'
  ]);

  return !excludedMimeTypes.has(mimeType);
}
