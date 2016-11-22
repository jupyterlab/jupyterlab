// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ISignal, clearSignalData, defineSignal
} from 'phosphor/lib/core/signaling';

import {
  find
} from 'phosphor/lib/algorithm/searching';

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
  findLanguageForMimeType, findMimeTypeForLanguage, findLanguageForPath
} from './languages';

/**
 * An implementation of the code editor model using monaco.
 */
export class MonacoModel implements CodeEditor.IModel {

  /**
   * A signal emitted when a content of the model changed.
   */
  valueChanged: ISignal<this, IChangedArgs<string>>;

  /**
   * A signal emitted when a mimetype changes.
   */
  mimeTypeChanged: ISignal<this, IChangedArgs<string>>;

  /**
   * Construct a new monaco model.
   */
  constructor(model: monaco.editor.IModel = monaco.editor.createModel('')) {
    this._model = model;
    this._value = this._model.getValue();
    model.onDidChangeMode(event => this._onDidChangeMode(event));
    model.onDidChangeContent(event => this._onDidChangeContent(event));
  }

  protected _onDidChangeMode(event: monaco.editor.IModelModeChangedEvent) {
    const oldValue = findMimeTypeForLanguage(event.oldMode.getId());
    const newValue = findMimeTypeForLanguage(event.newMode.getId());
    if (oldValue !== newValue) {
      this.mimeTypeChanged.emit({
        name: 'mimeType',
        oldValue,
        newValue
      });
    }
  }

  protected _onDidChangeContent(event: monaco.editor.IModelContentChangedEvent2) {
    const oldValue = this._value;
    const newValue = this.value;
    if (oldValue !== newValue) {
      this.valueChanged.emit({
        name: 'value',
        oldValue,
        newValue
      });
    }
  }

  get model(): monaco.editor.IModel {
    return this._model;
  }

  /**
   * Whether the editor is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Dipose of the resources used by the editor.
   */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    this._model.dispose();
    this._model = null;
    clearSignalData(this);
  }

  /**
   * Get the selections for the model.
   */
  get selections(): ObservableVector<CodeEditor.ITextSelection> {
    return this._selections;
  }

  /**
   * Returns the primary cursor position of an editor.
   * 
   * #### Notes
   * @param uuid - The uuid of an editor.
   */
  getCursorPosition(uuid: string): CodeEditor.IPosition {
    let cursor = this.findCursorPosition(uuid);
    if (cursor) {
      return this.getPositionAt(cursor.start);
    }
    return null;
  }

  /**
   * Set the primary cursor position of a editor.
   * 
   * #### Notes
   * @param uuid - The uuid of an editor.
   * @param position - The primary cursor position of an editor.
   */
  setCursorPosition(uuid: string, position: CodeEditor.IPosition): void {
    let selections = this.selections;
    let cursor = find(selections, (selection) => { return selection.start === selection.end; });
    if (cursor) {
      selections.remove(cursor);
    }
    let offset = this.getOffsetAt(position);
    selections.pushBack({
      start: offset,
      end: offset,
      uuid
    });
  };

  private findCursorPosition(uuid: string): CodeEditor.ITextSelection {
    let selections = this.selections;
    let cursor = find(selections, (selection) => { return selection.start === selection.end && selection.uuid === uuid; });
    return cursor;
  }

  /**
   * A mime type of the model.
   */
  get mimeType(): string {
    return findMimeTypeForLanguage(this._model.getModeId());
  }
  set mimeType(newValue: string) {
    const newLanguage = findLanguageForMimeType(newValue);
    monaco.editor.setModelLanguage(this._model, newLanguage);
  }

  /**
   * The text stored in the model.
   */
  get value(): string {
    return this._model.getValue();
  }
  set value(newValue: string) {
    this._model.setValue(newValue);
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
    return this._model.getOffsetAt(MonacoModel.toMonacoPosition(position));
  }

  /**
   * Find a position fot the given offset.
   */
  getPositionAt(offset: number): CodeEditor.IPosition {
    return MonacoModel.toPosition(this._model.getPositionAt(offset));
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
    const languageId = findLanguageForPath(path);
    monaco.editor.setModelLanguage(this._model, languageId);
  }

  private _isDisposed = false;
  private _value: string;
  private _model: monaco.editor.IModel;
  private _selections = new ObservableVector<CodeEditor.ITextSelection>();

}

export namespace MonacoModel {
  export function toMonacoPosition(position: CodeEditor.IPosition): monaco.IPosition {
    return {
      lineNumber: position.line + 1,
      column: position.column + 1
    };
  }
  export function toPosition(position: monaco.Position): CodeEditor.IPosition {
    return {
      line: position.lineNumber - 1,
      column: position.column - 1
    };
  }
}

defineSignal(MonacoModel.prototype, 'valueChanged');
defineSignal(MonacoModel.prototype, 'mimeTypeChanged');
