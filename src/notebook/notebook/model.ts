// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import * as CodeMirror
  from 'codemirror';

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
} from '../editor';

import {
  InputAreaModel, IInputAreaModel
} from '../input-area';

import {
  OutputAreaModel, IOutputAreaModel
} from '../output-area';

import {
  ICellModel,
  ICodeCellModel, CodeCellModel,
  IMarkdownCellModel, MarkdownCellModel,
  IRawCellModel, isCodeCellModel, isMarkdownCellModel,
  RawCellModel, isRawCellModel, MetadataCursor, IMetadataCursor
} from '../cells';

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
   * Weheter a cell is selected.
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
    this._cells.changed.connect(this._onCellsChanged, this);
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
  set defaultMimetype(value: string) {
    let prev = this._defaultMimetype;
    if (prev === value) {
      return;
    }
    this._defaultMimetype = value;
    this.stateChanged.emit({
      name: 'defaultMimetype',
      oldValue: prev,
      newValue: value
    });
  }

  /**
   * The read-only status of the notebook.
   */
  get readOnly(): boolean {
    return this._readOnly;
  }
  set readOnly(value: boolean) {
    let prev = this._readOnly;
    if (prev === value) {
      return;
    }
    this._readOnly = value;
    let cells = this._cells;
    for (let i = 0; i < cells.length; i++) {
      cells.get(i).readOnly = value;
    }
    this.stateChanged.emit({
      name: 'readOnly',
      oldValue: prev,
      newValue: value
    });
  }

  /**
   * The session for the notebook.
   */
  get session(): INotebookSession {
    return this._session;
  }
  set session(value: INotebookSession) {
    let prev = this._session;
    if (prev === value) {
      return;
    }
    this._session = value;
    NotebookModelPrivate.sessionChanged(this, value);
    this.stateChanged.emit({
      name: 'session',
      oldValue: prev,
      newValue: value
    });
  }

  /**
   * The kernelspec metadata for the notebook.
   */
  get kernelspec(): IKernelspecMetadata {
    return JSON.parse(this._kernelspec);
  }
  set kernelspec(value: IKernelspecMetadata) {
    let prev = JSON.parse(this._kernelspec);
    if (prev === value) {
      return;
    }
    this._kernelspec = JSON.stringify(value);
    this.stateChanged.emit({
      name: 'kernelspec',
      oldValue: prev,
      newValue: value
    });
  }

  /**
   * The language info metadata for the notebook.
   */
  get languageInfo(): ILanguageInfoMetadata {
    return JSON.parse(this._langInfo);
  }
  set languageInfo(value: ILanguageInfoMetadata) {
    let prev = JSON.parse(this._langInfo);
    if (shallowEquals(prev, value)) {
      return;
    }
    this._langInfo = JSON.stringify(value);
    this.stateChanged.emit({
      name: 'languageInfo',
      oldValue: prev,
      newValue: value
    });
  }

  /**
   * The original nbformat version for the notebook.
   */
  get origNbformat(): number {
    return this._origNbformat;
  }
  set origNbformat(value: number) {
    let prev = this._origNbformat;
    if (shallowEquals(prev, value)) {
      return;
    }
    this._origNbformat = value;
    this.stateChanged.emit({
      name: 'origNbformat',
      oldValue: prev,
      newValue: value
    });
  }

  /**
   * The index of the active cell.
   *
   * #### Notes
   * The value will be clamped.  When setting this, all other cells
   * will be marked as inactive.
   */
  get activeCellIndex(): number {
    return this._activeCellIndex;
  }
  set activeCellIndex(value: number) {
    let prev = this._activeCellIndex;
    if (prev === value) {
      return;
    }
    value = Math.max(value, 0);
    value = Math.min(value, this.cells.length - 1);
    this._activeCellIndex = value;
    this.stateChanged.emit({
      name: 'activeCellIndex',
      oldValue: prev,
      newValue: value
    });
  }

  /**
   * The mode of the notebook.
   */
  get mode(): NotebookMode {
    return this._mode;
  }
  set mode(value: NotebookMode) {
    let prev = this._mode;
    if (prev === value) {
      return;
    }
    this._mode = value;
    NotebookModelPrivate.modeChanged(this, value);
    this.stateChanged.emit({
      name: 'mode',
      oldValue: prev,
      newValue: value
    });
  }

  /**
   * Whether the notebook has unsaved changes.
   */
  get dirty(): boolean {
    return this._dirty;
  }
  set dirty(value: boolean) {
    let prev = this._dirty;
    if (prev === value) {
      return;
    }
    this._dirty = value;
    this.stateChanged.emit({
      name: 'dirty',
      oldValue: prev,
      newValue: value
    });
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
  }

  /**
   * Deselect a cell.
   */
  deselect(cell: ICellModel): void {
    NotebookModelPrivate.selectedProperty.set(cell, false);
  }

  /**
   * Weheter a cell is selected.
   */
  isSelected(cell: ICellModel): boolean {
    return NotebookModelPrivate.selectedProperty.get(cell);
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
   */
  runActiveCell(): void {
    if (this.readOnly) {
      return;
    }
    let cell = this.cells.get(this.activeCellIndex);
    if (!cell) {
      return;
    }
    this.mode = 'command';
    if (isMarkdownCellModel(cell)) {
      cell.rendered = false;
      cell.trusted = true;
      cell.rendered = true;
    } else if (isCodeCellModel(cell)) {
      this.executeCell(cell as CodeCellModel);
    } else {
      cell.trusted = true;
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
      this._metadata[name],
      this._cursorCallback
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
   * Execute the given cell.
   */
  protected executeCell(cell: CodeCellModel): void {
    if (this.readOnly) {
      return;
    }
    this.dirty = true;
    let text = cell.input.textEditor.text.trim();
    if (!text) {
      cell.input.prompt = 'In [ ]:';
      return;
    }
    let session = this.session;
    if (!session || !session.kernel) {
      cell.input.prompt = 'In [ ]:';
      return;
    }
    cell.input.prompt = 'In [*]:';
    let exRequest = {
      code: cell.input.textEditor.text,
      silent: false,
      store_history: true,
      stop_on_error: true,
      allow_stdin: true
    };
    let output = cell.output;
    let ex = this.session.kernel.execute(exRequest);
    output.clear(false);
    cell.trusted = true;
    ex.onIOPub = (msg => {
      let model = msg.content;
      if (model !== void 0) {
        model.output_type = msg.header.msg_type as OutputType;
        output.add(model);
      }
    });
    ex.onReply = (msg => {
      cell.executionCount = (msg.content as IExecuteReply).execution_count;
    });
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
  private _onCellsChanged(list: ObservableList<ICellModel>, change: IListChangedArgs<ICellModel>): void {
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
  private _cursorCallback(name: string, value: string): void {
    this._metadata[name] = value;
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
  private _activeCellIndex = -1;
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
   * An attached property for the selected state of a cell.
   */
  export
  const selectedProperty = new Property<ICellModel, boolean>({
    name: 'selected'
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
          cell.rendered = mode === 'edit';
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
