// Type definitions for path-posix v1.0.0
// Project: https://github.com/jden/node-path-posix
// Definitions by: Steven Silvester <https://github.com/blink1073>


declare module 'path-posix' {
  export
  function basename(path: string, ext?: string): string;

  export
  function dirname(path: string): string;

  export
  function extname(path: string): string;

  export
  function format(obj: IPathObject): string;

  export
  function isAbsolute(path: string): boolean;

  export
  function join(...parts: string[]): string;

  export
  function normalize(path: string): string;

  export
  function parse(path: string): IPathObject;

  export
  function relative(from: string, to: string): string;

  export
  function resolve(path: string, ...others: string[]): string;

  export
  var sep: string;

  export
  var delimiter: string;

  export
  interface IPathObject {
    dir?: string;
    root?: string;
    base?: string;
    name?: string;
    ext?: string;
  }
}

