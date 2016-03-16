// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  IDisposable
} from 'phosphor-disposable';

import {
  IChangedArgs, Property
} from 'phosphor-properties';

import {
  ISignal, Signal, clearSignalData
} from 'phosphor-signaling';


/**
 * An interface required for implementing the editor model
 */
export
interface IEditorModel extends IDisposable {
  /**
   * A signal emitted when the editor model state changes.
   */
  stateChanged: ISignal<IEditorModel, IChangedArgs<any>>;

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
   * Whether the editor is focused.
   */
  focused: boolean;

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
   * Whether the editor has unsaved changes.
   */
  dirty: boolean;
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

  /**
   * Whether the contents of the editor are dirty.
   */
  dirty?: boolean;
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
   * The dirty state for the editor.
   */
  get dirty(): boolean {
    return EditorModelPrivate.dirtyProperty.get(this);
  }
  set dirty(value: boolean) {
    EditorModelPrivate.dirtyProperty.set(this, value);
  }

  /**
   * The mode for the editor filename.
   */
  get filename(): string {
    return EditorModelPrivate.filenameProperty.get(this);
  }
  set filename(value: string) {
    EditorModelPrivate.filenameProperty.set(this, value);
  }

  /**
   * Whether the editor height should be constrained.
   */
  get fixedHeight() {
    return EditorModelPrivate.fixedHeightProperty.get(this);
  }
  set fixedHeight(value: boolean) {
    EditorModelPrivate.fixedHeightProperty.set(this, value);
  }

  /**
   * The mode for the editor mimetype.
   */
  get mimetype(): string {
    return EditorModelPrivate.mimetypeProperty.get(this);
  }
  set mimetype(value: string) {
    EditorModelPrivate.mimetypeProperty.set(this, value);
  }

  /**
   * The lineNumbers flag for the editor model.
   */
  get lineNumbers(): boolean {
    return EditorModelPrivate.lineNumbersProperty.get(this);
  }
  set lineNumbers(value: boolean) {
    EditorModelPrivate.lineNumbersProperty.set(this, value);
  }

  /**
   * The readOnly property for the editor model.
   */
  get readOnly(): boolean {
    return EditorModelPrivate.readOnlyProperty.get(this);
  }
  set readOnly(value: boolean) {
    EditorModelPrivate.readOnlyProperty.set(this, value);
  }

  /**
   * Whether the editor is focused for editing.
   */
  get focused(): boolean {
    return EditorModelPrivate.focusedProperty.get(this);
  }
  set focused(value: boolean) {
    EditorModelPrivate.focusedProperty.set(this, value);
  }

  /**
   * The tabSize number for the editor model.
   */
  get tabSize(): number {
    return EditorModelPrivate.tabSizeProperty.get(this);
  }
  set tabSize(value: number) {
    EditorModelPrivate.tabSizeProperty.set(this, value);
  }

  /**
   * The text of the editor model.
   */
  get text(): string {
    return EditorModelPrivate.textProperty.get(this);
  }
  set text(value: string) {
    EditorModelPrivate.textProperty.set(this, value);
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
   * The property descriptor for the editor mimetype.
   */
  export
  const mimetypeProperty = new Property<EditorModel, string>({
    name: 'mimetype',
    value: '',
    notify: stateChangedSignal
  });

  /**
   * The property descriptor for the editor filename.
   */
  export
  const filenameProperty = new Property<EditorModel, string>({
    name: 'filename',
    value: '',
    notify: stateChangedSignal
  });

  /**
  * A property descriptor which determines whether the editor height should be constrained.
  */
  export
  const fixedHeightProperty = new Property<EditorModel, boolean>({
    name: 'fixedHeight',
    value: false,
    notify: stateChangedSignal,
  });

  /**
   * The property descriptor for the editor lineNumbers flag.
   */
  export
  const lineNumbersProperty = new Property<EditorModel, boolean>({
    name: 'lineNumbers',
    value: false,
    notify: stateChangedSignal
  });

  /**
   * The property descriptor for the editor readOnly property.
   */
  export
  const readOnlyProperty = new Property<EditorModel, boolean>({
    name: 'readOnly',
    value: false,
    notify: stateChangedSignal
  });

  /**
   * The property descriptor for the editor focused property.
   */
  export
  const focusedProperty = new Property<EditorModel, boolean>({
    name: 'focused',
    value: false,
    notify: stateChangedSignal
  });

  /**
   * The property descriptor for the editor text.
   */
  export
  const textProperty = new Property<EditorModel, string>({
    name: 'text',
    value: '',
    notify: stateChangedSignal
  });

  /**
   * The property descriptor for the editor tabSize number.
   */
  export
  const tabSizeProperty = new Property<EditorModel, number>({
    name: 'tabSize',
    value: 4,
    notify: stateChangedSignal
  });

  /**
   * The property descriptor for the editor dirty state.
   */
  export
  const dirtyProperty = new Property<EditorModel, boolean>({
    name: 'dirty',
    value: false,
    notify: stateChangedSignal
  });

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
