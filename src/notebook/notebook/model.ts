
import {
  INotebookSession, IExecuteReply
} from 'jupyter-js-services';

import {
  IObservableList, ObservableList, ListChangeType, IListChangedArgs
} from 'phosphor-observablelist';

import {
  IChangedArgs, Property
} from 'phosphor-properties';

import {
  ISignal, Signal
} from 'phosphor-signaling';

import {
  Widget
} from 'phosphor-widget';

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
  RawCellModel, isRawCellModel, CellMode
} from '../cells';

import {
  IMarkdownCell, ICodeCell,
  isMarkdownCell, isCodeCell,
  IDisplayData, isDisplayData,
  IExecuteResult, isExecuteResult, isRawCell,
  IStream, isStream, ICell, INotebookContent, INotebookMetadata,
  IError, isError, IOutput, OutputType,
  MAJOR_VERSION, MINOR_VERSION
} from './nbformat';


/**
 * The definition of a model object for a notebook widget.
 */
export
interface INotebookModel {
  /**
   * A signal emitted when state of the notebook changes.
   */
  stateChanged: ISignal<INotebookModel, IChangedArgs<any>>;

  /**
   * A signal emitted when a save is requested.
   */
  saveRequested: ISignal<INotebookModel, void>;

  /**
   * The default mime type for new code cells in the notebook.
   *
   * #### Notes
   * This can be considered the default language of the notebook.
   */
  defaultMimetype: string;

  /**
   * Whether the notebook has unsaved changes.
   */
  dirty: boolean;

  /**
   * Whether the notebook is read-only.
   */
  readOnly: boolean;

  /**
   * Whether the notebook can be trusted.
   *
   * #### Notes
   * An untrusted notebook should sanitize HTML output.
   */
  //trusted: boolean;

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
   * The currently selected cell.
   */
  selectedCellIndex: number;

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
   * Run the selected cell, taking the appropriate action.
   */
  runSelectedCell(): void;

  /**
   * Save the notebook state.
   */
  save(): void;

