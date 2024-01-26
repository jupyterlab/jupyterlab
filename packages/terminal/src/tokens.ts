// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IWidgetTracker, MainAreaWidget } from '@jupyterlab/apputils';
import { Terminal } from '@jupyterlab/services';
import { Token } from '@lumino/coreutils';
import { Widget } from '@lumino/widgets';

/**
 * A class that tracks editor widgets.
 */
export interface ITerminalTracker
  extends IWidgetTracker<MainAreaWidget<ITerminal.ITerminal>> {}

/**
 * The editor tracker token.
 */
export const ITerminalTracker = new Token<ITerminalTracker>(
  '@jupyterlab/terminal:ITerminalTracker',
  `A widget tracker for terminals.
  Use this if you want to be able to iterate over and interact with terminals
  created by the application.`
);

/**
 * The namespace for terminals. Separated from the widget so it can be lazy
 * loaded.
 */
export namespace ITerminal {
  export interface ITerminal extends Widget {
    /**
     * The terminal session associated with the widget.
     */
    session: Terminal.ITerminalConnection;

    /**
     * Get a config option for the terminal.
     */
    getOption<K extends keyof IOptions>(option: K): IOptions[K];

    /**
     * Set a config option for the terminal.
     */
    setOption<K extends keyof IOptions>(option: K, value: IOptions[K]): void;

    /**
     * Refresh the terminal session.
     */
    refresh(): Promise<void>;

    /**
     * Check if terminal has any text selected.
     */
    hasSelection(): boolean;

    /**
     * Paste text into terminal.
     */
    paste(data: string): void;

    /**
     * Get selected text from terminal.
     */
    getSelection(): string | null;
  }
  /**
   * Options for the terminal widget.
   */
  export interface IOptions {
    /**
     * The font family used to render text.
     */
    fontFamily?: string;

    /**
     * The font size of the terminal in pixels.
     */
    fontSize: number;

    /**
     * The line height used to render text.
     */
    lineHeight?: number;

    /**
     * The theme of the terminal.
     */
    theme: Theme;

    /**
     * The amount of buffer scrollback to be used
     * with the terminal
     */
    scrollback?: number;

    /**
     * Whether to shut down the session when closing a terminal or not.
     */
    shutdownOnClose: boolean;

    /**
     * Whether to close the widget when exiting a terminal or not.
     */
    closeOnExit: boolean;

    /**
     * Whether to blink the cursor. Can only be set at startup.
     */
    cursorBlink: boolean;

    /**
     * An optional command to run when the session starts.
     */
    initialCommand: string;

    /**
     * Whether to enable screen reader support.
     */
    screenReaderMode: boolean;

    /**
     * Whether to enable using Ctrl+V to paste.
     *
     * This setting has no effect on macOS, where Cmd+V is available.
     */
    pasteWithCtrlV: boolean;

    /**
     * Whether to auto-fit the terminal to its host element size.
     */
    autoFit?: boolean;

    /**
     * Treat option as meta key on macOS.
     */
    macOptionIsMeta?: boolean;
  }

  /**
   * The default options used for creating terminals.
   */
  export const defaultOptions: IOptions = {
    theme: 'inherit',
    fontFamily: 'Menlo, Consolas, "DejaVu Sans Mono", monospace',
    fontSize: 13,
    lineHeight: 1.0,
    scrollback: 1000,
    shutdownOnClose: false,
    closeOnExit: true,
    cursorBlink: true,
    initialCommand: '',
    screenReaderMode: false, // False by default, can cause scrollbar mouse interaction issues.
    pasteWithCtrlV: true,
    autoFit: true,
    macOptionIsMeta: false
  };

  /**
   * A type for the terminal theme.
   */
  export type Theme = 'light' | 'dark' | 'inherit';

  /**
   * A type for the terminal theme.
   */
  export interface IThemeObject {
    foreground: string;
    background: string;
    cursor: string;
    cursorAccent: string;
    selectionBackground: string;
    selectionInactiveBackground: string;
  }
}
