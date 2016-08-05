// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JSONObject
} from 'phosphor/lib/algorithm/json';

import {
  ISignal
} from 'phosphor-signaling';

import {
  Widget
} from 'phosphor-widget';

import {
  IChangedArgs
} from '../../common/interfaces';

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
  left: number;

  /**
   * The right coordinate value.
   */
  right: number;

  /**
   * The top coordinate value.
   */
  top: number;

  /**
   * The bottom coordinate value.
   */
  bottom: number;
}

/**
 * An interface describing the state of the editor in an event.
 */
export
interface IEditorState extends JSONObject {
  /**
   * The character number of the editor cursor within a line.
   */
  ch: number;

  /**
   * The height of a character in the editor.
   */
  chHeight: number;

  /**
   * The width of a character in the editor.
   */
  chWidth: number;

  /**
   * The line number of the editor cursor.
   */
  line: number;

  /**
   * The coordinate position of the cursor.
   */
  coords: ICoords;

  /**
   * The cursor position of the request, including line breaks.
   */
  position: number;
}


/**
 * An interface describing editor text changes.
 */
export
interface ITextChange extends IEditorState {
  /**
   * The old value of the editor text.
   */
  oldValue: string;

  /**
   * The new value of the editor text.
   */
  newValue: string;
}


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

export interface ICellEditorWidget extends Widget {

  model: ICellModel
  edgeRequested: ISignal<ICellEditorWidget, EdgeLocation>
  textChanged: ISignal<ICellEditorWidget, ITextChange>
  completionRequested: ISignal<ICellEditorWidget, ICompletionRequest>
  lineNumbers: boolean

  setMimeType(mimeType: string): void
  setReadOnly(readOnly: boolean): void

  getLastLine(): number

  getCursorPosition(): number
  setCursorPosition(cursorPosition:number): void
  setCursor(line:number, character:number): void

  focus(): void

}
