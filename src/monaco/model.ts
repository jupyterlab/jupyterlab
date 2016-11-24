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
export
class MonacoModel implements CodeEditor.IModel {

  /**
   * A signal emitted when a content of the model changed.
   */
  valueChanged: ISignal<this, IChangedArgs<string>>;

  /**
   * A signal emitted when a mimetype changes.
   */
  mimeTypeChanged: ISignal<this, IChangedArgs<string>>;

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
    this.disconnectModel();
    clearSignalData(this);
  }

  get model(): monaco.editor.IModel {
    if (this._model) {
      return this._model;
    }
    throw new Error('model has not been initialized');
  }

  set model(model: monaco.editor.IModel) {
    const oldLanguage = this._model && this.model.getModeId();
    this.disconnectModel();
    this._model = model;
    this.connectModel();
    this.fireContentChanged();
    this.fireMimeTypeChanged(oldLanguage, this.model.getModeId());
  }

  protected disconnectModel(): void {
    if (this._model) {
      while (this._listeners.length !== 0) {
        this._listeners.pop()!.dispose();
      }
      this._model = null;
    }
  }

  protected connectModel(): void {
    const model = this.model;
    this._listeners.push(model.onDidChangeMode(event => this._onDidChangeMode(event)));
    this._listeners.push(model.onDidChangeContent(event => this._onDidContentChanged(event)));
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
    const cursor = this.findCursorPosition(uuid);
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
    const selections = this.selections;
    const cursor = find(selections, (selection) => { return selection.start === selection.end; });
    if (cursor) {
      selections.remove(cursor);
    }
    const offset = this.getOffsetAt(position);
    selections.pushBack({
      start: offset,
      end: offset,
      uuid
    });
  };

  protected findCursorPosition(uuid: string): CodeEditor.ITextSelection {
    const selections = this.selections;
    const cursor = find(selections, (selection) => {
      return selection.start === selection.end && selection.uuid === uuid;
    });
    return cursor;
  }

  /**
   * A mime type of the model.
   */
  get mimeType(): string {
    return findMimeTypeForLanguage(this.model.getModeId());
  }
  set mimeType(newValue: string) {
    const newLanguage = findLanguageForMimeType(newValue);
    monaco.editor.setModelLanguage(this.model, newLanguage);
  }

  /**
   * The text stored in the model.
   */
  get value(): string {
    return this.model.getValue();
  }
  set value(newValue: string) {
    this.model.setValue(newValue);
  }

  /**
   * Get the number of lines in the model.
   */
  get lineCount(): number {
    return this.model.getLineCount();
  }

  /**
   * Returns the content for the given line number.
   */
  getLine(line: number): string {
    return this.model.getLineContent(line + 1);
  }

  /**
   * Find an offset for the given position.
   */
  getOffsetAt(position: CodeEditor.IPosition): number {
    return this.model.getOffsetAt(MonacoModel.toMonacoPosition(position));
  }

  /**
   * Find a position fot the given offset.
   */
  getPositionAt(offset: number): CodeEditor.IPosition {
    return MonacoModel.toPosition(this.model.getPositionAt(offset));
  }

  /**
   * Undo one edit (if any undo events are stored).
   */
  undo(): void {
    this.model.undo();
  }

  /**
   * Redo one undone edit.
   */
  redo(): void {
    this.model.redo();
  }

  /**
   * Clear the undo history.
   */
  clearHistory(): void {
    this.model.setEditableRange(this.model.getEditableRange());
  }

  /**
   * Update mime type from given path.
   */
  setMimeTypeFromPath(path: string): void {
    const languageId = findLanguageForPath(path);
    monaco.editor.setModelLanguage(this.model, languageId);
  }

  protected _onDidChangeMode(event: monaco.editor.IModelModeChangedEvent) {
    this.fireMimeTypeChanged(event.oldMode.getId(), event.newMode.getId());
  }

  protected _onDidContentChanged(event: monaco.editor.IModelContentChangedEvent2) {
    this.fireContentChanged();
  }

  protected fireMimeTypeChanged(oldLanguage: string | null, newLanguage: string | null) {
    const oldValue = findMimeTypeForLanguage(oldLanguage);
    const newValue = findMimeTypeForLanguage(newLanguage);
    if (oldValue !== newValue) {
      this.mimeTypeChanged.emit({
        name: 'mimeType',
        oldValue,
        newValue
      });
    }
  }

  protected fireContentChanged() {
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

  protected _isDisposed = false;
  protected _value: string;
  protected _model: monaco.editor.IModel | null;
  protected _listeners: monaco.IDisposable[] = [];
  protected _selections = new ObservableVector<CodeEditor.ITextSelection>();

}

defineSignal(MonacoModel.prototype, 'valueChanged');
defineSignal(MonacoModel.prototype, 'mimeTypeChanged');

export
namespace MonacoModel {
  export
  function toMonacoPosition(position: CodeEditor.IPosition): monaco.IPosition {
    return {
      lineNumber: position.line + 1,
      column: position.column + 1
    };
  }
  export
  function toPosition(position: monaco.Position): CodeEditor.IPosition {
    return {
      line: position.lineNumber - 1,
      column: position.column - 1
    };
  }
}
