// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/**
 * Replaces MathJax's `#root/root.js` in the bundle, whose `import.meta.url`
 * webpack turns into the absolute path of the build folder. MathJax uses the
 * root only when it cannot find its script, and an empty root keeps the
 * requests it then makes on the Jupyter server.
 */
export function mjxRoot(): string {
  return '';
}
