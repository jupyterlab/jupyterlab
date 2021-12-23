declare module '@codemirror/legacy-modes/mode/python' {
  import { StreamParser } from '@codemirror/stream-parser';

  export const python: StreamParser<unknown>;
  export const cython: StreamParser<unknown>;

  export function mkPython(parserConf: any): StreamParser<unknown>;
}
