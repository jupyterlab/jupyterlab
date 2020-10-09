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
   * An implementation of the CodeMirror simple mode object
   * https://github.com/codemirror/CodeMirror/blob/master/addon/mode/simple.js
   *
   * Optionally generic over [S]tate names and [T]okens
   */
  interface ISimpleState<S, T> {
    /**
     * The regular expression that matches the token. May be a string or a
     * regex object. When a regex, the ignoreCase flag will be taken into
     * account when matching the token. This regex has to capture groups when
     * the token property is an array. If it captures groups, it must capture
     * all of the string (since JS provides no way to find out where a group
     * matched).
     */
    regex: string | RegExp;
    /**
     * An optional token style. Multiple styles can be specified by separating
     * them with dots or spaces. When this property holds an array of token styles,
     * the regex for this rule must capture a group for each array item.
     */
    token?: T | null | (T | null)[];
    /**
     * When true, this token will only match at the start of the line.
     * (The ^ regexp marker doesn't work as you'd expect in this context because
     * of limitations in JavaScript's RegExp API.)
     */
    sol?: boolean;
    /**
     * When a next property is present, the mode will transfer to the state
     * named by the property when the token is encountered.
     */
    next?: S;
    /**
     * Like next, but instead replacing the current state by the new state, the
     * current state is kept on a stack, and can be returned to with the pop
     * directive.
     */
    push?: S;
    /**
     * When true, and there is another state on the state stack, will cause the
     * mode to pop that state off the stack and transition to it.
     */
    pop?: boolean;
    /**
     * Can be used to embed another mode inside a mode. When present, must hold
     * an object with a spec property that describes the embedded mode, and an
     * optional end end property that specifies the regexp that will end the
     * extent of the mode. When a persistent property is set (and true), the
     * nested mode's state will be preserved between occurrences of the mode.
     */
    mode?: {
      spec: string;
      end?: string | RegExp;
      persistent?: boolean;
    };
    /**
     * When true, this token changes the indentation to be one unit more than
     * the current line's indentation.
     */
    indent?: boolean;
    /**
     * When true, this token will pop one scope off the indentation stack.
     */
    dedent?: boolean;
    /**
     * If a token has its dedent property set, it will, by default, cause lines
     * where it appears at the start to be dedented. Set this property to false
     * to prevent that behavior.
     */
    dedentIfLineStart?: boolean;
  }

  /**
   * Special mode values interpreted by simple modes
   */
  export interface ISimpleMode<S> extends CodeMirror.Mode<S> {
    /**
     * Keys of simple states that should not be indented.
     */
    dontIndentStates?: S[];
  }

  /**
   * A string-keyed set of simple state rule lists.
   */
  export type TSimpleStates<S = string, T = any> = {
    [key: string]: ISimpleState<S, T>[];
  };

  /**
   * The special-case for mode metadata in an otherwise state-keyed map.
   */
  export interface ISimpleMeta<S, T> {
    meta: ISimpleMode<S>;
  }

  /**
   * A top-level simple state.
   */
  export type TSimpleTopState<S, T> = Partial<
    TSimpleStates<S, T> & ISimpleMeta<S, T>
  >;

  /**
   * Create an instance of a simple mode from its config and states.
   */
  function simpleMode<S, T>(config: any, states: TSimpleTopState<S, T>): void;

  /**
   * Define a named simple mode from states and optional metadata
   *
   * ### Notes
   * Provide generic States (S) and Tokens (T) for more precision.
   */
  function defineSimpleMode<S, T>(
    name: string,
    states: TSimpleTopState<S, T>
  ): void;

  /**
   * Define a mimetype.
   */
  function defineMIME(mimetype: string, mode: any): void;

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

  interface EditorConfiguration {
    lineSeparator?: string | null;
  }
}
