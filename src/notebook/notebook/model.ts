// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import * as CodeMirror
  from 'codemirror';

import 'codemirror/mode/meta';

import {
  INotebookSession, IExecuteReply
} from 'jupyter-js-services';

import {
  copy, shallowEquals
} from 'jupyter-js-utils';

import {
  IDisposable
} from 'phosphor-disposable';

import {
  IObservableList, ObservableList, ListChangeType, IListChangedArgs
} from 'phosphor-observablelist';

import {
  IChangedArgs, Property
} from 'phosphor-properties';

import {
  ISignal, Signal, clearSignalData
} from 'phosphor-signaling';

import {
  EditorModel, IEditorModel, IEditorOptions
} from '../editor/model';

import {
  InputAreaModel, IInputAreaModel
} from '../input-area/model';

import {
  OutputAreaModel, IOutputAreaModel
} from '../output-area/model';

import {
  ICellModel,
  ICodeCellModel, CodeCellModel,
  IMarkdownCellModel, MarkdownCellModel,
  IRawCellModel, isCodeCellModel, isMarkdownCellModel,
  RawCellModel, isRawCellModel, MetadataCursor, IMetadataCursor,
  executeCodeCell
} from '../cells/model';

import {
  OutputType, IKernelspecMetadata, ILanguageInfoMetadata
} from './nbformat';


/**
 * The interactivity modes for the notebook.
 */
export
type NotebookMode = 'command' | 'edit';


/**
 * The default notebook kernelspec metadata.
 */
const DEFAULT_KERNELSPEC = {
  name: 'unknown',
  display_name: 'No Kernel!'
}

/**
 * The default notebook languageinfo metadata.
 */
const DEFAULT_LANG_INFO = {
  name: 'unknown'
}


/**
 * The definition of a model object for a notebook widget.
 */
export
interface INotebookModel extends IDisposable {
  /**
   * A signal emitted when state of the notebook changes.
   */
  stateChanged: ISignal<INotebookModel, IChangedArgs<any>>;

  /**
   * A signal emitted when a user metadata state changes.
   */
  metadataChanged: ISignal<INotebookModel, string>;

  /**
   * A signal emitted when the selection changes.
   */
  selectionChanged: ISignal<INotebookModel, void>;

  /**
   * The default mime type for new code cells in the notebook.
   *
   * #### Notes
   * This can be considered the default language of the notebook.
   */
  defaultMimetype: string;

  /**
   * The interactivity mode of the notebook.
   */
  mode: NotebookMode;

  /**
   * Whether the notebook has unsaved changes.
   */
  dirty: boolean;

  /**
   * Whether the notebook is read-only.
   */
  readOnly: boolean;

  /**
   * The kernelspec metadata associated with the notebook.
   */
  kernelspec: IKernelspecMetadata;

  /**
   * The language info metadata associated with the notebook.
   */
  languageInfo: ILanguageInfoMetadata;

  /**
   * The original nbformat associated with the notebook.
   */
  origNbformat: number;

  /**
   * The list of cells in the notebook.
   *
   * #### Notes
   * This is a read-only property.
   */
  cells: IObservableList<ICellModel>;

  /**
   * The optional notebook session associated with the model.
   */
  session?: INotebookSession;

  /**
   * The index of the active cell.
   */
  activeCellIndex: number;

  /**
   * Select a cell.
   */
  select(cell: ICellModel): void;

  /**
   * Deselect a cell.
   */
  deselect(cell: ICellModel): void;

  /**
   * Whether a cell is selected.
   */
  isSelected(cell: ICellModel): boolean;

  /**
   * A factory for creating a new code cell.
   *
   * @param source - The cell to use for the original source data.
   *
   * @returns A new code cell. If a source cell is provided, the
   *   new cell will be intialized with the data from the source.
   *
   * #### Notes
   * If the source argument does not give an input mimetype, the code cell
   * defaults to the notebook [[defaultMimetype]].
   */
  createCodeCell(source?: ICellModel): ICodeCellModel;

  /**
   * A factory for creating a new Markdown cell.
   *
   * @param source - The cell to use for the original source data.
   *
   * @returns A new markdown cell. If a source cell is provided, the
   *   new cell will be intialized with the data from the source.
   */
  createMarkdownCell(source?: ICellModel): IMarkdownCellModel;

