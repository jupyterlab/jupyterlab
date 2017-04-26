// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  each
} from '@phosphor/algorithm';

import {
  DisposableSet
} from '@phosphor/disposable';

import {
  Message
} from '@phosphor/messaging';

import {
  Panel, PanelLayout, Widget
} from '@phosphor/widgets';

import {
} from '@phosphor/widgets';

import {
  DocumentRegistry
} from '@jupyterlab/docregistry';

import {
  IEditorMimeTypeService, CodeEditor
} from '@jupyterlab/codeeditor';

import {
  BaseCellWidget,
  MarkdownCellModel, MarkdownCellWidget
} from '@jupyterlab/cells';

import {
  IObservableVector, ObservableVector
} from '@jupyterlab/coreutils';

import {
  IRenderMime
} from '@jupyterlab/rendermime';

import {
  ChatEntry
} from './entry';


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

    this.contentFactory = options.contentFactory;
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
   * The rendermime instance used by the chatbox.
   */
  readonly rendermime: IRenderMime;

  /**
   * Whether the chatbox has been disposed.
   */
  get isDisposed(): boolean {
    return this._disposables === null;
  }

  /*
   * The chatbox input prompt.
   */
  get prompt(): MarkdownCellWidget | null {
    let inputLayout = (this._input.layout as PanelLayout);
    return inputLayout.widgets[0] as MarkdownCellWidget || null;
  }

  /**
   * The document model associated with the chatbox.
   */
  get model(): DocumentRegistry.IModel {
    return this._model;
  }
  set model(model: DocumentRegistry.IModel) {
    this._model = model;
    let modelDB: any = (this._model as any).modelDB;
    if (modelDB) {
      modelDB.connected.then(() => {
        // Update the chatlog vector.
        if (this._log) {
          this._log.changed.disconnect(this._onLogChanged, this);
        }
        if (modelDB.has('internal:chat')) {
          this._log = modelDB.get('internal:chat') as IObservableVector<ChatEntry.IModel>;
        } else {
          this._log = modelDB.createVector('internal:chat');
        }
        this._log.changed.connect(this._onLogChanged, this);

        // Remove any existing widgets.
        this.clear();
        each(this._log, entry => {
          let entryWidget = this._entryWidgetFromModel(entry);
          this._content.addWidget(entryWidget);
        });
        this.update();
      });
    }
  }

  /**
   * Clear the code cells.
   */
  clear(): void {
    // Dispose all the content cells.
    let entries = this._content.widgets;
    while (entries.length) {
      entries[0].dispose();
    }
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose() {
    // Do nothing if already disposed.
    if (this._disposables === null) {
      return;
    }
    let disposables = this._disposables;
    this._disposables = null;
    disposables.dispose();
    this._log = null;

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
      this._post();
      this._newPrompt();
    } else {
      return;
    }
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
      this._newPrompt();
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
  private _newPrompt(): void {
    let prompt = this.prompt;

    // Create the new prompt.
    let factory = this.contentFactory;
    let options = this._createMarkdownCellOptions();
    prompt = factory.createCell(options);
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

  private _onLogChanged(log: IObservableVector<ChatEntry.IModel>, args: ObservableVector.IChangedArgs<ChatEntry.IModel>) {
    let index = 0;
    let layout = this._content.layout as PanelLayout;
    switch (args.type) {
      case 'add':
        index = args.newIndex;
        each(args.newValues, entry => {
          let entryWidget = this._entryWidgetFromModel(entry);
          layout.insertWidget(index++, entryWidget);
        });
        break;
      case 'remove':
        each(args.oldValues, entry => {
          let widget = layout.widgets[args.oldIndex];
          layout.removeWidgetAt(args.oldIndex);
          widget.dispose();
        });
        break;
      case 'move':
        layout.insertWidget(args.newIndex, layout.widgets[args.oldIndex]);
        break;
      case 'set':
        index = args.newIndex;
        each(args.newValues, entry => {
          let entryWidget = this._entryWidgetFromModel(entry);
          layout.insertWidget(index, entryWidget);
          layout.removeWidgetAt(index+1);
          index++;
        });
        break;
    }
  }

  /**
   * Post the text current prompt.
   */
  private _post(): void {
    // Dispose of the current input widget.
    let prompt = this.prompt;
    (this._input.layout as PanelLayout).removeWidgetAt(0);

    // Add the chat entry to the log.
    let localCollaborator = {
      shortName: 'IR',
      color: '#0022FF'
    };
    this._log.pushBack({ text: prompt.model.value.text, author: localCollaborator });
    prompt.dispose();
  }

  private _entryWidgetFromModel(entry: ChatEntry.IModel): ChatEntry {
    let options = this._createMarkdownCellOptions(entry.text);
    let cellWidget = this.contentFactory.createCell(options);
    this._disposables.add(cellWidget);
    cellWidget.readOnly = true;
    cellWidget.rendered = true;
    let entryWidget = new ChatEntry({
      model: entry,
      cell: cellWidget
    });
    return entryWidget;
  }

  /**
   * Create the options used to initialize markdown cell widget.
   */
  private _createMarkdownCellOptions(text: string = ''): MarkdownCellWidget.IOptions {
    let contentFactory = this.contentFactory.markdownCellContentFactory;
    let model = new MarkdownCellModel({ });
    this._disposables.add(model);
    let rendermime = this.rendermime;
    model.value.text = text || '';
    return { model, rendermime, contentFactory };
  }

  private _mimeTypeService: IEditorMimeTypeService;
  private _content: Panel = null;
  private _log: IObservableVector<ChatEntry.IModel> = null;
  private _input: Panel = null;
  private _mimetype = 'text/x-ipythongfm';
  private _model: DocumentRegistry.IModel = null;
  private _disposables = new DisposableSet();
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
     * Create a new cell widget.
     */
    createCell(options: MarkdownCellWidget.IOptions): MarkdownCellWidget;

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
    createCell(options: MarkdownCellWidget.IOptions): MarkdownCellWidget {
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
