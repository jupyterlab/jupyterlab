// Type definitions for term.js 0.0.7
// Project: https://github.com/chjj/term.js
// Definitions by: Steven Silvester <https://github.com/blink1073>


/**
 * Typing for a term.js terminal object.
 */
interface Xterm {

  options: Xterm.IOptions;

  element: HTMLElement;

  colors: string[];

  rows: number;

  cols: number;

  visualBell: boolean;

  popOnBell: boolean;

  scrollback: number;

  on(event: string, callback: (arg: any) => void): void;

  open(el: HTMLElement): void;

  write(msg: string): void;

  resize(width: number, height: number): void;

  destroy(): void;

  focus(): void;
}


interface XtermConstructor {
  new (options?: Xterm.IOptions): Xterm;
  (options?: Xterm.IOptions): Xterm;
  brokenBold: boolean;
}


/**
 * A terminal options.
 */
declare module Xterm {
  interface IOptions {
    colors?: string[];

    theme?: string;

    convertEol?: boolean;

    termName?: string;

    geometry?: number[];

    cursorBlink?: boolean;

    visualBell?: boolean;

    popOnBell?: boolean;

    scrollback?: number;

    debug?: boolean;

    cancelEvents?: boolean;
  }
}


declare var Xterm: XtermConstructor;


declare module 'xterm' {
  export = Xterm;
}