  /**
   * The metadata associated with the notebook.
   */
  metadata: INotebookMetadata;
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
    this.cells.changed.connect(this._onCellsChanged, this);
  }

  /**
   * A signal emitted when the state of the model changes.
   */
  get stateChanged(): ISignal<INotebookModel, IChangedArgs<any>> {
    return NotebookModelPrivate.stateChangedSignal.bind(this);
  }

  /**
   * A signal emitted when a save is requested.
   */
  get saveRequested(): ISignal<INotebookModel, void> {
    return NotebookModelPrivate.saveRequestedSignal.bind(this);
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
   * Get the default mimetype for cells new code cells.
   */
  get defaultMimetype(): string {
    return NotebookModelPrivate.defaultMimetype.get(this);
  }

  /**
   * Set the default mimetype for cells new code cells.
   */
  set defaultMimetype(value: string) {
    NotebookModelPrivate.defaultMimetype.set(this, value);
  }

  /**
   * Get the read-only status of the notebook.
   */
  get readOnly(): boolean {
    return NotebookModelPrivate.readOnlyProperty.get(this);
  }

  /**
   * Set the read-only status of the notebook.
   */
  set readOnly(value: boolean) {
    NotebookModelPrivate.readOnlyProperty.set(this, value);
    let cells = this._cells;
    for (let i = 0; i < cells.length; i++) {
      cells.get(i).readOnly = value;
    }
  }

  /**
   * Get the session for the notebook.
   */
  get session(): INotebookSession {
    return NotebookModelPrivate.sessionProperty.get(this);
  }

  /**
   * Set the session for the notebook.
   */
  set session(value: INotebookSession) {
    NotebookModelPrivate.sessionProperty.set(this, value);
  }

  /**
   * Get the metadata for the notebook.
   */
  get metadata(): INotebookMetadata {
    return NotebookModelPrivate.metadataProperty.get(this);
  }

  /**
   * Set the metadata for the notebook.
   */
  set metadata(value: INotebookMetadata) {
    NotebookModelPrivate.metadataProperty.set(this, value);
  }

  /**
   * Get the selected cell index.
   */
  get selectedCellIndex(): number {
    return NotebookModelPrivate.selectedCellIndexProperty.get(this);
  }

  /**
   * Set the selected cell index.  The value will be clamped.
   */
  set selectedCellIndex(value: number) {
    value = Math.max(value, 0);
    value = Math.min(value, this.cells.length - 1);
    NotebookModelPrivate.selectedCellIndexProperty.set(this, value);
    let cells = this.cells;
    for (let i = 0; i < cells.length; i++) {
      let cell = cells.get(i);
      cell.selected = value === i;
    }
  }

  /**
   * Get whether the notebook has unsaved changes.
   */
  get dirty(): boolean {
    return NotebookModelPrivate.dirtyProperty.get(this);
  }

  /**
   * Set whether the notebook has unsaved changes.
   */
  set dirty(value: boolean) {
    // Clear the dirty state of all cells if the notebook dirty state
    // is cleared.
    if (!value) {
      for (let i = 0; i < this._cells.length; i++) {
        let cell = this._cells.get(i);
        cell.dirty = value;
      }
    }
    NotebookModelPrivate.dirtyProperty.set(this, value);
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
    if (source) {
      cell.input.textEditor.text = source.input.textEditor.text;
      cell.dirty = source.dirty;
      cell.tags = source.tags;
      if (isCodeCellModel(source)) {
        cell.collapsed = source.collapsed;
        cell.scrolled = source.scrolled;
      }
    }
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
    if (source) {
      cell.input.textEditor.text = source.input.textEditor.text;
      cell.dirty = source.dirty;
      cell.tags = source.tags;
      if (isMarkdownCellModel(source)) {
        cell.rendered = source.rendered;
      }
    }
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
    if (source) {
      cell.input.textEditor.text = source.input.textEditor.text;
      cell.dirty = source.dirty;
      cell.tags = source.tags;
      if (isRawCellModel(source)) {
        cell.format = (source as IRawCellModel).format;
      }
    }
    return cell;
  }

  /**
   * Run the selected cell, taking the appropriate action.
   */
  runSelectedCell(): void {
    if (this.readOnly) {
      return;
    }
    let cell = this.cells.get(this.selectedCellIndex);
    if (!cell) {
      return;
    }
    if (isMarkdownCellModel(cell)) {
      cell.rendered = true;
    } else if (isCodeCellModel(cell)) {
      this.executeCell(cell as CodeCellModel);
    }
    if (this.selectedCellIndex === this.cells.length - 1) {
      let cell = this.createCodeCell();
      this.cells.add(cell);
      cell.mode = 'edit';  // This already sets the new index.
    } else {
      this.selectedCellIndex += 1;
    }
  }

  /**
   * Save the notebook state.
   *
   * The default action is to emit a `saveRequested` signal
   * and defer the save action.
   */
  save(): void {
    this.saveRequested.emit(void 0);
  }

  /**
   * Execute the given cell. 
   */
  protected executeCell(cell: CodeCellModel): void {
    if (this.readOnly) {
      return;
    }
    let text = cell.input.textEditor.text.trim();
    if (!text) {
      cell.input.prompt = 'In [ ]:';
      return;
    }
    let session = this.session;
    if (!session) {
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
    ex.onIOPub = (msg => {
      let model = msg.content;
      if (model !== void 0) {
        model.output_type = msg.header.msg_type as OutputType;
        output.add(model)
      }
    });
    ex.onReply = (msg => {
      cell.executionCount = (msg.content as IExecuteReply).execution_count;
    });
  }

  /**
   * Handle a change in the cells list.
   */
  private _onCellsChanged(list: ObservableList<ICellModel>, change: IListChangedArgs<ICellModel>): void {
    switch(change.type) {
    case ListChangeType.Add:
      let cell = change.newValue as ICellModel;
      cell.stateChanged.connect(this._onCellStateChanged, this);
      this.selectedCellIndex = change.newIndex;
      break;
    case ListChangeType.Remove:
      this.selectedCellIndex = Math.min(change.oldIndex, this.cells.length - 1);
      break;
    }
  }

  /**
   * Handle a change to a cell state.
   */
  private _onCellStateChanged(cell: ICellModel, change: IChangedArgs<any>): void {
    if (change.name === 'dirty' && change.newValue) {
      this.dirty = true;
    }
    if (change.name === 'mode') {
      let cells = this.cells;
      for (let i = 0; i < cells.length; i++) {
        if (cells.get(i) === cell) {
          this.selectedCellIndex = i;
        }
      }
    }
  }

  private _cells: IObservableList<ICellModel> = new ObservableList<ICellModel>();
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
   * A signal emitted when the state of the model changes.
   */
  export
  const saveRequestedSignal = new Signal<INotebookModel, void>();

  /**
  * A property descriptor which holds the default mimetype for new code cells.
  */
  export
  const defaultMimetype = new Property<NotebookModel, string>({
    name: 'defaultMimetype',
    value: "text/x-ipython",
    notify: stateChangedSignal,
  });

  /**
  * A property descriptor which holds the read only status of the notebook.
  */
  export
  const readOnlyProperty = new Property<NotebookModel, boolean>({
    name: 'readOnly',
    notify: stateChangedSignal,
  });

 /**
  * A property descriptor which holds the session of the notebook.
  */
  export
  const sessionProperty = new Property<NotebookModel, INotebookSession>({
    name: 'session',
    notify: stateChangedSignal,
  });

 /**
  * A property descriptor which holds the metadata of the notebook.
  */
  export
  const metadataProperty = new Property<NotebookModel, INotebookMetadata>({
    name: 'metadata',
    notify: stateChangedSignal,
  });

  /**
  * A property descriptor for the selected cell index.
  */
  export
  const selectedCellIndexProperty = new Property<NotebookModel, number>({
    name: 'selectedCellIndex',
    notify: stateChangedSignal,
  });

 /**
  * A property descriptor for the dirty state
  */
  export
  const dirtyProperty = new Property<NotebookModel, boolean>({
    name: 'dirty',
    notify: stateChangedSignal,
  });
}
