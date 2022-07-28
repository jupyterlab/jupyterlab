/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

// Type definitions for json2html v0.1.2
// https://github.com/frozzare/json-to-html
// Definitions by: Steven Silvester <https://github.com/blink1073>

declare module 'json-to-html' {
  function render(value: any): string;
  export = render;
}
