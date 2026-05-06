// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/* eslint-disable @typescript-eslint/no-explicit-any */

declare module 'json-to-html' {
  function render(value: any): string;
  export = render;
}
