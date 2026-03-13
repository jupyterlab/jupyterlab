// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

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