  /**
   * A factory for creating a new raw cell.
   *
   * @param source - The cell to use for the original source data.
   *
   * @returns A new raw cell. If a source cell is provided, the
   *   new cell will be intialized with the data from the source.
   */
  createRawCell(source?: ICellModel): IRawCellModel;

  /**
   * Run the active cell, taking the appropriate action.
   */
  runActiveCell(): void;

  /**
   * Get a metadata cursor for the notebook.
   *
   * #### Notes
   * Metadata associated with the nbformat spec are set directly
   * on the model.  This method is used to interact with a namespaced
   * set of metadata on the notebook.
   */
  getMetadata(namespace: string): IMetadataCursor;

  /**
   * List the metadata namespace keys for the notebook.
   *
   * #### Notes
   * Metadata associated with the nbformat are not included.
   */
   listMetadata(): string[];
}


/**
 * An implementation of a notebook Model.
 */
export
class NotebookModel implements INotebookModel {
  /**
   * Create an editor model.
   */
  static createEditor(options?: IEditorOptions): IEditorModel {
    return new EditorModel(options);
  }

  /**
   * Create an input area model.
   */
  static createInput(editor: IEditorModel) : IInputAreaModel {
    return new InputAreaModel(editor);
  }

  /**
   * Create an output area model.
   */
  static createOutputArea(): IOutputAreaModel {
    return new OutputAreaModel();
  }

  /**
   * Construct a new notebook model.
   */
  constructor() {
    this._cells = new ObservableList<ICellModel>();
    this._cells.changed.connect(this.onCellsChanged, this);
  }

  /**
   * A signal emitted when the state of the model changes.
   */
  get stateChanged(): ISignal<INotebookModel, IChangedArgs<any>> {
    return NotebookModelPrivate.stateChangedSignal.bind(this);
  }

  /**
   * A signal emitted when a user metadata state changes.
   *
   * #### Notes
   * The signal argument is the namespace of the metadata that changed.
   */
  get metadataChanged(): ISignal<INotebookModel, string> {
    return NotebookModelPrivate.metadataChangedSignal.bind(this);
  }

  /**
   * A signal emitted when the selection changes.
   */
  get selectionChanged(): ISignal<INotebookModel, void> {
    return NotebookModelPrivate.selectionChangedSignal.bind(this);
  }

  /**
   * Get the observable list of notebook cells.
   *
   * #### Notes
   * This is a read-only property.
   */
  get cells(): IObservableList<ICellModel> {
    return this._cells;
  }

  /**
   * The default mimetype for cells new code cells.
   */
  get defaultMimetype(): string {
    return this._defaultMimetype;
  }
  set defaultMimetype(newValue: string) {
    if (newValue === this._defaultMimetype) {
      return;
    }
    let oldValue = this._defaultMimetype;
    this._defaultMimetype = newValue;
    let name = 'defaultMimetype';
    this.stateChanged.emit({ name, oldValue, newValue });
  }

  /**
   * The read-only status of the notebook.
   */
  get readOnly(): boolean {
    return this._readOnly;
  }
  set readOnly(newValue: boolean) {
    if (newValue === this._readOnly) {
      return;
    }
    let oldValue = this._readOnly;
    this._readOnly = newValue;
    let cells = this._cells;
    for (let i = 0; i < cells.length; i++) {
      cells.get(i).input.textEditor.readOnly = newValue;
    }
    let name = 'readOnly';
    this.stateChanged.emit({ name, oldValue, newValue });
  }

  /**
   * The session for the notebook.
   */
  get session(): INotebookSession {
    return this._session;
  }
  set session(newValue: INotebookSession) {
    if (newValue === this._session) {
      return;
    }
    let oldValue = this._session;
    this._session = newValue;
    NotebookModelPrivate.sessionChanged(this, newValue);
    let name = 'session';
    this.stateChanged.emit({ name, oldValue, newValue });
  }

  /**
   * The kernelspec metadata for the notebook.
   */
  get kernelspec(): IKernelspecMetadata {
    return JSON.parse(this._kernelspec);
  }
  set kernelspec(newValue: IKernelspecMetadata) {
    let oldValue = JSON.parse(this._kernelspec);
    if (shallowEquals(oldValue, newValue)) {
      return;
    }
    this._kernelspec = JSON.stringify(newValue);
    let name = 'kernelspec';
    this.stateChanged.emit({ name, oldValue, newValue });
  }

