// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  INotebookSession
} from 'jupyter-js-services';

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
  executeCodeCell, ICellModel,
  ICodeCellModel, CodeCellModel,
  IMarkdownCellModel, MarkdownCellModel,
  IRawCellModel, isCodeCellModel, isMarkdownCellModel,
  RawCellModel, isRawCellModel, MetadataCursor, IMetadataCursor
} from '../cells/model';


/**
 * The default console kernelspec metadata.
 */
const DEFAULT_KERNELSPEC = {
  name: 'unknown',
  display_name: 'No Kernel!'
}

/**
 * The default console languageinfo metadata.
 */
const DEFAULT_LANG_INFO = {
  name: 'unknown'
}


/**
 * The definition of a model object for a console widget.
 */
export
interface IConsoleModel extends IDisposable {
  /**
   * A signal emitted when state of the console changes.
   */
  stateChanged: ISignal<IConsoleModel, IChangedArgs<any>>;

  /**
   * A signal emitted when a user metadata state changes.
   */
  metadataChanged: ISignal<IConsoleModel, string>;

  /**
   * A signal emitted when the selection changes.
   */
  selectionChanged: ISignal<IConsoleModel, void>;

  /**
   * The banner that appears at the top of a console session.
   */
  banner: string;

  /**
   * The list of cells in the console.
   *
   * #### Notes
   * This is a read-only property.
   */
  cells: IObservableList<ICellModel>;

  /**
   * The default mime type for new code cells in the console.
   *
   * #### Notes
   * This can be considered the default language of the console.
   */
  defaultMimetype: string;

  /**
   * The optional notebook session associated with the model.
   */
  session?: INotebookSession;

  /**
   * Run the current contents of the console prompt.
   */
  run(): void;

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
   * defaults to the console [[defaultMimetype]].
   *
   * In a console, the only situation where the source parameter is passed in
   * is when the user navigates the command history with the up and down keys.
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
}


/**
 * An implementation of a console model.
 */
export
class ConsoleModel implements IConsoleModel {
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
   * Construct a new console model.
   */
  constructor() {
    this._banner = this.createRawCell();
    this._banner.input.textEditor.readOnly = true;
    this._banner.input.textEditor.text = this._bannerText;

    this._cells = new ObservableList<ICellModel>();

    // The first cell in a console is always the banner.
    this._cells.add(this._banner);
    // The last cell in a console is always the prompt.
    this._cells.add(this.createCodeCell());

    this._cells.changed.connect(this.onCellsChanged, this);
  }

  /**
   * A signal emitted when the state of the model changes.
   */
  get stateChanged(): ISignal<IConsoleModel, IChangedArgs<any>> {
    return ConsoleModelPrivate.stateChangedSignal.bind(this);
  }

  /**
   * A signal emitted when a user metadata state changes.
   *
   * #### Notes
   * The signal argument is the namespace of the metadata that changed.
   */
  get metadataChanged(): ISignal<IConsoleModel, string> {
    return ConsoleModelPrivate.metadataChangedSignal.bind(this);
  }

