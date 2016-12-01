// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as CodeMirror
  from 'codemirror';

import {
  find
} from 'phosphor/lib/algorithm/searching';

import {
  ISignal, clearSignalData, defineSignal
} from 'phosphor/lib/core/signaling';

import {
  CodeEditor
} from '../codeeditor/editor';

import {
  requireMode
} from './';

import {
  IChangedArgs
} from '../common/interfaces';

import {
  ObservableVector
} from '../common/observablevector';


/**
 * An implementation of the code editor model using code mirror.
 */
export
class CodeMirrorModel implements CodeEditor.IModel {
  /**
   * Construct a new codemirror model.
   */
  constructor() {
    let doc = this._doc = new CodeMirror.Doc('');
    this._selections.changed.connect(this._onSelectionChanged, this);
    CodeMirror.on(doc, 'cursorActivity', this._onCursorActivity.bind(this));
    CodeMirror.on(doc, 'beforeSelectionChange',
                  this._onDocSelectionChanged.bind(this));
  }

  get doc(): CodeMirror.Doc {
    return this._doc;
  }

  /**
   * A signal emitted when a content of the model changed.
   */
  valueChanged: ISignal<this, IChangedArgs<string>>;

  /**
   * A signal emitted when a mimetype changes.
   */
  mimeTypeChanged: ISignal<this, IChangedArgs<string>>;

  /**
   * Whether the model is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Dipose of the resources used by the model.
   */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    clearSignalData(this);
  }

  /**
   * A mime type of the model.
   */
  get mimeType(): string {
    return this._mimetype;
  }
  set mimeType(newValue: string) {
    let oldValue = this._mimetype;
    if (oldValue === newValue) {
      return;
    }
    this._mimetype = newValue;
    this.mimeTypeChanged.emit({
      name: 'mimeType',
      oldValue,
      newValue
    });
  }

  /**
   * The text stored in the model.
   */
  get value(): string {
    return this._doc.getValue();
  }
  set value(newValue: string) {
    let oldValue = this._doc.getValue();
    if (oldValue === newValue) {
      return;
    }
    this._doc.setValue(newValue);
    this.valueChanged.emit({
      name: 'value',
      oldValue,
      newValue
    });
  }

  /**
   * Get the selections for the model.
   */
  get selections(): ObservableVector<CodeEditor.ITextSelection> {
    return this._selections;
  }

  /**
   * Returns the primary cursor position.
   */
  getCursorPosition(): CodeEditor.IPosition {
    let selections = this.selections;
    let cursor = find(selections, (selection) => { return selection.start === selection.end; });
    if (cursor) {
      return this.getPositionAt(cursor.start);
    }
    return null;
  }

  /**
   * Get the number of lines in the model.
   */
  get lineCount(): number {
    return this._doc.lineCount();
  }

  /**
   * Returns the content for the given line number.
   */
  getLine(line: number): string {
    return this._doc.getLine(line);
  }

  /**
   * Find an offset for the given position.
   */
  getOffsetAt(position: CodeEditor.IPosition): number {
    return this._doc.indexFromPos({
      ch: position.column,
      line: position.line
    });
  }

  /**
   * Find a position fot the given offset.
   */
  getPositionAt(offset: number): CodeEditor.IPosition {
    let { ch, line } = this._doc.posFromIndex(offset);
    return { line, column: ch };
  }

  /**
   * Undo one edit (if any undo events are stored).
   */
  undo(): void {
    this._doc.undo();
  }

  /**
   * Redo one undone edit.
   */
  redo(): void {
    this._doc.redo();
  }

  /**
   * Clear the undo history.
   */
  clearHistory(): void {
    this._doc.clearHistory();
  }

  private _onSelectionChanged(sender: ObservableVector<CodeEditor.ITextSelection>, change: ObservableVector.IChangedArgs<CodeEditor.ITextSelection>): void {
    // TODO
  }

  private _onCursorActivity(): void {
    // TODO
  }

  private _onDocSelectionChanged(): void {
    // TODO
  }

  private _mimetype = '';
  private _isDisposed = false;
  private _doc: CodeMirror.Doc;
  private _selections = new ObservableVector<CodeEditor.ITextSelection>();
}


defineSignal(CodeMirrorModel.prototype, 'valueChanged');
defineSignal(CodeMirrorModel.prototype, 'mimeTypeChanged');
