// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JSONObject
} from '@phosphor/coreutils';

import {
  map, toArray
} from '@phosphor/algorithm';

import {
  Message
} from '@phosphor/messaging';

import {
  Panel, PanelLayout, Widget
} from '@phosphor/widgets';

import {
} from '@phosphor/widgets';

import {
  IEditorMimeTypeService, CodeEditor
} from '@jupyterlab/codeeditor';

import {
  BaseCellWidget,
  CellModel, IMarkdownCellModel,
  MarkdownCellModel, MarkdownCellWidget
} from '@jupyterlab/cells';

import {
  nbformat, IObservableVector, ObservableVector
} from '@jupyterlab/coreutils';

import {
  IRenderMime
} from '@jupyterlab/rendermime';


/**
 * The class name added to chatbox widgets.
 */
const CHATBOX_CLASS = 'jp-Chatbox';

/**
 * The class name of the active prompt
 */
const PROMPT_CLASS = 'jp-Chatbox-prompt';

/**
 * The class name of the panel that holds cell content.
 */
const CONTENT_CLASS = 'jp-Chatbox-content';

/**
 * The class name of the panel that holds prompts.
 */
const INPUT_CLASS = 'jp-Chatbox-input';


/**
 * A widget containing a Jupyter chatbox.
 *
 * #### Notes
 * The Chatbox class is intended to be used within a ChatboxPanel
 * instance. Under most circumstances, it is not instantiated by user code.
 */
export
class Chatbox extends Widget {
  /**
   * Construct a chatbox widget.
   */
  constructor(options: Chatbox.IOptions) {
    super();
    this.addClass(CHATBOX_CLASS);

    // Create the panels that hold the content and input.
    let layout = this.layout = new PanelLayout();
    this._content = new Panel();
    this._input = new Panel();
    this._log = new ObservableVector<Chatbox.IChatEntry>();

    this.contentFactory = options.contentFactory;
    this.modelFactory = (
      options.modelFactory || Chatbox.defaultModelFactory
    );
    this.rendermime = options.rendermime;
    this._mimeTypeService = options.mimeTypeService;

    // Add top-level CSS classes.
    this._content.addClass(CONTENT_CLASS);
    this._input.addClass(INPUT_CLASS);

    // Insert the content and input panes into the widget.
    layout.addWidget(this._content);
    layout.addWidget(this._input);
  }

  /**
   * The content factory used by the chatbox.
   */
  readonly contentFactory: Chatbox.IContentFactory;

  /**
   * The model factory for the chatbox widget.
   */
  readonly modelFactory: Chatbox.IModelFactory;

  /**
   * The rendermime instance used by the chatbox.
   */
  readonly rendermime: IRenderMime;

  /*
   * The chatbox input prompt.
   */
  get prompt(): MarkdownCellWidget | null {
    let inputLayout = (this._input.layout as PanelLayout);
    return inputLayout.widgets[0] as MarkdownCellWidget || null;
  }

  /**
   * Add a new cell to the content panel.
   *
   * @param cell - The cell widget being added to the content panel.
   *
   * #### Notes
   * This method is meant for use by outside classes that want to inject content
   * into a chatbox. It is distinct from the `inject` method in that it requires
   * rendered code cell widgets and does not execute them.
   */
  addCell(cell: BaseCellWidget) {
    this._content.addWidget(cell);
  }

