// Type definitions for CodeMirror
// Project: https://github.com/marijnh/CodeMirror
// Definitions by: mihailik <https://github.com/mihailik>
// Definitions: https://github.com/borisyankov/DefinitelyTyped

import * as CodeMirror from 'codemirror';

/**
 * Define extra codemirror types that do not exist in the DefinitelyTyped
 * type resources
 */
declare module 'codemirror' {
  /**
   * id will be the id for the defined mode. Typically, you should use this second argument to defineMode as your module scope function
   * (modes should not leak anything into the global scope!), i.e. write your whole mode inside this function.
   */
  function defineMode(
    id: string,
    modefactory: ModeFactory<any>,
    base: any
  ): void;

  /**
   * Define a mimetype.
   */
  function defineMIME(mimetype: string, mode: any): void;

  interface modeinfo {
    ext: string[];
    mime: string;
    mode: string;
    name: string;
  }
  var modeInfo: modeinfo[];

  /**
   * A mode that encompasses many mode types.
   */
  function multiplexingMode<T>(...modes: any[]): Mode<T>;

  /**
   * Fired on a keydown event on the editor.
   */
  function on(
    editor: Editor,
    eventName: 'keydown',
    handler: (instance: Editor, event: KeyboardEvent) => void
  ): void;
  function off(
    editor: Editor,
    eventName: 'keydown',
    handler: (instance: Editor, event: KeyboardEvent) => void
  ): void;

  interface Editor {
    /** Scrolls the given element into view. pos is a { from, to } object, in editor-local coordinates.
     The margin parameter is optional. When given, it indicates the amount of pixels around the given area that should be made visible as well. */
    scrollIntoView(
      pos: { from: CodeMirror.Position; to: CodeMirror.Position },
      margin?: number
    ): void;

    /** Trigger key events onto the editor instance. Not for production use, only for testing.
     See this comment: https://github.com/codemirror/CodeMirror/issues/1935#issuecomment-28178991 */
    triggerOnKeyDown(event: Event): void;
  }

  interface Selection {
    /**
     * the fixed side of the selection
     */
    anchor: Position;
    /**
     * the side of the selection that moves
     */
    head: Position;
  }

  // findMode* functions are from loading the codemirror/mode/meta module
  interface modespec {
    ext?: string[];
    name?: string;
    mode: string;
    mime: string;
  }

  function runMode(
    code: string,
    mode: modespec | string,
    el: HTMLElement
  ): void;

  function findModeByName(name: string): modespec;
  function findModeByExtension(name: string): modespec;
  function findModeByFileName(name: string): modespec;
  function findModeByMIME(mime: string): modespec;

  // come back to this later
  interface Context {
    state: any;
    doc: Document;
    line: number;
    maxLookAhead: number;
    baseTokens: string[];
    baseTokenPos: number;
  }

  interface StringStream {
    lineOracle: Context;
  }
}
