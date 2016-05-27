// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  IDisposable
} from 'phosphor-disposable';

import {
  IChangedArgs
} from 'phosphor-properties';

import {
  ISignal, Signal, clearSignalData
} from 'phosphor-signaling';


/**
 * The location of requested edges.
 */
export
type EdgeLocation = 'top' | 'bottom';


/**
 * And interface describing the state of the editor in an event.
 */
export
interface IEditorState {
  /**
   * The character number of the editor cursor within a line.
   */
  ch: number;

  /**
   * The height of a character in the editor.
   */
  chHeight: number;

  /**
   * The width of a character in the editor.
   */
  chWidth: number;

  /**
   * The line number of the editor cursor.
   */
  line: number;

  /**
   * The coordinate position of the cursor.
   */
  coords: { left: number; right: number; top: number; bottom: number; }
}

/**
 * An interface describing editor text changes.
 */
export
interface ITextChange extends IEditorState {
  /**
   * The old value of the editor text.
   */
  oldValue: string;

  /**
   * The new value of the editor text.
   */
  newValue: string;
}


/**
 * An interface describing completion requests.
 */
export
interface ICompletionRequest extends IEditorState {
  /**
   * The current value of the editor text.
   */
  currentValue: string;
}


/**
 * An interface required for implementing the editor model.
 */
export
interface IEditorModel extends IDisposable {
  /**
   * A signal emitted when the editor model state changes.
   */
  stateChanged: ISignal<IEditorModel, IChangedArgs<any>>;

  /**
   * A signal emitted when a tab (text) completion is requested.
   */
  completionRequested: ISignal<IEditorModel, ICompletionRequest>;

  /**
   * A signal emitted when either the top or bottom edge is requested.
   */
  edgeRequested: ISignal<IEditorModel, EdgeLocation>;

  /**
   * A signal emitted when a text change is completed.
   */
  textChanged: ISignal<IEditorModel, ITextChange>;

  /**
   * The text in the text editor.
   */
  text: string;

  /**
   * The mimetype of the text.
   *
   * #### Notes
   * The mimetype is used to set the syntax highlighting, for example.
   */
  mimetype: string;

  /**
   * The filename of the editor.
   */
  filename: string;

  /**
   * Whether the text editor has a fixed maximum height.
   *
   * #### Notes
   * If true, the editor has a fixed maximum height.  If false, the editor
   * resizes to fit the content.
   */
  fixedHeight: boolean;

  /**
   * A flag to determine whether to show line numbers.
   */
  lineNumbers: boolean;

  /**
   * A property to determine whether to allow editing.
   */
  readOnly: boolean;

  /**
   * The number of spaces to insert for each tab.
   */
  tabSize: number;

  /**
   * The cursor position.
   */
  cursorPosition: number;
}


/**
 * Interface that must be implemented to set defaults on an EditorModel.
 */
export
interface IEditorOptions {
  /**
   * The initial text in the text editor.
   */
  text?: string;

  /**
   * The mimetype of the text.
   *
   * #### Notes
   * The mimetype is used to set the syntax highlighting, for example.
   */
  mimetype?: string;

  /**
   * The filename of the editor.
   */
  filename?: string;

  /**
   * Whether the text editor has a fixed maximum height.
   */
  fixedHeight?: boolean;

  /**
   * A flag to determine whether to show line numbers.
   */
  lineNumbers?: boolean;

  /**
   * A property to determine whether to allow editing.
   */
  readOnly?: boolean;

  /**
   * The number of spaces to insert for each tab.
   */
  tabSize?: number;
}


/**
 * An implementation of an editor model.
 */
export
class EditorModel implements IEditorModel {
  /**
   * Construct an Editor Model.
   */
  constructor(options?: IEditorOptions) {
    if (options) EditorModelPrivate.initFrom(this, options);
  }

  /**
   * A signal emitted when the editor model state changes.
   */
  get stateChanged(): ISignal<EditorModel, IChangedArgs<any>> {
    return EditorModelPrivate.stateChangedSignal.bind(this);
  }

  /**
   * A signal emitted when a tab (text) completion is requested.
   */
  get completionRequested(): ISignal<IEditorModel, ICompletionRequest> {
    return EditorModelPrivate.completionRequested.bind(this);
  }

  /**
   * A signal emitted when either the top or bottom edge is requested.
   */
  get edgeRequested(): ISignal<EditorModel, EdgeLocation> {
    return EditorModelPrivate.edgeRequestedSignal.bind(this);
  }

  /**
   * A signal emitted when a text change is completed.
   */
  get textChanged(): ISignal<IEditorModel, ITextChange> {
    return EditorModelPrivate.textChangedSignal.bind(this);
  }

  /**
   * The editor filename.
   */
  get filename(): string {
    return this._filename;
  }
  set filename(newValue: string) {
    if (newValue === this._filename) {
      return;
    }
    let oldValue = this._filename;
    let name = 'filename';
    this._filename = newValue;
    this.stateChanged.emit({ name, oldValue, newValue });
  }

