// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JSONObject
} from 'phosphor/lib/algorithm/json';

import {
  ISignal
} from 'phosphor/lib/core/signaling';

import {
  IEditorView
} from '../../editorwidget/view';

export * from '../../editorwidget/view';

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


/**
 * A widget for a cell editor.
 */
export
interface ICompletableEditorView extends IEditorView {
  /**
   * A signal emitted when a text change is completed.
   */
  textChanged: ISignal<ICompletableEditorView, ITextChange>;

  /**
   * A signal emitted when a completion is requested.
   */
  completionRequested: ISignal<ICompletableEditorView, ICompletionRequest>;

}

/**
 * Utilities for a completable editor widget.
 */
export
namespace ICompletableEditorView {

  /**
   * Tests whether the given widget is an editor widget.
   */
  export
  function is(editorView:any): editorView is ICompletableEditorView {
    return IEditorView.is(editorView) &&
      editorView.textChanged !== undefined &&
      editorView.completionRequested !== undefined;
  }

}