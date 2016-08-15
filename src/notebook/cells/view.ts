// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ISignal
} from 'phosphor/lib/core/signaling';

import {
  IEditorView, IEditorState
} from '../../editorwidget/view'

/**
 * The location of requested edges.
 */
export type EdgeLocation = 'top' | 'bottom';

/**
 * An interface describing completion requests.
 */
export
interface ICompletionRequest extends IEditorState {
  /**
   * The current value of the editor text.
   */
  currentValue: string;
}

/**
 * A cell editor vie.
 */
export
interface ICellEditorView extends IEditorView {
  /**
   * A signal emitted when either the top or bottom edge is requested.
   */
  edgeRequested: ISignal<ICellEditorView, EdgeLocation>;

  /**
   * A signal emitted when a completion is requested.
   */
  completionRequested: ISignal<ICellEditorView, ICompletionRequest>;

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