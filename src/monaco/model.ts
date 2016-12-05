// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

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
  findMimeTypeForLanguageId, findLanguageIdForMimeType
} from './language';

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
   * Get the selections for the model.
   */
  readonly selections: CodeEditor.ISelections = new CodeEditor.Selections();

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

  /**
   * An underlying monaco editor model.
   */
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
    this.fireValueChanged();
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
   * A mime type of the model.
   */
  get mimeType(): string {
    return findMimeTypeForLanguageId(this.model.getModeId());
  }
  set mimeType(newValue: string) {
    const newLanguage = findLanguageIdForMimeType(newValue);
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
   * Handles a model change event.
   */
  protected _onDidChangeMode(event: monaco.editor.IModelModeChangedEvent) {
    this.fireMimeTypeChanged(event.oldMode.getId(), event.newMode.getId());
  }

  /**
   * Handles a content change event.
   */
  protected _onDidContentChanged(event: monaco.editor.IModelContentChangedEvent2) {
    this.fireValueChanged();
  }

  /**
   * Emits a mime type changed event.
   */
  protected fireMimeTypeChanged(oldLanguage: string | null, newLanguage: string | null) {
    const oldValue = findMimeTypeForLanguageId(oldLanguage);
    const newValue = findMimeTypeForLanguageId(newLanguage);
    if (oldValue !== newValue) {
      this.mimeTypeChanged.emit({
        name: 'mimeType',
        oldValue,
        newValue
      });
    }
  }

  /**
   * Emits a value changed event.
   */
  protected fireValueChanged() {
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

  protected _isDisposed = false;
  protected _value: string;
  protected _model: monaco.editor.IModel | null;
  protected _listeners: monaco.IDisposable[] = [];

}

/**
 * Registers signals for `MonacoModel`.
 */
defineSignal(MonacoModel.prototype, 'valueChanged');
defineSignal(MonacoModel.prototype, 'mimeTypeChanged');

/**
 * A namespace for `MonacoModel`.
 */
export
namespace MonacoModel {
  /**
   * Converts a code editor position to a monaco position.
   */
  export
  function toMonacoPosition(position: CodeEditor.IPosition): monaco.IPosition {
    return {
      lineNumber: position.line + 1,
      column: position.column + 1
    };
  }
  /**
   * Converts a monaco position to a code editor position. 
   */
  export
  function toPosition(position: monaco.Position): CodeEditor.IPosition {
    return {
      line: position.lineNumber - 1,
      column: position.column - 1
    };
  }
}
