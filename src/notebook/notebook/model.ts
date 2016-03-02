
import {
  INotebookSession
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
  ICellModel,
  ICodeCellModel, CodeCellModel,
  IMarkdownCellModel, MarkdownCellModel,
  IRawCellModel, isCodeCellModel, isMarkdownCellModel,
  RawCellModel
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
 * The interactivity modes for a notebook.
 */
export
type NotebookMode = "command" | "edit";


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
   * The default mime type for new code cells in the notebook.
   *
   * #### Notes
   * This can be considered the default language of the notebook.
   */
  defaultMimetype: string;

  /**
   * The dirty state of the notebook.
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
   * The current interactivity mode of the notebook.
   */
  mode: NotebookMode;

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
   *
   * #### Notes
   * Changing this property will deselect the previous cell.
   */
  selectedCellIndex: number;

  /**
   * Select the next cell in the notebook.
   */
  selectNextCell(): void;

  /**
   * Select the previous cell in the notebook.
   */
  selectPreviousCell(): void;

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
   * Populate from a JSON notebook model.
   */
  fromJSON(data: INotebookContent): void;

  /**
   * Create a JSON notebook model.
   */
  toJSON(): INotebookContent;

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
   * Get the mode of the notebook.
   */
  get mode(): NotebookMode {
    return NotebookModelPrivate.modeProperty.get(this);
  }

  /**
   * Set the mode of the notebook.
   */
  set mode(value: NotebookMode) {
    NotebookModelPrivate.modeProperty.set(this, value);
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
   * Set the selected cell index.
   */
  set selectedCellIndex(value: number) {
    NotebookModelPrivate.selectedCellIndexProperty.set(this, value);
    let cells = this.cells;
    for (let i = 0; i < cells.length; i++) {
      cells.get(i).selected = value === i;
    }
  }

  /**
   * Get the dirty state of the notebook.
   */
  get dirty(): boolean {
    return NotebookModelPrivate.dirtyProperty.get(this);
  }

  /**
   * Set the dirty state of the notebook.
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
   * Select the next cell in the notebook.
   */
  selectNextCell() {
    if (this.selectedCellIndex < this.cells.length - 1) {
      this.selectedCellIndex += 1;
    }
  }

  /**
   * Select the previous cell in the notebook.
   */
  selectPreviousCell() {
    if (this.selectedCellIndex > 0) {
      this.selectedCellIndex -= 1;
    }
  }

  /**
   * Create a code cell model.
   */
  createCodeCell(source?: ICellModel): ICodeCellModel {
    let mimetype = this.defaultMimetype;
    if (source) {
      mimetype = source.input.textEditor.mimetype;
    }
    let cell = new CodeCellModel({ 
      mimetype: mimetype,
      readOnly: this.readOnly
    });
    if (source) {
      cell.input.textEditor.text = source.input.textEditor.text;
      cell.dirty = source.dirty;
      cell.tags = source.tags;
      cell.collapsed = (source as ICodeCellModel).collapsed || false;
      cell.scrolled = (source as ICodeCellModel).scrolled || false;
    }
    return cell;
  }

  /**
   * Create a markdown cell model.
   */
  createMarkdownCell(source?: ICellModel): IMarkdownCellModel {
    let cell = new MarkdownCellModel({ 
      mimetype: 'text/x-ipythongfm',
      readOnly: this.readOnly
    });
    if (source) {
      cell.input.textEditor.text = source.input.textEditor.text;
      cell.dirty = source.dirty;
      cell.tags = source.tags;
      cell.rendered = (source as IMarkdownCellModel).rendered || false;
    }
    return cell;
  }

  /**
   * Create a raw cell model.
   */
  createRawCell(source?: ICellModel): IRawCellModel {
    let cell = new RawCellModel();
    if (source) {
      cell.input.textEditor.text = source.input.textEditor.text;
      cell.dirty = source.dirty;
      cell.tags = source.tags;
      cell.format = (source as IRawCellModel).format;
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
    }
    this.selectNextCell();
  }

  /**
   * Populate from a JSON notebook model.
   */
  fromJSON(data: INotebookContent): void {
    this.cells.clear();

    // Iterate through the cell data, creating cell models.
    data.cells.forEach((c) => {
      let cell: ICellModel;
      if (isMarkdownCell(c)) {
        cell = this.createMarkdownCell();
      } else if (isCodeCell(c)) {
        cell = this.createCodeCell();
      } else if (isRawCell(c)) {
        cell = this.createRawCell();
      }
      cell.fromJSON(c);
      this.cells.add(cell);
    });
    
    if (this.cells.length) {
      this.selectedCellIndex = 0;
    }
    this.metadata = data.metadata;
  }

  /**
   * Create a JSON notebook model.
   */
  toJSON(): INotebookContent {
    let cells: ICell[] = [];
    for (let i = 0; i < this.cells.length; i++) {
      let cell = this.cells.get(i);
      cells.push(cell.toJSON());
    }
    return {
      cells: cells,
      metadata: this.metadata, 
      nbformat: MAJOR_VERSION, 
      nbformat_minor: MINOR_VERSION 
    };
  }

  /**
   * Execute the given cell. 
   */
  protected executeCell(cell: CodeCellModel): void {
    if (this.readOnly) {
      return;
    }
    let session = this.session;
    if (!session) {
      return;
    }
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
  }

  /**
   * Handle a change in the cells list.
   */
  private _onCellsChanged(list: ObservableList<ICellModel>, change: IListChangedArgs<ICellModel>): void {
    if (change.type === ListChangeType.Add) {
      let cell = change.newValue as ICellModel;
      cell.stateChanged.connect(this._onCellStateChanged, this);
    }
  }

  /**
   * Handle a change to a cell state.
   */
  private _onCellStateChanged(cell: ICellModel, change: IChangedArgs<ICellModel>): void {
    if (change.name === 'dirty' && change.newValue) {
      this.dirty = true;
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
  * A property descriptor which holds the default mimetype for new code cells.
  */
  export
  const defaultMimetype = new Property<NotebookModel, string>({
    name: 'defaultMimetype',
    value: "text/x-ipython",
    notify: stateChangedSignal,
  });

  /**
  * A property descriptor which holds the mode of the notebook.
  */
  export
  const modeProperty = new Property<NotebookModel, NotebookMode>({
    name: 'mode',
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
