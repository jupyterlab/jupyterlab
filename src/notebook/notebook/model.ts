
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
  IRawCellModel, isCodeCellModel, isMarkdownCellModel
} from '../cells';

import {
  EditorModel
} from '../editor';

import {
  InputAreaModel
} from '../input-area';

import {
  OutputAreaModel,
  DisplayDataModel, ExecuteResultModel,
  ExecuteErrorModel, StreamModel,
  StreamName
} from '../output-area';

import {
  messageToModel
} from './serialize';


/**
 * The interactivity modes for a notebook.
 */
export
enum NotebookMode {
  /**
   * Command mode is used for navigation and manipulation.
   */
  Command,

  /**
   * Edit mode is used for text and code editing.
   */
  Edit
}

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
  //createRawCell(source?: ICellModel): IRawCellModel;

  /**
   * Run the selected cell, taking the appropriate action.
   */
  runSelectedCell(): void;
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
  get defaultMimetype() {
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
  get mode() {
    return NotebookModelPrivate.modeProperty.get(this);
  }

  /**
   * Set the mode of the notebook.
   */
  set mode(value: NotebookMode) {
    NotebookModelPrivate.modeProperty.set(this, value);
  }

  /**
   * Get the session for the notebook.
   */
  get session() {
    return NotebookModelPrivate.sessionProperty.get(this);
  }

  /**
   * Set the session for the notebook.
   */
  set session(value: INotebookSession) {
    NotebookModelPrivate.sessionProperty.set(this, value);
  }

  /**
   * Get the selected cell index.
   */
  get selectedCellIndex() {
    return NotebookModelPrivate.selectedCellIndexProperty.get(this);
  }

  /**
   * Set the selected cell index.
   */
  set selectedCellIndex(value: number) {
    NotebookModelPrivate.selectedCellIndexProperty.set(this, value);
    let cell = this.cells.get(value);
    if (cell) cell.select();
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
    let input = new InputAreaModel();
    input.textEditor = new EditorModel({ lineNumbers: false });
    let cell = new CodeCellModel();
    cell.input = input;
    let outputArea = new OutputAreaModel();
    cell.output = outputArea;
    return cell;
  }

  /**
   * Create a markdown cell model.
   */
  createMarkdownCell(source?: ICellModel): IMarkdownCellModel {
    let input = new InputAreaModel();
    input.textEditor = new EditorModel({ lineNumbers: false });
    let cell  = new MarkdownCellModel();
    cell.input = input;
    return cell;
  }

  /**
   * Run the selected cell, taking the appropriate action.
   */
  runSelectedCell(): void {
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
   * Execute the current cell. 
   */
  protected executeCell(cell: CodeCellModel): void {
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
      let model = messageToModel(msg);
      if (model !== void 0) {
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
  * A property descriptor which holds the session of the notebook.
  */
  export
  const sessionProperty = new Property<NotebookModel, INotebookSession>({
    name: 'session',
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
