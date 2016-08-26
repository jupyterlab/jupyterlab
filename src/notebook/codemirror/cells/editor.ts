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
  CodeMirrorWidget
} from '../../../codemirror/widget';

import {
  IChangedArgs
} from '../../../common/interfaces';

import {
  ICellModel
} from '../../cells/model';

import {
  ICellEditorWidget, EdgeLocation, ITextChange, ICompletionRequest, ICoords
} from '../../cells/editor';


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
class CodeMirrorCellEditorWidget extends CodeMirrorWidget implements ICellEditorWidget {
  /**
   * Construct a new cell editor widget.
   */
  constructor(options: CodeMirror.EditorConfiguration = {}) {
    super(options);
    this.addClass(CELL_EDITOR_CLASS);

    CodeMirror.on(this.editor.getDoc(), 'change', (instance, change) => {
      this.onDocChange(instance, change);
    });
    CodeMirror.on(this.editor, 'keydown', (instance, evt) => {
      this.onEditorKeydown(instance, evt);
    });
  }

  /**
   * A signal emitted when a tab (text) completion is requested.
   */
  completionRequested: ISignal<ICellEditorWidget, ICompletionRequest>;

  /**
   * A signal emitted when either the top or bottom edge is requested.
   */
  edgeRequested: ISignal<ICellEditorWidget, EdgeLocation>;

  /**
   * A signal emitted when a text change is completed.
   */
  textChanged: ISignal<ICellEditorWidget, ITextChange>;

  /**
   * The cell model used by the editor.
   */
  get model(): ICellModel {
    return this._model;
  }
  set model(model: ICellModel) {
    if (!model && !this._model || model === this._model) {
      return;
    }

    let doc = this.editor.getDoc();

    // If the model is being replaced, disconnect the old signal handler.
    if (this._model) {
      this._model.stateChanged.disconnect(this.onModelStateChanged, this);
    }

    if (!model) {
      doc.setValue('');
      this._model = null;
      return;
    }

    this._model = model;
    doc.setValue(this._model.source || '');
    this._model.stateChanged.connect(this.onModelStateChanged, this);
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
   * Dispose of the resources held by the editor.
   */
  dispose(): void {
    this._model = null;
    super.dispose();
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
   * Handle changes in the model state.
   */
  protected onModelStateChanged(model: ICellModel, args: IChangedArgs<any>): void {
    switch (args.name) {
    case 'source':
      let doc = this.editor.getDoc();
      if (doc.getValue() !== args.newValue) {
        doc.setValue(args.newValue);
      }
      break;
    default:
      break;
    }
  }

  /**
   * Handle change events from the document.
   */
  protected onDocChange(doc: CodeMirror.Doc, change: CodeMirror.EditorChange): void {
    let model = this.model;
    let editor = this.editor;
    let oldValue = model.source;
    let newValue = doc.getValue();
    let cursor = doc.getCursor();
    let line = cursor.line;
    let ch = cursor.ch;
    let chHeight = editor.defaultTextHeight();
    let chWidth = editor.defaultCharWidth();
    let coords = editor.charCoords({ line, ch }, 'page') as ICoords;
    let position = editor.getDoc().indexFromPos({ line, ch });

    model.source = newValue;
    this.textChanged.emit({
      line, ch, chHeight, chWidth, coords, position, oldValue, newValue
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
      this.edgeRequested.emit('top');
      return;
    }

    let lastLine = doc.lastLine();
    let lastCh = doc.getLineHandle(lastLine).text.length;
    if (line === lastLine && ch === lastCh && event.keyCode === DOWN_ARROW) {
      this.edgeRequested.emit('bottom');
      return;
    }
  }

  /**
   * Handle a tab key press.
   */
  protected onTabEvent(event: KeyboardEvent, ch: number, line: number): void {
    let editor = this.editor;
    let doc = editor.getDoc();

    // If there is a text selection, no completion requests should be emitted.
    if (doc.getSelection()) {
      return;
    }

    let currentValue = doc.getValue();
    let currentLine = currentValue.split('\n')[line];
    let chHeight = editor.defaultTextHeight();
    let chWidth = editor.defaultCharWidth();
    let coords = editor.charCoords({ line, ch }, 'page') as ICoords;
    let position = editor.getDoc().indexFromPos({ line, ch });

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

    let data = {
      line, ch, chHeight, chWidth, coords, position, currentValue
    };
    this.completionRequested.emit(data as ICompletionRequest);
  }

  private _model: ICellModel = null;
}


// Define the signals for the `CodeMirrorCellEditorWidget` class.
defineSignal(CodeMirrorCellEditorWidget.prototype, 'completionRequested');
defineSignal(CodeMirrorCellEditorWidget.prototype, 'edgeRequested');
defineSignal(CodeMirrorCellEditorWidget.prototype, 'textChanged');
