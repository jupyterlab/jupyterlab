// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import{
  defineSignal, ISignal
} from 'phosphor/lib/core/signaling';

import * as CodeMirror
  from 'codemirror';

import {
  loadModeByMIME
} from '../../../codemirror';

import {
  CodeMirrorEditorWidget
} from '../../../codemirror/widget';

import {
  IChangedArgs
} from '../../../common/interfaces';

import {
  ICellModel
} from '../../cells/model';

import {
  ICellEditorWidget
} from '../../cells/editor';

import {
  EdgeLocation, ICompletionRequest
} from '../../cells/view';

import {
  ICellEditorPresenter
} from '../../cells/presenter';


/**
 * The key code for the up arrow key.
 */
const UP_ARROW = 38;

/**
 * The key code for the down arrow key.
 */
const DOWN_ARROW = 40;

/**
 * The key code for the tab key.
 */
const TAB = 9;

/**
 * The class name added to cell editor widget nodes.
 */
const CELL_EDITOR_CLASS = 'jp-CellEditor';


/**
 * A code mirror widget for a cell editor.
 */
export
class CodeMirrorCellEditorWidget extends CodeMirrorEditorWidget implements ICellEditorWidget {
  /**
   * Construct a new cell editor widget.
   */
  constructor(options: CodeMirror.EditorConfiguration = {}) {
    super(options);
    this.addClass(CELL_EDITOR_CLASS);

    CodeMirror.on(this.editor, 'keydown', (instance, evt) => {
      this.onEditorKeydown(instance, evt);
    });
  }

  presenter:ICellEditorPresenter

  /**
   * A signal emitted when a tab (text) completion is requested.
   */
  completionRequested: ISignal<ICellEditorWidget, ICompletionRequest>;

  /**
   * A signal emitted when either the top or bottom edge is requested.
   */
  edgeRequested: ISignal<ICellEditorWidget, EdgeLocation>;

  dispose() {
    if (this.isDisposed) {
      return;
    }
    super.dispose();

    if (this.presenter) {
      this.presenter.dispose();
      this.presenter = null
    }
  }

  setValue(value: string) {
    super.setValue(value);
    this.editor.getDoc().clearHistory();
  }

  /**
   * The line numbers state of the editor.
   */
  get lineNumbers(): boolean {
    return this.editor.getOption('lineNumbers');
  }
  set lineNumbers(value: boolean) {
    this.editor.setOption('lineNumbers', value);
  }

  /**
   * Change the mode for an editor based on the given mime type.
   */
  setMimeType(mimeType: string): void {
    loadModeByMIME(this.editor, mimeType);
  }

  /**
   * Set whether the editor is read only.
   */
  setReadOnly(readOnly: boolean): void {
    let option = readOnly ? 'nocursor' : false;
    this.editor.setOption('readOnly', option);
  }

  /**
   * Test whether the editor has keyboard focus.
   */
  hasFocus(): boolean {
    return this.editor.hasFocus();
  }

  /**
   * Returns a zero-based last line number.
   */
  getLastLine(): number {
    return this.editor.getDoc().lastLine();
  }

  /**
   * Get the current cursor position of the editor.
   */
  getCursorPosition(): number {
    let doc = this.editor.getDoc();
    let position = doc.getCursor();
    return doc.indexFromPos(position);
  }

  /**
   * Set the position of the cursor.
   *
   * @param position - A new cursor's position.
   */
  setCursorPosition(position: number): void {
    let doc = this.editor.getDoc();
    doc.setCursor(doc.posFromIndex(position));
  }

  /**
   * Set the position of the cursor.
   *
   * @param line - A zero-based line number.
   *
   * @param character - A zero-based character number.
   */
  setCursor(line: number, character: number): void {
    let doc = this.editor.getDoc();
    doc.setCursor({
      line: line,
      ch: character
    });
  }

  /**
   * Handle keydown events from the editor.
   */
  protected onEditorKeydown(editor: CodeMirror.Editor, event: KeyboardEvent): void {
    let doc = editor.getDoc();
    let cursor = doc.getCursor();
    let line = cursor.line;
    let ch = cursor.ch;

    if (event.keyCode === TAB) {
      // If the tab is modified, ignore it.
      if (event.ctrlKey || event.shiftKey || event.altKey || event.metaKey) {
        return;
      }
      return this.onTabEvent(event, ch, line);
    }

    if (line === 0 && ch === 0 && event.keyCode === UP_ARROW) {
        if (!event.shiftKey) {
          this.edgeRequested.emit('top');
        }
        return;
    }

    let lastLine = doc.lastLine();
    let lastCh = doc.getLineHandle(lastLine).text.length;
    if (line === lastLine && ch === lastCh && event.keyCode === DOWN_ARROW) {
      if (!event.shiftKey) {
        this.edgeRequested.emit('bottom');
      }
      return;
    }
  }

  /**
   * Handle a tab key press.
   */
  protected onTabEvent(event: KeyboardEvent, ch: number, line: number): void {
    const editor = this.editor;
    const doc = editor.getDoc();

    // If there is a text selection, no completion requests should be emitted.
    if (doc.getSelection()) {
      return;
    }

    const currentValue = doc.getValue();
    const currentLine = currentValue.split('\n')[line];

    // A completion request signal should only be emitted if the current
    // character or a preceding character is not whitespace.
    //
    // Otherwise, the default tab action of creating a tab character should be
    // allowed to propagate.
    if (!currentLine.substring(0, ch).match(/\S/)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const completionRequest = <ICompletionRequest>this.getEditorState(line, ch);
    completionRequest.currentValue = currentValue;
    this.completionRequested.emit(completionRequest);
  }

}


// Define the signals for the `CodeMirrorCellEditorWidget` class.
defineSignal(CodeMirrorCellEditorWidget.prototype, 'completionRequested');
defineSignal(CodeMirrorCellEditorWidget.prototype, 'edgeRequested');
defineSignal(CodeMirrorCellEditorWidget.prototype, 'textChanged');