  /**
   * The language info metadata for the notebook.
   */
  get languageInfo(): ILanguageInfoMetadata {
    return JSON.parse(this._langInfo);
  }
  set languageInfo(newValue: ILanguageInfoMetadata) {
    let oldValue = JSON.parse(this._langInfo);
    if (shallowEquals(oldValue, newValue)) {
      return;
    }
    this._langInfo = JSON.stringify(newValue);
    let name = 'languageInfo';
    this.stateChanged.emit({ name, oldValue, newValue });
  }

  /**
   * The original nbformat version for the notebook.
   */
  get origNbformat(): number {
    return this._origNbformat;
  }
  set origNbformat(newValue: number) {
    if (newValue === this._origNbformat) {
      return;
    }
    let oldValue = this._origNbformat;
    this._origNbformat = newValue;
    let name = 'origNbformat';
    this.stateChanged.emit({ name, oldValue, newValue });
  }

  /**
   * The index of the active cell.
   *
   * #### Notes
   * The value will be clamped.  The active cell is considered to be selected.
   */
  get activeCellIndex(): number {
    return this._activeCellIndex;
  }
  set activeCellIndex(newValue: number) {
    newValue = Math.max(newValue, 0);
    newValue = Math.min(newValue, this.cells.length - 1);
    if (newValue === this._activeCellIndex) {
      return;
    }
    let oldValue = this._activeCellIndex;
    this._activeCellIndex = newValue;
    let name = 'activeCellIndex';
    this.stateChanged.emit({ name, oldValue, newValue });
  }

  /**
   * The mode of the notebook.
   *
   * #### Notes
   * Selected markdown cells are rendered if mode is set to 'command'
   * and unrendered if mode is set to 'edit'.
   */
  get mode(): NotebookMode {
    return this._mode;
  }
  set mode(newValue: NotebookMode) {
    if (newValue === this._mode) {
      return;
    }
    let oldValue = this._mode;
    this._mode = newValue;
    NotebookModelPrivate.modeChanged(this, newValue);
    // Edit mode deselects all cells.
    if (newValue === 'edit') {
      for (let i = 0; i < this.cells.length; i++) {
        let cell = this.cells.get(i);
        this.deselect(cell);
      }
    }
    let name = 'mode';
    this.stateChanged.emit({ name, oldValue, newValue });
  }

  /**
   * Whether the notebook has unsaved changes.
   */
  get dirty(): boolean {
    return this._dirty;
  }
  set dirty(newValue: boolean) {
    if (newValue === this._dirty) {
      return;
    }
    let oldValue = this._dirty;
    this._dirty = newValue;
    let name = 'dirty';
    this.stateChanged.emit({ name, oldValue, newValue });
  }

  /**
   * Get whether the model is disposed.
   *
   * #### Notes
   * This is a read-only property.
   */
  get isDisposed(): boolean {
    return this._cells === null;
  }

  /**
   * Dispose of the resources held by the model.
   */
  dispose(): void {
    // Do nothing if already disposed.
    if (this.isDisposed) {
      return;
    }
    let cells = this._cells;
    clearSignalData(this);
    for (let i = 0; i < cells.length; i++) {
      let cell = cells.get(i);
      cell.dispose();
    }
    cells.clear();
    this._cells = null;
  }

  /**
   * Select a cell.
   */
  select(cell: ICellModel): void {
    NotebookModelPrivate.selectedProperty.set(cell, true);
    this.selectionChanged.emit(void 0);
  }

  /**
   * Deselect a cell.
   *
   * #### Notes
   * This has no effect on the "active" cell.
   */
  deselect(cell: ICellModel): void {
    NotebookModelPrivate.selectedProperty.set(cell, false);
    this.selectionChanged.emit(void 0);
  }

  /**
   * Whether a cell is selected.
   */
  isSelected(cell: ICellModel): boolean {
    return (NotebookModelPrivate.selectedProperty.get(cell) ||
            this.cells.indexOf(cell) === this.activeCellIndex);
  }

