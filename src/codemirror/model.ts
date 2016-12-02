// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as CodeMirror
  from 'codemirror';

import {
  ISignal, clearSignalData, defineSignal
} from 'phosphor/lib/core/signaling';

import {
  CodeEditor
} from '../codeeditor/editor';

import {
  IChangedArgs
} from '../common/interfaces';


/**
 * An implementation of the code editor model using code mirror.
 */
export
  class CodeMirrorModel implements CodeEditor.IModel {

  /**
   * A signal emitted when a content of the model changed.
   */
  readonly valueChanged: ISignal<this, IChangedArgs<string>>;

  /**
   * A signal emitted when a mimetype changes.
   */
  readonly mimeTypeChanged: ISignal<this, IChangedArgs<string>>;

  /**
   * Get the selections for the model.
   */
  readonly selections: CodeEditor.ISelections = new CodeEditor.Selections();

  /**
   * Construct a new codemirror model.
   */
  constructor(doc: CodeMirror.Doc = new CodeMirror.Doc('')) {
    this._doc = doc;
    this._value = this.value;
    CodeMirror.on(this.doc, 'change', (instance, change) => {
      this._onDocChange(instance, change);
    });
  }

  get doc(): CodeMirror.Doc {
    return this._doc;
  }

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
    const oldValue = this._mimetype;
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
  set value(value: string) {
    this._doc.setValue(value);
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
    const { ch, line } = this._doc.posFromIndex(offset);
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

  /**
   * Handles document changes.
   */
  protected _onDocChange(doc: CodeMirror.Doc, change: CodeMirror.EditorChange) {
    const oldValue = this._value;
    const newValue = this.value;
    if (oldValue !== newValue) {
      this._value = newValue;
      this.valueChanged.emit({
        name: 'value',
        oldValue,
        newValue
      });
    }
  }

  private _mimetype = '';
  /**
   * A snapshot of a document value before the change, see `_onDocChange`
   */
  private _value: string;
  private _isDisposed = false;
  private _doc: CodeMirror.Doc;
}


defineSignal(CodeMirrorModel.prototype, 'valueChanged');
defineSignal(CodeMirrorModel.prototype, 'mimeTypeChanged');