  /**
   * Clear the code cells.
   */
  clear(): void {
    // Dispose all the content cells.
    let cells = this._content.widgets;
    while (cells.length) {
      cells[1].dispose();
    }
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose() {
    // Do nothing if already disposed.
    if (this._log === null) {
      return;
    }
    let log = this._log;
    this._log = null;

    log.dispose();
    super.dispose();
  }

  /**
   * Execute the current prompt.
   *
   * @param timeout - The length of time, in milliseconds, that the execution
   * should wait for the API to determine whether code being submitted is
   * incomplete before attempting submission anyway. The default value is `250`.
   */
  post(): void {
    let prompt = this.prompt;

    if (prompt.model.value.text.trim() !== '') {
      this.newPrompt();
      prompt.model.trusted = true;
      this._post(prompt);
    } else {
      return;
    }
  }

  /**
   * Serialize the output.
   */
  serialize(): nbformat.IMarkdownCell[] {
    let prompt = this.prompt;
    let layout = this._content.layout as PanelLayout;
    // Serialize content.
    let output = map(layout.widgets, widget => {
      return (widget as MarkdownCellWidget).model.toJSON() as nbformat.IMarkdownCell;
    });
    // Serialize prompt and return.
    return toArray(output).concat(prompt.model.toJSON() as nbformat.IMarkdownCell);
  }


  /**
   * Handle the DOM events for the widget.
   *
   * @param event - The DOM event sent to the widget.
   *
   * #### Notes
   * This method implements the DOM `EventListener` interface and is
   * called in response to events on the notebook panel's node. It should
   * not be called directly by user code.
   */
  handleEvent(event: Event): void {
    switch (event.type) {
    case 'keydown':
      this._evtKeyDown(event as KeyboardEvent);
      break;
    default:
      break;
    }
  }

  /**
   * Handle `after_attach` messages for the widget.
   */
  protected onAfterAttach(msg: Message): void {
    let node = this.node;
    node.addEventListener('keydown', this, true);
    // Create a prompt if necessary.
    if (!this.prompt) {
      this.newPrompt();
    } else {
      this.prompt.editor.focus();
      this.update();
    }
  }

  /**
   * Handle `before-detach` messages for the widget.
   */
  protected onBeforeDetach(msg: Message): void {
    let node = this.node;
    node.removeEventListener('keydown', this, true);
  }

  /**
   * Handle `'activate-request'` messages.
   */
  protected onActivateRequest(msg: Message): void {
    this.prompt.editor.focus();
    this.update();
  }

  /**
   * Make a new prompt.
   */
  protected newPrompt(): void {
    let prompt = this.prompt;
    let input = this._input;

    // Make the last prompt read-only, clear its signals, and move to content.
    if (prompt) {
      prompt.readOnly = true;
      prompt.removeClass(PROMPT_CLASS);
      (input.layout as PanelLayout).removeWidgetAt(0);
      this.addCell(prompt);
    }

    // Create the new prompt.
    let factory = this.contentFactory;
    let options = this._createMarkdownCellOptions();
    prompt = factory.createPrompt(options, this);
    prompt.model.mimeType = this._mimetype;
    prompt.addClass(PROMPT_CLASS);
    prompt.rendered = false;
    this._input.addWidget(prompt);

    if (this.isAttached) {
      this.activate();
    }
  }

  /**
   * Handle `update-request` messages.
   */
  protected onUpdateRequest(msg: Message): void {
    Private.scrollToBottom(this._content.node);
  }

  /**
   * Handle the `'keydown'` event for the widget.
   */
  private _evtKeyDown(event: KeyboardEvent): void {
    let editor = this.prompt.editor;
    if (event.keyCode === 13 && !editor.hasFocus()) {
      event.preventDefault();
      editor.focus();
    }
  }

  /**
   * Execute the code in the current prompt.
   */
  private _post(cell: MarkdownCellWidget): void {
    this._log.pushBack({ text: cell.model.value.text, author: null });
    cell.model.contentChanged.connect(this.update, this);
    cell.rendered = true;
  }

  /**
   * Create the options used to initialize markdown cell widget.
   */
  private _createMarkdownCellOptions(): MarkdownCellWidget.IOptions {
    let contentFactory = this.contentFactory.markdownCellContentFactory;
    let modelFactory = this.modelFactory;
    let model = modelFactory.createMarkdownCell({ });
    let rendermime = this.rendermime;
    return { model, rendermime, contentFactory };
  }

  private _mimeTypeService: IEditorMimeTypeService;
  private _content: Panel = null;
  private _log: IObservableVector<Chatbox.IChatEntry> = null;
  private _input: Panel = null;
  private _mimetype = 'text/x-ipython';
}


/**
 * A namespace for Chatbox statics.
 */
export
namespace Chatbox {
  /**
   * The initialization options for a chatbox widget.
   */
  export
  interface IOptions {
    /**
     * The content factory for the chatbox widget.
     */
    contentFactory: IContentFactory;

