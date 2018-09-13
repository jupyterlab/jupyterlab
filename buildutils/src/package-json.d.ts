// Type definitions for package-json v5.0.0
// https://github.com/sindresorhus/package-json
// Definitions by: Steven Silvester <https://github.com/blink1073>

declare module 'package-json' {
  function inner(name: string, options?: any): Promise<any>;
  export = inner;
}