  /**
   * Create a code cell model.
   */
  createCodeCell(source?: ICellModel): ICodeCellModel {
    let mimetype = this.defaultMimetype;
    if (source && isCodeCellModel(source)) {
      mimetype = source.input.textEditor.mimetype;
    }
    let constructor = this.constructor as typeof NotebookModel;
    let editor = constructor.createEditor({
      mimetype,
      readOnly: this.readOnly
    });
    let input = constructor.createInput(editor);
    let output = constructor.createOutputArea();
    let cell = new CodeCellModel(input, output);
    cell.trusted = true;
    if (source) {
      cell.trusted = source.trusted;
      cell.input.textEditor.text = source.input.textEditor.text;
      cell.tags = source.tags;
      if (isCodeCellModel(source)) {
        cell.collapsed = source.collapsed;
        cell.scrolled = source.scrolled;
        for (let i = 0; i < source.output.outputs.length; i++) {
          let sourceOutput = source.output.outputs.get(i);
          cell.output.outputs.add(sourceOutput);
        }
      }
    }
    cell.input.textEditor.stateChanged.connect(this.onEditorChanged, this);
    return cell;
  }

  /**
   * Create a markdown cell model.
   */
  createMarkdownCell(source?: ICellModel): IMarkdownCellModel {
    let constructor = this.constructor as typeof NotebookModel;
    let editor = constructor.createEditor({
      mimetype: 'text/x-ipythongfm',
      readOnly: this.readOnly
    });
    let input = constructor.createInput(editor);
    let cell = new MarkdownCellModel(input);
    cell.trusted = true;
    if (source) {
      cell.trusted = source.trusted;
      cell.input.textEditor.text = source.input.textEditor.text;
      cell.tags = source.tags;
      if (isMarkdownCellModel(source)) {
        cell.rendered = source.rendered;
      }
    }
    cell.input.textEditor.stateChanged.connect(this.onEditorChanged, this);
    return cell;
  }

  /**
   * Create a raw cell model.
   */
  createRawCell(source?: ICellModel): IRawCellModel {
    let constructor = this.constructor as typeof NotebookModel;
    let editor = constructor.createEditor({
      readOnly: this.readOnly
    });
    let input = constructor.createInput(editor);
    let cell = new RawCellModel(input);
    cell.trusted = true;
    if (source) {
      cell.trusted = source.trusted;
      cell.input.textEditor.text = source.input.textEditor.text;
      cell.tags = source.tags;
      if (isRawCellModel(source)) {
        cell.format = (source as IRawCellModel).format;
      }
    }
    cell.input.textEditor.stateChanged.connect(this.onEditorChanged, this);
    return cell;
  }

  /**
   * Run the active cell, taking the appropriate action.
   *
   * #### Notes
   * If the notebook is read-only or has no active cell, this is a no-op.
   * Markdown cells are rendered and code cells are executed.
   * All cells are marked as trusted.
   */
  runActiveCell(): void {
    if (this.readOnly) {
      return;
    }
    let cell = this.cells.get(this.activeCellIndex);
    if (!cell) {
      return;
    }
    cell.trusted = true;
    if (isCodeCellModel(cell)) {
      let session = this.session;
      if (!session || !session.kernel) {
        cell.clear();
        return;
      }
      executeCodeCell(cell, session.kernel);
    } else if (isMarkdownCellModel(cell) && cell.rendered === false) {
      cell.rendered = true;
    }
  }

  /**
   * Get a metadata cursor for the notebook.
   *
   * #### Notes
   * Metadata associated with the nbformat spec are set directly
   * on the model.  This method is used to interact with a namespaced
   * set of metadata on the notebook.
   */
  getMetadata(name: string): IMetadataCursor {
    let invalid = ['kernelspec', 'languageInfo', 'origNbformat'];
    if (invalid.indexOf(name) !== -1) {
      let key = invalid[invalid.indexOf(name)];
      throw Error(`Use model attribute for ${key} directly`);
    }
    return new MetadataCursor(
      name,
      this._metadata,
      this._cursorCallback.bind(this)
    );
  }

  /**
   * List the metadata namespace keys for the notebook.
   *
   * #### Notes
   * Metadata associated with the nbformat are not included.
   */
  listMetadata(): string[] {
    return Object.keys(this._metadata);
  }

  /**
   * Handle changes to cell editors.
   */
  protected onEditorChanged(editor: IEditorModel, args: IChangedArgs<any>): void {
    if (args.name === 'text') {
      this.dirty = true;
    }
  }

