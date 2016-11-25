// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as CodeMirror from 'codemirror';

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
   * A signal emitted when a content of the model changed.
   */
  valueChanged: ISignal<this, IChangedArgs<string>>;

  /**
   * A signal emitted when a mimetype changes.
   */
  mimeTypeChanged: ISignal<this, IChangedArgs<string>>;

  readonly owners = new ObservableVector<CodeEditor.IModelOwner>();

  /**
   * Construct a new codemirror model.
   */
  constructor() {
    this._doc = new CodeMirror.Doc('');
  }

  get doc(): CodeMirror.Doc {
    return this._doc;
  }

  get isDisposed() {
    return this._isDisposed;
  }

  /**
   * Dipose of the resources used by the model.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    clearSignalData(this);
    this.owners.clear();
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

  /**
   * Update mime type from given path.
   */
  setMimeTypeFromPath(path: string): void {
    let mode = CodeMirror.findModeByFileName(path);
    requireMode(mode).then((modespec) => {
      this.mimeType = modespec.mime;
    });
  }

  private _mimetype = '';
  private _doc: CodeMirror.Doc;
  protected _isDisposed = false;
}


defineSignal(CodeMirrorModel.prototype, 'valueChanged');
defineSignal(CodeMirrorModel.prototype, 'mimeTypeChanged');
