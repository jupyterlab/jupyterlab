// Type definitions for sort-package-json v1.7.1
// https://github.com/keithamus/sort-package-json
// Definitions by: Steven Silvester <https://github.com/blink1073>

declare module 'prompt' {
  export function start(): void;

  export function get(
    items: string[],
    callback: (err: Error, result: any) => void
  ): void;
}
