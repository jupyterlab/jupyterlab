// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/**
 * Returns whether a MIME type corresponds to a Markdown flavor.
 *
 * @private
 * @param mime - MIME type string
 * @returns boolean indicating whether a provided MIME type corresponds to a Markdown flavor
 *
 * @example
 * const bool = isMarkdown('text/markdown');
 * // returns true
 *
 * @example
 * const bool = isMarkdown('text/plain');
 * // returns false
 */
function isMarkdown(mime: string): boolean {
  return (
    mime === 'text/x-ipythongfm' ||
    mime === 'text/x-markdown' ||
    mime === 'text/x-gfm' ||
    mime === 'text/markdown'
  );
}

/**
 * Exports.
 */
export { isMarkdown };