    /**
     * The model factory for the chatbox widget.
     */
    modelFactory?: IModelFactory;

    /**
     * The mime renderer for the chatbox widget.
     */
    rendermime: IRenderMime;

    /**
     * The service used to look up mime types.
     */
    mimeTypeService: IEditorMimeTypeService;
  }

  /**
   * A content factory for chatbox children.
   */
  export
  interface IContentFactory {
    /**
     * The editor factory.
     */
    readonly editorFactory: CodeEditor.Factory;

    /**
     * The factory for a markdown cell widget.
     */
    readonly markdownCellContentFactory: BaseCellWidget.IContentFactory;

    /**
     * Create a new prompt widget.
     */
    createPrompt(options: MarkdownCellWidget.IOptions, parent: Chatbox): MarkdownCellWidget;

  }

  /**
   * An interface for an entry in the chat log.
   */
  export
  interface IChatEntry extends JSONObject {
    /**
     * The text of the chat entry.
     */
    text: string;

    /**
     * The collaborator who logged the entry.
     */
    author: any;
  }

  /**
   * Default implementation of `IContentFactory`.
   */
  export
  class ContentFactory implements IContentFactory {
    /**
     * Create a new content factory.
     */
    constructor(options: IContentFactoryOptions) {
      this.editorFactory = options.editorFactory;

      this.markdownCellContentFactory = new MarkdownCellWidget.ContentFactory({
        editorFactory: this.editorFactory,
      });
    }

    /**
     * The editor factory.
     */
    readonly editorFactory: CodeEditor.Factory;

    /**
     * The factory for a markdown cell widget.
     */
    readonly markdownCellContentFactory: BaseCellWidget.IContentFactory;

    /**
     * Create a new prompt widget.
     */
    createPrompt(options: MarkdownCellWidget.IOptions, parent: Chatbox): MarkdownCellWidget {
      return new MarkdownCellWidget(options);
    }
  }
  /**
   * An initialize options for `ContentFactory`.
   */
  export
  interface IContentFactoryOptions {
    /**
     * The editor factory.
     */
    editorFactory: CodeEditor.Factory;
  }

  /**
   * A model factory for a chatbox widget.
   */
  export
  interface IModelFactory {
    /**
     * Create a new markdown cell.
     *
     * @param options - The options used to create the cell.
     *
     * @returns A new code cell. If a source cell is provided, the
     *   new cell will be intialized with the data from the source.
     */
    createMarkdownCell(options: CellModel.IOptions): IMarkdownCellModel;
  }

  /**
   * The default implementation of an `IModelFactory`.
   */
  export
  class ModelFactory {
    /**
     * Create a new markdown cell.
     *
     * @param source - The data to use for the original source data.
     *
     * @returns A new markdown cell. If a source cell is provided, the
     *   new cell will be intialized with the data from the source.
     */
    createMarkdownCell(options: CellModel.IOptions): IMarkdownCellModel {
      return new MarkdownCellModel(options);
    }
  }

  /**
   * The default `ModelFactory` instance.
   */
  export
  const defaultModelFactory = new ModelFactory();
}


/**
 * A namespace for chatbox widget private data.
 */
namespace Private {
  /**
   * Jump to the bottom of a node.
   *
   * @param node - The scrollable element.
   */
  export
  function scrollToBottom(node: HTMLElement): void {
    node.scrollTop = node.scrollHeight - node.clientHeight;
  }
}
