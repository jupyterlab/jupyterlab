/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

declare module '@codemirror/legacy-modes/mode/python' {
  import { StreamParser } from '@codemirror/language';

  export const python: StreamParser<unknown>;
  export const cython: StreamParser<unknown>;

  export function mkPython(parserConf: any): StreamParser<unknown>;
}
