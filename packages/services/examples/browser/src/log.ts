// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

export function log(content: any): void {
  let el = document.getElementById('output');
  if (typeof content !== 'string') {
    content = JSON.stringify(content);
  }
  el.textContent = el.textContent + '\n' + content;
  console.log(content);
}
