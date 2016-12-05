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

import {
  IObservableString, ObservableString
} from '../common/observablestring';


/**
 * An implementation of the code editor model using code mirror.
 */
export
class CodeMirrorModel implements CodeEditor.IModel {
  /**
   * A signal emitted when a mimetype changes.
   */
  readonly mimeTypeChanged: ISignal<this, IChangedArgs<string>>;

  /**
   * Construct a new codemirror model.
   */
  constructor(doc: CodeMirror.Doc = new CodeMirror.Doc('')) {
    this._doc = doc;
    CodeMirror.on(this.doc, 'change', (instance, change) => {
      this._onDocChange(instance, change);
    });
    this._value.changed.connect(this._onValueChanged, this);
  }

  /**
   * Get the value of the model.
   */
  get value(): IObservableString {
    return this._value;
  }

  /**
   * Get the selections for the model.
   */
  get selections(): CodeEditor.ISelections {
    return this._selections;
  }

  /**
   * An underying CodeMirror document.
   */
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
    this._selections.dispose();
    this._value.dispose();
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
   * Handle value changes.
   */
  private _onValueChanged(value: IObservableString, change: ObservableString.IChangedArgs): void {
    if (this._changeGuard) {
      return;
    }
    let doc = this._doc;
    switch (change.type) {
    case 'set':
      doc.setValue(change.value);
      break;
    default:
      let from = doc.posFromIndex(change.start);
      let to = doc.posFromIndex(change.end);
      doc.replaceRange(change.value, from, to);
    }
  }

  /**
   * Handles document changes.
   */
  protected _onDocChange(doc: CodeMirror.Doc, change: CodeMirror.EditorChange) {
    if (change.origin !== 'setValue') {
      this._changeGuard = true;
      this._value.text = doc.getValue();
      this._changeGuard = false;
    }
  }

  private _mimetype = '';
  private _value = new ObservableString();
  private _isDisposed = false;
  private _doc: CodeMirror.Doc;
  private _changeGuard = false;
  private _selections = new CodeEditor.Selections();
}


/**
 * The signals for the `CodeMirrorModel` class.
 */
defineSignal(CodeMirrorModel.prototype, 'mimeTypeChanged');
