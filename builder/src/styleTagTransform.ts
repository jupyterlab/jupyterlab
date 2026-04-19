// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/**
 * Custom styleTagTransform for style-loader.
 *
 * Parses a `@css-package: NAME` comment (injected by css-package-loader)
 * from the CSS text, sets a `data-package` attribute on the `<style>`
 * element, and strips the marker comment before inserting the CSS.
 *
 * This runs in the browser at module evaluation time.
 */
function styleTagTransform(css: string, styleElement: HTMLStyleElement): void {
  const match = css.match(/^\/\* @css-package: ([^\s*]+) \*\/\n?/);
  if (match) {
    styleElement.setAttribute('data-package', match[1]);
    css = css.slice(match[0].length);
  }
  while (styleElement.firstChild) {
    styleElement.removeChild(styleElement.firstChild);
  }
  styleElement.appendChild(document.createTextNode(css));
}

module.exports = styleTagTransform;
