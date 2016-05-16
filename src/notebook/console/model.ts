// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  INotebookSession, IInspectReply
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
  IConsoleHistory, ConsoleHistory
} from './history';

import {
  EditorModel, IEditorModel, IEditorOptions, EdgeLocation, ITextChange
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

import {
  MimeBundle
} from '../notebook';


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
 * The definition of a model object for a console tooltip widget.
 */
export
interface ITooltipModel {
  /**
   * The text change that triggered a tooltip.
   */
  change: ITextChange;

  /**
   * The current line of code (which was submitted to API for inspection).
   */
  currentLine: string;

  /**
   * The API inspect request data payload.
   */
  bundle: MimeBundle;
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
   * The dimensions and contents of a console widget tooltip.
   */
  tooltip: ITooltipModel;

  /**
   * The console history manager instance.
   */
  history: IConsoleHistory;

  /**
   * The optional notebook session associated with the console model.
   */
  session?: INotebookSession;

  /**
   * Run the current contents of the console prompt.
   */
  run(): void;

  /**
   * A factory for creating a new console prompt cell.
   *
   * @returns A new console prompt (code) cell.
   */
  createPrompt(): ICodeCellModel;

  /**
   * A factory for creating a new raw cell.
   *
   * @returns A new raw cell.
   */
  createRawCell(): IRawCellModel;
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
    this._history = new ConsoleHistory(this._session && this._session.kernel);
    this._prompt = this.createPrompt();

    // The first cell in a console is always the banner.
    this._cells.add(this._banner);

    // The last cell in a console is always the prompt.
    this._cells.add(this._prompt);

    this._cells.changed.connect(this.onCellsChanged, this);
  }

  /**
   * A signal emitted when the state of the model changes.
   */
  get stateChanged(): ISignal<IConsoleModel, IChangedArgs<any>> {
    return Private.stateChangedSignal.bind(this);
  }

  /**
   * A signal emitted when a user metadata state changes.
   *
   * #### Notes
   * The signal argument is the namespace of the metadata that changed.
   */
  get metadataChanged(): ISignal<IConsoleModel, string> {
    return Private.metadataChangedSignal.bind(this);
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
   * Get the observable list of console cells.
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
   * The dimensions and contents of a console widget tooltip.
   */
  get tooltip(): ITooltipModel {
    return this._tooltip;
  }
  set tooltip(newValue: ITooltipModel) {
    if (Private.matchTooltips(this._tooltip, newValue)) {
      return;
    }
    let oldValue = this._tooltip;
    this._tooltip = newValue;
    let name = 'tooltip';
    this.stateChanged.emit({ name, oldValue, newValue });
  }

  /**
   * Get the console history manager instance.
   *
   * #### Notes
   * This is a read-only property.
   */
  get history(): IConsoleHistory {
    return this._history;
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
    Private.sessionChanged(this, newValue);
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
   * Create a console prompt (code) cell model.
   */
  createPrompt(): ICodeCellModel {
    if (this._prompt) {
      // Record the previous prompt's text in history.
      this._history.push(this._prompt.input.textEditor.text);
      // Stop listening to the previous prompt.
      clearSignalData(this._prompt.input.textEditor);
    }

    let mimetype = this.defaultMimetype;
    let constructor = this.constructor as typeof ConsoleModel;
    let editor = constructor.createEditor({ mimetype });
    let input = constructor.createInput(editor);
    let output = constructor.createOutputArea();
    let cell = new CodeCellModel(input, output);
    let textEditor = input.textEditor;
    cell.trusted = true;

    // Connect each new prompt's edge requests with console history.
    textEditor.edgeRequested.connect(this.onEdgeRequest, this);
    // Connect each new prompt's text changes to console tooltips.
    textEditor.textChanged.connect(this.onTextChange, this);

    return cell;
  }

  /**
   * Create a raw cell model.
   */
  createRawCell(): IRawCellModel {
    let constructor = this.constructor as typeof ConsoleModel;
    let editor = constructor.createEditor();
    let input = constructor.createInput(editor);
    let cell = new RawCellModel(input);
    cell.trusted = true;
    return cell;
  }

  /**
   * Run the current contents of the console prompt.
   */
  run(): void {
    let prompt = this._cells.get(this._cells.length - 1) as ICodeCellModel;
    let session = this.session;
    this.tooltip = null;
    if (!session || !session.kernel) {
      return;
    }
    prompt.trusted = true;
    prompt.input.textEditor.readOnly = true;
    let newPrompt = () => {
      this._prompt = this.createPrompt()
      this._cells.add(this._prompt);
    };
    // Whether the code cell executes or not, create a new prompt.
    executeCodeCell(prompt, session.kernel).then(newPrompt, newPrompt);
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

  /**
   * Handle a text change in the prompt model.
   */
  protected onTextChange(sender: any, args: ITextChange) {
    if (!args.newValue) {
      this.tooltip = null;
      return;
    }

    // If final character of current line isn't a whitespace character, bail.
    let currentLine = args.newValue.split('\n')[args.line];
    if (!currentLine.match(/\S$/)) {
      this.tooltip = null;
      return;
    }

    let pendingInspect = ++this._pendingInspect;
    let contents = {code: currentLine, cursor_pos: args.ch, detail_level: 0};

    this._session.kernel.inspect(contents).then((value: IInspectReply) => {
      // If a newer text change has created a pending request, bail.
      if (pendingInspect !== this._pendingInspect) return;
      // Tooltip request failures or negative results fail silently.
      if (value.status !== 'ok' || !value.found) return;
      console.log('value', value);
      this.tooltip = {
        change: args,
        currentLine: currentLine,
        bundle: Private.processInspectReply(value.data)
      };
    });
  }

  /**
   * Handle an edge request in the prompt model.
   */
  protected onEdgeRequest(sender: any, args: EdgeLocation): void {
    switch (args) {
    case 'top':
      this._history.back().then(value => {
        if (!value) return;
        this._prompt.input.textEditor.text = value;
        this._prompt.input.textEditor.cursorPosition = 0;
      });
      break;
    case 'bottom':
      this._history.forward().then(value => {
        // If at the bottom end of history, then clear the prompt.
        let text = value || '';
        this._prompt.input.textEditor.text = text;
        this._prompt.input.textEditor.cursorPosition = text.length;
      });
      break;
    }
  }

  private _banner: IRawCellModel = null;
  private _bannerText: string = '...';
  private _cells: IObservableList<ICellModel> = null;
  private _defaultMimetype = 'text/x-ipython';
  private _history: IConsoleHistory = null;
  private _metadata: { [key: string]: string } = Object.create(null);
  private _pendingInspect: number = 0;
  private _prompt: ICodeCellModel = null;
  private _tooltip: ITooltipModel = null;
  private _session: INotebookSession = null;
}


/**
 * A private namespace for console model data.
 */
namespace Private {
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
   * Check if two text changes are equal.
   *
   * @param t1 - The first text change.
   *
   * @param t1 - The second text change.
   *
   * @returns `true` if the text changes are equal.
   */
  function matchTextChanges(t1: ITextChange, t2: ITextChange): boolean {
    // Check identity in case both items are null or undefined.
    if (t1 === t2 || !t1 && !t2) return true;
    // If one item is null or undefined, items don't match.
    if (!t1 || !t2) return false;
    return t1.ch === t2.ch &&
           t1.chHeight === t2.chHeight &&
           t1.chWidth === t2.chWidth &&
           t1.line === t2.line &&
           t1.oldValue === t2.oldValue &&
           t1.newValue === t2.newValue &&
           t1.coords.left === t2.coords.left &&
           t1.coords.right === t2.coords.right &&
           t1.coords.top === t2.coords.top &&
           t1.coords.bottom === t2.coords.bottom;
  }

  /**
   * Check if two tooltip models are equal.
   *
   * @param t1 - The first tooltip model.
   *
   * @param t2 - The second tooltip model.
   *
   * @returns `true` if the tooltips are equal.
   */
  export
  function matchTooltips(t1: ITooltipModel, t2: ITooltipModel): boolean {
    // Check identity in case both items are null or undefined.
    if (t1 === t2 || !t1 && !t2) return true;
    // If one item is null or undefined, items don't match.
    if (!t1 || !t2) return false;
    return matchTextChanges(t1.change, t2.change);
  }

  /**
   * Handle a change to the model kernel.
   */
  function kernelChanged(model: IConsoleModel): void {
    let session = model.session;
    let kernel = session.kernel;
    // Update the console history manager kernel.
    model.history.kernel = kernel;
    session.kernel.kernelInfo().then(info => {
      model.banner = info.banner;
    });
  }

  /**
   * Handle a change to the model session.
   */
  export
  function sessionChanged(model: IConsoleModel, session: INotebookSession): void {
    model.session.kernelChanged.connect(() => { kernelChanged(model); });
    // Update the kernel data now.
    kernelChanged(model);
  }

  /**
   * Process the IInspectReply plain text data.
   *
   * @param bundle - The MIME bundle of an API inspect reply.
   *
   * #### Notes
   * The `text/plain` value sent by the API in inspect replies contains ANSI
   * terminal escape sequences. In order for these sequences to be parsed into
   * usable data in the client, they must have the MIME type that the console
   * text renderer expects: `application/vnd.jupyter.console-text`.
   */
  export
  function processInspectReply(bundle: MimeBundle): MimeBundle {
    let textMime = 'text/plain';
    let consoleMime = 'application/vnd.jupyter.console-text';
    bundle[consoleMime] = bundle[consoleMime] || bundle[textMime];
    return bundle;
  }

}
