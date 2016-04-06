// Type definitions for term.js 0.0.7
// Project: https://github.com/chjj/term.js
// Definitions by: Steven Silvester <https://github.com/blink1073>

declare module 'term.js' {

  /**
   * A terminal configuration.
   */
  export
  interface ITerminalConfig {
    colors?: string[];

    convertEol?: boolean;

    termName?: string;

    rows?: number;

    cols?: number;

    cursorBlink?: boolean;

    visualBell?: boolean;

    popOnBell?: boolean;

    scrollback?: number;

    screenKeys?: boolean;

    useStyle?: boolean;

    useEvents?: boolean;

    useFocus?: boolean;

    useMouse?: boolean;
  }

  /**
   * Typing for a term.js terminal object.
   */
  export
  class Terminal {

    static brokenBold: boolean;

    constructor(config: ITerminalConfig);

    options: ITerminalConfig;

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

  }
}
