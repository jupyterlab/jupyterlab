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

import {
  IObservableString, ObservableString
} from '../common/observablestring';

/**
 * An implementation of the code editor model using monaco.
 */
export
  class MonacoModel implements CodeEditor.IModel {
  /**
   * A signal emitted when a mimetype changes.
   */
  readonly mimeTypeChanged: ISignal<this, IChangedArgs<string>>;

  /**
   * Construct a new model.
   */
  constructor() {
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
    this.fireMimeTypeChanged(oldLanguage, this.model.getModeId());
  }

  protected disconnectModel(): void {
    if (this._model) {
      while (this._listeners.length !== 0) {
        this._listeners.pop() !.dispose();
      }
      this._model = null;
    }
  }

  protected connectModel(): void {
    const model = this.model;
    this._listeners.push(model.onDidChangeMode(event => this._onDidChangeMode(event)));
    this._listeners.push(model.onDidChangeContent(event => this._onDidContentChanged(event)));
    this.updateValue();
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
   * Handle value changes.
   */
  private _onValueChanged(value: IObservableString, change: ObservableString.IChangedArgs): void {
    if (this._changeGuard) {
      return;
    }
    const model = this.model;
    switch (change.type) {
      case 'set':
        model.setValue(change.value);
        break;
      default:
        const start = model.getPositionAt(change.start);
        const end = model.getPositionAt(change.end);
        const range = new monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column);
        const text = change.value;
        model.applyEdits([{
          identifier: null!,
          range, text,
          forceMoveMarkers: true
        }]);
    }
  }

  /**
   * Handles a content change event.
   */
  protected _onDidContentChanged(event: monaco.editor.IModelContentChangedEvent2) {
    this.updateValue();
  }

  /**
   * Update a value with a editor model's value.
   */
  protected updateValue(): void {
    this._changeGuard = true;
    this._value.text = this.model.getValue();
    this._changeGuard = false;
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

  protected _isDisposed = false;
  protected _value = new ObservableString();
  protected _model: monaco.editor.IModel | null = null;
  protected _listeners: monaco.IDisposable[] = [];
  protected _changeGuard = false;
  protected _selections = new CodeEditor.Selections();

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
