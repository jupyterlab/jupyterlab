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
    this._value = new Private.ObservableDoc(doc);
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


  private _mimetype = '';
  private _value: Private.ObservableDoc;
  private _isDisposed = false;
  private _doc: CodeMirror.Doc;
  private _selections = new CodeEditor.Selections();
}


/**
 * The signals for the `CodeMirrorModel` class.
 */
defineSignal(CodeMirrorModel.prototype, 'mimeTypeChanged');


/**
 * The namespace for module private data.
 */
namespace Private {
  /**
   * An observable string implementation wrapping a Codemirror Doc.
   */
  export
  class ObservableDoc implements IObservableString {
    /**
     * Create a new observable doc.
     */
    constructor(doc: CodeMirror.Doc) {
      this._doc = doc;
      CodeMirror.on(doc, 'change', (instance, change) => {
        this._onDocChange(instance, change);
      });
    }

    /**
     * A signal emitted when the string has changed.
     */
    readonly changed: ISignal<this, ObservableString.IChangedArgs>;

    /**
     * Set the value of the string.
     */
    set text(value: string) {
      this._changeGuard = true;
      this._doc.setValue(value);
      this._changeGuard = false;
      this.changed.emit({
        type: 'set',
        start: 0,
        end: value.length,
        value: value
      });
    }

    /**
     * Get the value of the string.
     */
    get text(): string {
      return this._doc.getValue();
    }

    /**
     * Insert a substring.
     *
     * @param index - The starting index.
     *
     * @param text - The substring to insert.
     */
    insert(index: number, text: string): void {
      let doc = this._doc;
      let pos = doc.posFromIndex(index);
      doc.replaceRange(text, pos, pos);
      this.changed.emit({
        type: 'insert',
        start: index,
        end: index + text.length,
        value: text
      });
    }

    /**
     * Remove a substring.
     *
     * @param start - The starting index.
     *
     * @param end - The ending index.
     */
    remove(start: number, end: number): void {
      let doc = this._doc;
      let from = doc.posFromIndex(start);
      let to = doc.posFromIndex(end);
      let oldValue = doc.getRange(from, to);
      doc.replaceRange('', from, to);
      this.changed.emit({
        type: 'remove',
        start: start,
        end: end,
        value: oldValue
      });
    }

    /**
     * Set the ObservableDoc to an empty string.
     */
    clear(): void {
      this._doc.setValue('');
    }

    /**
     * Test whether the string has been disposed.
     */
    get isDisposed(): boolean {
      return this._isDisposed;
    }

    /**
     * Dispose of the resources held by the string.
     */
    dispose(): void {
      if (this._isDisposed) {
        return;
      }
      this._isDisposed = true;
      clearSignalData(this);
      this._doc = null;
    }

    /**
     * Handles document changes.
     */
    protected _onDocChange(doc: CodeMirror.Doc, change: CodeMirror.EditorChange) {
      if (this._changeGuard) {
        return;
      }
      let value = doc.getValue();
      if (!value.length || change.text.length > 1 || change.removed.length > 1) {
        this.changed.emit({
          type: 'set',
          start: 0,
          end: value.length,
          value
        });
        return;
      }
      let start = doc.indexFromPos(change.from);
      let end = doc.indexFromPos(change.to);
      let changeType: ObservableString.ChangeType = 'insert';
      if (change.origin.indexOf('remove') !== -1) {
        changeType = 'remove';
      }
      this.changed.emit({
        type: changeType,
        start,
        end,
        value
      });
    }

    private _doc: CodeMirror.Doc;
    private _isDisposed : boolean = false;
    private _changeGuard = false;
  }

  // Define the signals for the `ObservableDoc` class.
  defineSignal(ObservableDoc.prototype, 'changed');
}
