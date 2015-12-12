import {
  ICellViewModel, 
  ICodeCellViewModel, CodeCellViewModel,
  IMarkdownCellViewModel, MarkdownCellViewModel,
  IRawCellViewModel
} from 'jupyter-js-cells';

import {
  IObservableList, ObservableList
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
  InputAreaViewModel, TextEditorViewModel
} from 'jupyter-js-input-area';

import {
  OutputAreaViewModel,
  DisplayDataViewModel, ExecuteResultViewModel,
  ExecuteErrorViewModel, StreamViewModel,
  StreamName
} from 'jupyter-js-output-area';

import {
  NBData, MarkdownCell, CodeCell, 
  isMarkdownCell, isCodeCell,
  DisplayData, isDisplayData, 
  ExecuteResult, isExecuteResult,
  Stream, isStream,
  JupyterError, isJupyterError
} from './nbformat';


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
  mode: NotebookMode = NotebookMode.Command;
  cells: IObservableList<ICellViewModel> = new ObservableList<ICellViewModel>();
  selectedCell: ICellViewModel;
  
  createCodeCell(source?: ICellViewModel): ICodeCellViewModel {
    let cell = new CodeCellViewModel();
    return cell;
    
  }
  createMarkdownCell(source?: ICellViewModel): IMarkdownCellViewModel {
    let cell  = new MarkdownCellViewModel();
    return cell;
  }
}

export
function makeModels(data: NBData): NotebookViewModel {
  // Construct the entire model hierarchy explicitly  
  let nb = new NotebookViewModel();
  nb.defaultMimetype = 'text/x-python';
  
  // iterate through the cell data, creating cell models
  data.content.cells.forEach((c) => {
    let input = new InputAreaViewModel();
    input.textEditor = new TextEditorViewModel();
    input.textEditor.text = c.source;
    
    if (isMarkdownCell(c)) {
      let cell = new MarkdownCellViewModel();
      cell.input = input;
      cell.rendered = true;
      nb.cells.add(cell);
    } else if (isCodeCell(c)) {
      let cell = new CodeCellViewModel();
      cell.input = input;
      let outputArea = new OutputAreaViewModel();
      cell.output = outputArea;
      for (let i=0; i<c.outputs.length; i++) {
        let out = c.outputs[i];
        if (isDisplayData(out)) {
          let outmodel = new DisplayDataViewModel();
          outmodel.data = out.data;
          outmodel.metadata = out.metadata;
          outputArea.add(outmodel);
        } else if (isStream(out)) {
          let outmodel = new StreamViewModel();
          switch (out.name) {
          case 'stdout':
            outmodel.name = StreamName.StdOut;
            break;
          case 'stderr':
            outmodel.name = StreamName.StdErr;
            break;
          default:
            console.error('Unrecognized stream name: %s', out.name);
          }
          outmodel.text = out.text;
          outputArea.add(outmodel);          
        } else if (isJupyterError(out)) {
          let outmodel = new ExecuteErrorViewModel();
          outmodel.ename = out.ename;
          outmodel.evalue = out.evalue;
          outmodel.traceback = out.traceback.join('\n');
          outputArea.add(outmodel);
        } else if (isExecuteResult(out)) {
          let outmodel = new ExecuteResultViewModel();
          outmodel.data = out.data;
          outmodel.executionCount = out.execution_count;
          outmodel.metadata = out.metadata;
          outputArea.add(outmodel);
        }
      }
      nb.cells.add(cell);
    }
  });
  return nb;
}