  /**
   * A signal emitted when the selection changes.
   */
  get selectionChanged(): ISignal<IConsoleModel, void> {
    return ConsoleModelPrivate.selectionChangedSignal.bind(this);
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
   * The banner that appears at the top of a console session.
   */
  get banner(): string {
    return this._bannerText;
  }
  set banner(newValue: string) {
    if (newValue === this._bannerText) {
      return;
    }
    let oldValue = this._bannerText;
    this._bannerText = newValue;
    if (this._banner !== null) {
      this._banner.input.textEditor.text = newValue;
    }
    let name = 'banner';
    this.stateChanged.emit({ name, oldValue, newValue });
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
   * The session for the console.
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
    ConsoleModelPrivate.sessionChanged(this, newValue);
    let name = 'session';
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
   * Create a code cell model.
   */
  createCodeCell(source?: ICellModel): ICodeCellModel {
    let mimetype = this.defaultMimetype;
    if (source && isCodeCellModel(source)) {
      mimetype = source.input.textEditor.mimetype;
    }
    let constructor = this.constructor as typeof ConsoleModel;
    let editor = constructor.createEditor({ mimetype });
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
    return cell;
  }

  /**
   * Create a markdown cell model.
   */
  createMarkdownCell(source?: ICellModel): IMarkdownCellModel {
    let constructor = this.constructor as typeof ConsoleModel;
    let editor = constructor.createEditor({ mimetype: 'text/x-ipythongfm' });
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
    return cell;
  }

  /**
   * Create a raw cell model.
   */
  createRawCell(source?: ICellModel): IRawCellModel {
    let constructor = this.constructor as typeof ConsoleModel;
    let editor = constructor.createEditor();
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
    return cell;
  }

  /**
   * Run the current contents of the console prompt.
   */
  run(): void {
    let prompt = this._cells.get(this._cells.length - 1) as ICodeCellModel;
    let session = this.session;
    if (!session || !session.kernel) {
      return;
    }
    prompt.trusted = true;
    prompt.input.textEditor.readOnly = true;
    let newPrompt = () => { this._cells.add(this.createCodeCell()); };
    // Whether the code cell executes or not, create a new prompt.
    executeCodeCell(prompt, session.kernel).then(newPrompt, newPrompt);
  }

  /**
   * Execute the given cell.
   */
  protected executeCell(cell: CodeCellModel): void {
    let text = cell.input.textEditor.text.trim();
    cell.executionCount = null;
    cell.input.prompt = 'In [ ]:';
    if (!text) {
      return;
    }
    // TODO: If kernel does not exist, bail.
    cell.input.prompt = 'In [*]:';
    let output = cell.output;
    output.clear(false);
    cell.trusted = true;
    // TODO: Execute code.
  }

  /**
   * Handle a change in the cells list.
   */
  protected onCellsChanged(list: ObservableList<ICellModel>, change: IListChangedArgs<ICellModel>): void {
    switch (change.type) {
    case ListChangeType.Add:
      // TODO: Handle addition: change.newIndex
      break;
    case ListChangeType.Remove:
      (change.oldValue as ICellModel).dispose();
      // TODO: Handle removal: change.oldIndex
      break;
    case ListChangeType.Replace:
      let oldValues = change.oldValue as ICellModel[];
      for (let cell of oldValues) {
        cell.dispose();
      }
      break;
    }
  }

  private _banner: IRawCellModel = null;
  private _bannerText: string = '...';
  private _cells: IObservableList<ICellModel> = null;
  private _defaultMimetype = 'text/x-ipython';
  private _metadata: { [key: string]: string } = Object.create(null);
  private _session: INotebookSession = null;
}


/**
 * A private namespace for notebook model data.
 */
namespace ConsoleModelPrivate {
  /**
   * A signal emitted when the state of the model changes.
   */
  export
  const stateChangedSignal = new Signal<IConsoleModel, IChangedArgs<any>>();

  /**
   * A signal emitted when a user metadata state changes.
   */
  export
  const metadataChangedSignal = new Signal<IConsoleModel, string>();

  /**
   * A signal emitted when a the selection state changes.
   */
  export
  const selectionChangedSignal = new Signal<IConsoleModel, void>();

  /**
   * An attached property for the selected state of a cell.
   */
  export
  const selectedProperty = new Property<ICellModel, boolean>({
    name: 'selected',
    value: false
  });

  /**
   * Handle a change to the model kernel.
   */
  function kernelChanged(model: IConsoleModel): void {
    let session = model.session;
    let kernel = session.kernel;
    session.kernel.kernelInfo().then(info => {
      console.log('info', info);
      model.banner = info.banner;
    });
  }

  /*
   * Handle a change to the model session.
   */
  export
  function sessionChanged(model: IConsoleModel, session: INotebookSession): void {
    model.session.kernelChanged.connect(() => { kernelChanged(model); });
    // Update the kernel data now.
    kernelChanged(model);
  }

}