  /**
   * Handle a change in the cells list.
   */
  protected onCellsChanged(list: ObservableList<ICellModel>, change: IListChangedArgs<ICellModel>): void {
    switch (change.type) {
    case ListChangeType.Add:
      this.activeCellIndex = change.newIndex;
      break;
    case ListChangeType.Remove:
      (change.oldValue as ICellModel).dispose();
      this.activeCellIndex = Math.min(change.oldIndex, this.cells.length - 1);
      break;
    case ListChangeType.Replace:
      let oldValues = change.oldValue as ICellModel[];
      for (let cell of oldValues) {
        cell.dispose();
      }
      break;
    }
    this.dirty = true;
  }

  /**
   * The singleton callback for cursor change events.
   */
  private _cursorCallback(name: string): void {
    this.metadataChanged.emit(name);
  }

  private _cells: IObservableList<ICellModel> = null;
  private _metadata: { [key: string]: string } = Object.create(null);
  private _defaultMimetype = 'text/x-ipython';
  private _readOnly = false;
  private _session: INotebookSession = null;
  private _kernelspec = JSON.stringify(DEFAULT_KERNELSPEC);
  private _langInfo = JSON.stringify(DEFAULT_LANG_INFO);
  private _origNbformat: number = null;
  private _activeCellIndex: number = null;
  private _mode: NotebookMode = 'command';
  private _dirty = false;
}


/**
 * A private namespace for notebook model data.
 */
namespace NotebookModelPrivate {
  /**
   * A signal emitted when the state of the model changes.
   */
  export
  const stateChangedSignal = new Signal<INotebookModel, IChangedArgs<any>>();

  /**
   * A signal emitted when a user metadata state changes.
   */
  export
  const metadataChangedSignal = new Signal<INotebookModel, string>();

  /**
   * A signal emitted when a the selection state changes.
   */
  export
  const selectionChangedSignal = new Signal<INotebookModel, void>();

  /**
   * An attached property for the selected state of a cell.
   */
  export
  const selectedProperty = new Property<ICellModel, boolean>({
    name: 'selected',
    value: false
  });

  /**
   * Handle a change in mode.
   */
  export
  function modeChanged(model: INotebookModel, mode: NotebookMode): void {
    let cells = model.cells;
    for (let i = 0; i < cells.length; i++) {
      let cell = cells.get(i);
      if (i === model.activeCellIndex || model.isSelected(cell)) {
        if (isMarkdownCellModel(cell)) {
          cell.rendered = mode !== 'edit';
        }
      }
    }
  }

  /*
   * Handle a change to the model session.
   */
  export
  function sessionChanged(model: INotebookModel, session: INotebookSession): void {
    model.session.kernelChanged.connect(() => { kernelChanged(model); });
    // Update the kernel data now.
    kernelChanged(model);
  }

  /**
   * Handle a change to the model kernel.
   */
  function kernelChanged(model: INotebookModel): void {
    let session = model.session;
    let kernel = session.kernel;
    kernel.getKernelSpec().then(spec => {
      let kernelspec = copy(model.kernelspec);
      kernelspec.display_name = spec.display_name;
      kernelspec.name = session.kernel.name;
      // Trigger a change to the notebook metadata.
      model.kernelspec = kernelspec;
      return session.kernel.kernelInfo();
    }).then(info => {
      let languageInfo = info.language_info;
      // Use the codemirror mode if given since some kernels rely on it.
      let mode = languageInfo.codemirror_mode;
      let mime = '';
      if (mode) {
        if (typeof mode === 'string') {
          if (CodeMirror.modes.hasOwnProperty(mode as string)) {
            mode = CodeMirror.modes[mode as string];
          } else {
            mode = CodeMirror.findModeByName(mode as string);
          }
        } else if ((mode as CodeMirror.modespec).mime) {
          // Do nothing.
        } else if ((mode as CodeMirror.modespec).name) {
          let name = (mode as CodeMirror.modespec).name
          if (CodeMirror.modes.hasOwnProperty(name)) {
            mode = CodeMirror.modes[name];
          } else {
            mode = CodeMirror.findModeByName(mode as string);
          }
        }
        if (mode) mime = (mode as CodeMirror.modespec).mime;
      } else {
        mime = info.language_info.mimetype;
      }
      if (mime) {
        model.defaultMimetype = mime;
        let cells = model.cells;
        for (let i = 0; i < cells.length; i++) {
          let cell = cells.get(i);
          if (isCodeCellModel(cell)) {
            cell.input.textEditor.mimetype = mime;
          }
        }
      }
      // Trigger a change to the notebook metadata.
      model.languageInfo = languageInfo;
    });
  }

}
