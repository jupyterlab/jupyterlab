// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JSONObject
} from 'phosphor/lib/algorithm/json';

import {
  ISignal
} from 'phosphor/lib/core/signaling';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  ICellModel,
} from './model';


/**
 * The location of requested edges.
 */
export type EdgeLocation = 'top' | 'bottom';


/**
 * An interface describing editor state coordinates.
 */
export
interface ICoords extends JSONObject {
  /**
   * The left coordinate value.
   */
  readonly left: number;

  /**
   * The right coordinate value.
   */
  readonly right: number;

  /**
   * The top coordinate value.
   */
  readonly top: number;

  /**
   * The bottom coordinate value.
   */
  readonly bottom: number;
}


/**
 * An interface describing the state of the editor in an event.
 */
export
interface IEditorState extends JSONObject {
  /**
   * The character number of the editor cursor within a line.
   */
  readonly ch: number;

  /**
   * The height of a character in the editor.
   */
  readonly chHeight: number;

  /**
   * The width of a character in the editor.
   */
  readonly chWidth: number;

  /**
   * The line number of the editor cursor.
   */
  readonly line: number;

  /**
   * The coordinate position of the cursor.
   */
  readonly coords: ICoords;

  /**
   * The cursor position of the request, including line breaks.
   */
  readonly position: number;
}


/**
 * An interface describing editor text changes.
 */
export
interface ITextChange extends IEditorState {
  /**
   * The old value of the editor text.
   */
  readonly oldValue: string;

  /**
   * The new value of the editor text.
   */
  readonly newValue: string;
}


/**
 * An interface describing completion requests.
 */
export
interface ICompletionRequest extends IEditorState {
  /**
   * The current value of the editor text.
   */
  readonly currentValue: string;
}


/**
 * A widget for a cell editor.
 */
export
interface ICellEditorWidget extends Widget {
  /**
   * The cell model used by the editor.
   */
  model: ICellModel | null;

  /**
   * A signal emitted when either the top or bottom edge is requested.
   */
  edgeRequested: ISignal<ICellEditorWidget, EdgeLocation>;

  /**
   * A signal emitted when a text change is completed.
   */
  textChanged: ISignal<ICellEditorWidget, ITextChange>;

  /**
   * A signal emitted when a completion is requested.
   */
  completionRequested: ISignal<ICellEditorWidget, ICompletionRequest>;

  /**
   * The line numbers state of the editor.
   */
  lineNumbers: boolean;

  /**
   * Change the mime type for an editor.
   */
  setMimeType(mimeType: string): void;

  /**
   * Set whether the editor is read only.
   */
  setReadOnly(readOnly: boolean): void;

  /**
   * Test whether the editor has keyboard focus.
   */
  hasFocus(): boolean;

  /**
   * Returns a zero-based last line number.
   */
  getLastLine(): number;

  /**
   * Returns the position of the cursor.
   */
  getCursorPosition(): number;

  /**
   * Set the position of the cursor.
   *
   * @param position - A new cursor's position.
   */
  setCursorPosition(cursorPosition: number): void;

  /**
   * Set the position of the cursor.
   *
   * @param line - A zero-based line number.
   *
   * @param character - A zero-based character number.
   */
  setCursor(line: number, character: number): void;
}
