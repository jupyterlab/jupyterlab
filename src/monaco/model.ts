// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

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
  IChangedArgs
} from '../common/interfaces';

import {
  ObservableVector
} from '../common/observablevector';

import {
    findLanguageForMimeType, findLanguageForUri, findLanguageById
} from './languages';


/**
 * An implementation of the code editor model using monaco.
 */
export
class MonacoModel implements CodeEditor.IModel {
  /**
   * Construct a new monaco model.
   */
  constructor() {
    let model = this._model = monaco.editor.createModel('');
    this._selections.changed.connect(this._onSelectionChanged, this);
    model.onDidChangeMode(event => this._onDidChangeMode(event));
  }

  protected _onDidChangeMode(event: monaco.editor.IModelModeChangedEvent) {
    let oldValue = findLanguageById(event.oldMode.getId()).mimetypes[0];
    let newValue = findLanguageById(event.newMode.getId()).mimetypes[0];
    this.mimeTypeChanged.emit({
      name: 'mimeType',
      oldValue,
      newValue
    });
  }

  get model(): monaco.editor.IModel {
    return this._model;
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
    return findLanguageById(this._model.getModeId()).mimetypes[0];
  }
  set mimeType(newValue: string) {
    let newLanguage = findLanguageForMimeType(newValue);
    monaco.editor.setModelLanguage(this._model, newLanguage);
  }

  /**
   * The text stored in the model.
   */
  get value(): string {
    return this._model.getValue();
  }
  set value(newValue: string) {
    let oldValue = this._model.getValue();
    if (oldValue === newValue) {
      return;
    }
    this._model.setValue(newValue);
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
    return this._model.getLineCount();
  }

  /**
   * Returns the content for the given line number.
   */
  getLine(line: number): string {
    return this._model.getLineContent(line);
  }

  /**
   * Find an offset for the given position.
   */
  getOffsetAt(position: CodeEditor.IPosition): number {
    return this._model.getOffsetAt({
      lineNumber: position.line + 1,
      column: position.column + 1
    });
  }

  /**
   * Find a position fot the given offset.
   */
  getPositionAt(offset: number): CodeEditor.IPosition {
    let { column, lineNumber } = this._model.getPositionAt(offset);
    return { line: lineNumber - 1, column: column - 1 };
  }

  /**
   * Undo one edit (if any undo events are stored).
   */
  undo(): void {
    this._model.undo();
  }

  /**
   * Redo one undone edit.
   */
  redo(): void {
    this._model.redo();
  }

  /**
   * Clear the undo history.
   */
  clearHistory(): void {
    this._model.setEditableRange(this._model.getEditableRange());
  }

  /**
   * Update mime type from given path.
   */
  setMimeTypeFromPath(path: string): void {
    const monacoUri = monaco.Uri.parse(path);
    const languageId = findLanguageForUri(monacoUri);
    monaco.editor.setModelLanguage(this._model, languageId);
  }

  private _onSelectionChanged(sender: ObservableVector<CodeEditor.ITextSelection>, change: ObservableVector.IChangedArgs<CodeEditor.ITextSelection>): void {
    // TODO
  }

  private _isDisposed = false;
  private _model: monaco.editor.IModel;
  private _selections = new ObservableVector<CodeEditor.ITextSelection>();
}


defineSignal(MonacoModel.prototype, 'valueChanged');
defineSignal(MonacoModel.prototype, 'mimeTypeChanged');
