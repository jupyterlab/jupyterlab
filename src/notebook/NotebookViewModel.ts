import {
  ICellViewModel, 
  ICodeCellViewModel, CodeCellViewModel,
  IMarkdownCellViewModel, MarkdownCellViewModel,
  IRawCellViewModel
} from 'jupyter-js-cells';

import {
  IObservableList
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
interface INotebookViewModel {
  /**
   * A signal emitted when state of the notebook changes.
   */
  stateChanged: ISignal<INotebookViewModel, IChangedArgs<any>>;

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
  cells: IObservableList<ICellViewModel>;

  /**
   * The currently selected cell.
   *
   * #### Notes
   * Changing this property will deselect the previous cell.
   */
  selectedCell: ICellViewModel;

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
  createCodeCell(source?: ICellViewModel): ICodeCellViewModel;

  /**
   * A factory for creating a new Markdown cell.
   *
   * @param source - The cell to use for the original source data.
   *
   * @returns A new markdown cell. If a source cell is provided, the
   *   new cell will be intialized with the data from the source.
   */
  createMarkdownCell(source?: ICellViewModel): IMarkdownCellViewModel;

  /**
   * A factory for creating a new raw cell.
   *
   * @param source - The cell to use for the original source data.
   *
   * @returns A new raw cell. If a source cell is provided, the
   *   new cell will be intialized with the data from the source.
   */
  //createRawCell(source?: ICellViewModel): IRawCellViewModel;
}


/**
 * An implementation of a notebook viewmodel.
 */
export
class NotebookViewModel implements INotebookViewModel {

  /**
   * A signal emitted when the state of the model changes.
   *
   * **See also:** [[stateChanged]]
   */
  static stateChangedSignal = new Signal<INotebookViewModel, IChangedArgs<any>>();


  /**
   * A signal emitted when the state of the model changes.
   *
   * #### Notes
   * This is a pure delegate to the [[stateChangedSignal]].
   */
  get stateChanged(): ISignal<INotebookViewModel, IChangedArgs<any>> {
    return NotebookViewModel.stateChangedSignal.bind(this);
  }


  defaultMimetype: string;
  mode: NotebookMode;
  cells: IObservableList<ICellViewModel>;
  selectedCell: ICellViewModel;
  
  createCodeCell(source?: ICellViewModel): ICodeCellViewModel {
    let cell = new CodeCellViewModel();
    cell.input = new InputAreaModel();
    cell.input.textEditor = new TextEdit 
    return newCell;
    
  }
  createMarkdownCell(source?: ICellViewModel): IMarkdownCellViewModel {
    
  }
}