  /**
   * Whether the editor height should be constrained.
   */
  get fixedHeight() {
    return this._fixedHeight;
  }
  set fixedHeight(newValue: boolean) {
    if (newValue === this._fixedHeight) {
      return;
    }
    let oldValue = this._fixedHeight;
    let name = 'fixedHeight';
    this._fixedHeight = newValue;
    this.stateChanged.emit({ name, oldValue, newValue });
  }

  /**
   * The mode for the editor mimetype.
   */
  get mimetype(): string {
    return this._mimetype;
  }
  set mimetype(newValue: string) {
    if (newValue === this._mimetype) {
      return;
    }
    let oldValue = this._mimetype;
    let name = 'mimetype';
    this._mimetype = newValue;
    this.stateChanged.emit({ name, oldValue, newValue });
  }

  /**
   * The lineNumbers flag for the editor model.
   */
  get lineNumbers(): boolean {
    return this._lineNumbers;
  }
  set lineNumbers(newValue: boolean) {
    if (newValue === this._lineNumbers) {
      return;
    }
    let oldValue = this._lineNumbers;
    let name = 'lineNumbers';
    this._lineNumbers = newValue;
    this.stateChanged.emit({ name, oldValue, newValue });
  }

  /**
   * The cursor position for the editor model.
   */
  get cursorPosition(): number {
    return this._cursorPosition;
  }
  set cursorPosition(newValue: number) {
    if (newValue === this._cursorPosition) {
      return;
    }
    let oldValue = this._cursorPosition;
    let name = 'cursorPosition';
    this._cursorPosition = newValue;
    this.stateChanged.emit({ name, oldValue, newValue });
  }

  /**
   * The readOnly property for the editor model.
   */
  get readOnly(): boolean {
    return this._readOnly;
  }
  set readOnly(newValue: boolean) {
    if (newValue === this._readOnly) {
      return;
    }
    let oldValue = this._readOnly;
    let name = 'readOnly';
    this._readOnly = newValue;
    this.stateChanged.emit({ name, oldValue, newValue });
  }

  /**
   * The tabSize number for the editor model.
   */
  get tabSize(): number {
    return this._tabSize;
  }
  set tabSize(newValue: number) {
    if (newValue === this._tabSize) {
      return;
    }
    let oldValue = this._tabSize;
    let name = 'tabSize';
    this._tabSize = newValue;
    this.stateChanged.emit({ name, oldValue, newValue });
  }

  /**
   * The text of the editor model.
   */
  get text(): string {
    return this._text;
  }
  set text(newValue: string) {
    if (newValue === this._text) {
      return;
    }
    let oldValue = this._text;
    let name = 'text';
    this._text = newValue;
    this.stateChanged.emit({ name, oldValue, newValue });
  }

  /**
   * Get whether the model is disposed.
   *
   * #### Notes
   * This is a read-only property.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Dispose of the resources held by the model.
   */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    clearSignalData(this);
    this._isDisposed = true;
  }

  private _isDisposed = false;
  private _filename = '';
  private _mimetype = '';
  private _fixedHeight = false;
  private _lineNumbers = false;
  private _readOnly = false;
  private _text = '';
  private _tabSize = 4;
  private _cursorPosition = 0;
}


/**
 * The namespace for the `EditorModel` class private data.
 */
namespace EditorModelPrivate {

  /**
   * A signal emitted when the editor state changes.
   */
  export
  const stateChangedSignal = new Signal<EditorModel, IChangedArgs<any>>();

  /**
   * A signal emitted when either the top or bottom edge is requested.
   */
  export
  const edgeRequestedSignal = new Signal<EditorModel, EdgeLocation>();

  /**
   * A signal emitted when a tab (text) completion is requested.
   */
  export
  const completionRequested = new Signal<IEditorModel, ICompletionRequest>();

  /**
   * A signal emitted when a text change is completed.
   */
  export
  const textChangedSignal = new Signal<EditorModel, ITextChange>();

  /**
   * Initialize an editor view model from an options object.
   */
  export
  function initFrom(model: EditorModel, options: IEditorOptions): void {
    if (options.mimetype !== void 0) {
      model.mimetype = options.mimetype;
    }
    if (options.filename !== void 0) {
      model.filename = options.filename;
    }
    if (options.fixedHeight !== void 0) {
      model.fixedHeight = options.fixedHeight;
    }
    if (options.lineNumbers !== void 0) {
      model.lineNumbers = options.lineNumbers;
    }
    if (options.readOnly !== void 0) {
      model.readOnly = options.readOnly;
    }
    if (options.text !== void 0) {
      model.text = options.text;
    }
    if (options.tabSize !== void 0) {
      model.tabSize = options.tabSize;
    }
  }

}
