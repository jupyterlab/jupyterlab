// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
export function log(content: unknown): void {
  const el = document.getElementById('output');
  const text = typeof content === 'string' ? content : JSON.stringify(content);
  if (el) {
    el.textContent = el.textContent + '\n' + text;
  }
  console.debug(text);
}
