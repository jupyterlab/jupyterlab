import {
  ICellModel, 
  ICodeCellModel, CodeCellModel,
  IMarkdownCellModel, MarkdownCellModel,
  IRawCellModel
} from 'jupyter-js-cells';

import {
  IObservableList, ObservableList, ListChangeType
} from 'phosphor-observablelist';

import {
  Widget
} from 'phosphor-widget';

import {
  ISignal, Signal
} from 'phosphor-signaling';

import {
  IChangedArgs, Property
} from 'phosphor-properties';

import {
  InputAreaModel
} from 'jupyter-js-input-area';

import {
  OutputAreaModel,
  DisplayDataModel, ExecuteResultModel,
  ExecuteErrorModel, StreamModel,
  StreamName
} from 'jupyter-js-output-area';


import './index.css';


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
   * Whether the current notebook state is persisted.
   *
   * #### Notes
   * A dirty notebook has unpersisted changes.
   */
  //dirtyIndicator: boolean;

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
   * The currently selected cell.
   *
   * #### Notes
   * Changing this property will deselect the previous cell.
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
  //createRawCell(source?: ICellModel): IRawCellModel;
}


/**
 * An implementation of a notebook Model.
 */
export
class NotebookModel implements INotebookModel {
  /**
   * A signal emitted when the state of the model changes.
   *
   * **See also:** [[stateChanged]]
   */
  static stateChangedSignal = new Signal<INotebookModel, IChangedArgs<any>>();

  /**
  * A property descriptor which holds the default mimetype for new code cells.
  *
  * **See also:** [[defaultMimeType]]
  */
  static defaultMimetype = new Property<NotebookModel, string>({
      name: 'defaultMimetype',
      notify: NotebookModel.stateChangedSignal,
  });
  
  /**
  * A property descriptor which holds the mode of the notebook.
  *
  * **See also:** [[mode]]
  */
  static modeProperty = new Property<NotebookModel, NotebookMode>({
      name: 'mode',
      notify: NotebookModel.stateChangedSignal,
  });
  
  
  /**
  * A property descriptor for the selected cell index.
  *
  * **See also:** [[selectedCellIndex]]
  */
  static selectedCellIndexProperty = new Property<NotebookModel, number>({
      name: 'selectedCellIndex',
      notify: NotebookModel.stateChangedSignal,
  });


  /**
   * A signal emitted when the state of the model changes.
   *
   * #### Notes
   * This is a pure delegate to the [[stateChangedSignal]].
   */
  get stateChanged(): ISignal<INotebookModel, IChangedArgs<any>> {
    return NotebookModel.stateChangedSignal.bind(this);
  }

  /**
   * Get the default mimetype for cells new code cells.
   *
   * #### Notes
   * This is a pure delegate to the [[defaultMimetype]].
   */
  get defaultMimetype() {
    return NotebookModel.defaultMimetype.get(this);
  }

  /**
   * Set the default mimetype for cells new code cells.
   *
   * #### Notes
   * This is a pure delegate to the [[defaultMimetype]].
   */
  set defaultMimetype(value: string) {
    NotebookModel.defaultMimetype.set(this, value);
  }

  /**
   * Get the mode of the notebook.
   *
   * #### Notes
   * This is a pure delegate to the [[modeProperty]].
   */
  get mode() {
    return NotebookModel.modeProperty.get(this);
  }

  /**
   * Set the mode of the notebook.
   *
   * #### Notes
   * This is a pure delegate to the [[modeProperty]].
   */
  set mode(value: NotebookMode) {
    NotebookModel.modeProperty.set(this, value);
  }

  /**
   * Get the selected cell index.
   *
   * #### Notes
   * This is a pure delegate to the [[selectedCellIndexProperty]].
   */
  get selectedCellIndex() {
    return NotebookModel.selectedCellIndexProperty.get(this);
  }

  /**
   * Set the selected cell index.
   *
   * #### Notes
   * This is a pure delegate to the [[selectedCellIndexProperty]].
   */
  set selectedCellIndex(value: number) {
    NotebookModel.selectedCellIndexProperty.set(this, value);
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
    let cell = new CodeCellModel();
    return cell;
  }

  /**
   * Create a markdown cell model.
   */
  createMarkdownCell(source?: ICellModel): IMarkdownCellModel {
    let cell  = new MarkdownCellModel();
    return cell;
  }

  cells: IObservableList<ICellModel> = new ObservableList<ICellModel>();  
}

