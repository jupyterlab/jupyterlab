// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  each, ArrayExt
} from '@phosphor/algorithm';

import {
  MimeData
} from '@phosphor/coreutils';

import {
  Signal
} from '@phosphor/signaling';

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
  Drag
} from '@phosphor/dragdrop';

import {
  DocumentRegistry
} from '@jupyterlab/docregistry';

import {
  CodeEditor
} from '@jupyterlab/codeeditor';

import {
  Cell,
  MarkdownCellModel, MarkdownCell
} from '@jupyterlab/cells';

import {
  IObservableList, ActivityMonitor
} from '@jupyterlab/coreutils';

import {
  RenderMime
} from '@jupyterlab/rendermime';

import {
  ChatEntry, CHAT_ENTRY_CLASS
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
 * The class name added to drag images.
 */
const DRAG_IMAGE_CLASS = 'jp-dragImage';

/**
 * The class name added to a filled circle.
 */
const FILLED_CIRCLE_CLASS = 'jp-filledCircle';

/**
 * The mimetype used for Jupyter cell data.
 */
const JUPYTER_CELL_MIME: string = 'application/vnd.jupyter.cells';

/**
 * The threshold in pixels to start a drag event.
 */
const DRAG_THRESHOLD = 5;

/**
 * The number of new entries to render upon loading a
 * new page of the chatlog.
 */
const PAGE_LENGTH = 20;

/**
 * The scroll position at which to request a new page.
 */
const NEW_PAGE_POSITION = 300;

/**
 * Throttle for scrolling for a new page.
 */
const SCROLL_THROTTLE = 1000;


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
    this._rendermime = options.rendermime;

    // Add top-level CSS classes.
    this._content.addClass(CONTENT_CLASS);
    this._input.addClass(INPUT_CLASS);

    // Insert the content and input panes into the widget.
    layout.addWidget(this._content);
    layout.addWidget(this._input);

    // Throttle the scroll paging of the widget.
    this._monitor = new ActivityMonitor({
      signal: this._scrollSignal,
      timeout: SCROLL_THROTTLE
    });
    this._monitor.activityStopped.connect(this._handleScroll, this);
  }

  /**
   * The content factory used by the chatbox.
   */
  readonly contentFactory: Chatbox.IContentFactory;

  /**
   * Whether the chatbox has been disposed.
   */
  get isDisposed(): boolean {
    return this._disposables === null;
  }

  /*
   * The chatbox input prompt.
   */
  get prompt(): MarkdownCell | null {
    let inputLayout = (this._input.layout as PanelLayout);
    return inputLayout.widgets[0] as MarkdownCell || null;
  }

  /**
   * The document model associated with the chatbox.
   */
  get model(): DocumentRegistry.IModel {
    return this._model;
  }
  set model(model: DocumentRegistry.IModel) {
    // Do nothing if it is the same model.
    if (model === this._model) {
      return;
    }
    // Clean up after the previous model.
    if (this._log) {
      this._log.changed.disconnect(this._onLogChanged, this);
    }
    this.clear();

    // Set the new model.
    this._model = model;
    if (!model) {
      this._log = null;
      return;
    }

    // Populate with the new model values.
    let modelDB = this._model.modelDB;
    modelDB.connected.then(() => {
      // Update the chatlog vector.
      modelDB.createList('internal:chat');
      this._log = modelDB.get('internal:chat') as IObservableList<ChatEntry.IModel>;
      this._log.changed.connect(this._onLogChanged, this);
      this._start = this._log.length;

      if (this.isVisible) {
        this._scrollGuard = true;
        this._addPage(PAGE_LENGTH);
        Private.scrollToBottom(this._content.node);
        this._scrollGuard = false;
      }
    });
  }

  /**
   * The log of chat entries for the current document model.
   */
  get log(): IObservableList<ChatEntry.IModel> {
    return this._log;
  }

  /**
   * The list of currently rendered widgets for the chatbox.
   */
  get widgets(): ReadonlyArray<Widget> {
    return this._content.widgets;
  }

  /**
   * Clear the chat entries.
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
    Signal.clearData(this);

    super.dispose();
  }

  /**
   * Post the current text in the prompt to the chat.
   */
  post(): void {
    if (!this._model) {
      return;
    }
    let prompt = this.prompt;

    if (prompt.model.value.text.trim() !== '') {
      this._post();
      this._newPrompt();
    } else {
      return;
    }
  }

  /**
   * Insert a line break in the prompt.
   */
  insertLinebreak(): void {
    let prompt = this.prompt;
    let model = prompt.model;
    let editor = prompt.editor;
    // Insert the line break at the cursor position, and move cursor forward.
    let pos = editor.getCursorPosition();
    let offset = editor.getOffsetAt(pos);
    let text = model.value.text;
    model.value.text = text.substr(0, offset) + '\n' + text.substr(offset);
    pos = editor.getPositionAt(offset + 1);
    editor.setCursorPosition(pos);
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
    case 'mousedown':
      this._evtMouseDown(event as MouseEvent);
      break;
    case 'mouseup':
      this._evtMouseup(event as MouseEvent);
      break;
    case 'mousemove':
      this._evtMousemove(event as MouseEvent);
      break;
    case 'scroll':
      this._scrollSignal.emit(void 0);
      break;
    default:
      break;
    }
  }

  /**
   * Handle `after_show` messages for the widget.
   */
  protected onAfterShow(msg: Message): void {
    // Put entries on the screen if we have
    // not yet done that.
    if (this._log && this._start === this._log.length) {
      this._scrollGuard = true;
      // Remove any existing widgets.
      this.clear();
      // Add a page.
      this._addPage(PAGE_LENGTH);
      // Scroll to bottom.
      Private.scrollToBottom(this._content.node);
      this._scrollGuard = false;
    }
  }

  /**
   * Handle `after_attach` messages for the widget.
   */
  protected onAfterAttach(msg: Message): void {
    let node = this.node;
    node.addEventListener('keydown', this, true);
    node.addEventListener('mousedown', this);
    this._content.node.addEventListener('scroll', this);

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
    node.removeEventListener('mousedown', this);
    this._content.node.removeEventListener('scroll', this);
  }

  /**
   * Handle `'activate-request'` messages.
   */
  protected onActivateRequest(msg: Message): void {
    this.prompt.editor.focus();
    this.update();
  }

  /**
   * Handle `update-request` messages.
   */
  protected onUpdateRequest(msg: Message): void {
    Private.scrollToBottom(this._content.node);
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
   * Add another page of entries.
   */
  private _addPage(count: number): void {
    // Add `count` widgets to the panel.
    let index = this._start - 1;
    let numAdded = 0;
    while (index >= 0 && numAdded < count) {
      let entryWidget = this._entryWidgetFromModel(this._log.get(index--));
      this._content.insertWidget(0, entryWidget);
      numAdded++;
    }
    this._start = index + 1;
  }


  /**
   * Handle a `'scroll'` event for the content panel.
   */
  private _handleScroll(): void {
    // If we are adding entries right now,
    // ignore any scroll event.
    if (this._scrollGuard) {
      return;
    }
    // Only page if we hit the top.
    if (this._content.node.scrollTop <= NEW_PAGE_POSITION && this._start > 0) {
      let startingHeight = this._content.node.scrollHeight;
      let startingPosition = this._content.node.scrollTop;
      this._addPage(PAGE_LENGTH);
      // Attempt to place the scroll position at
      // same entry where we started.
      this._content.node.scrollTop =
        this._content.node.scrollHeight - startingHeight + startingPosition;
    }
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
   * Find the chat entry containing the target html element.
   *
   * #### Notes
   * Returns -1 if the entry is not found.
   */
  private _findEntry(node: HTMLElement): number {
    // Trace up the DOM hierarchy to find the root cell node.
    // Then find the corresponding child and select it.
    while (node && node !== this.node) {
      if (node.classList.contains(CHAT_ENTRY_CLASS)) {
        let i = ArrayExt.findFirstIndex(this._content.widgets, widget => widget.node === node);
        if (i !== -1) {
          return i;
        }
        break;
      }
      node = node.parentElement;
    }
    return -1;
  }

  /**
   * Handle `mousedown` events for the widget.
   */
  private _evtMouseDown(event: MouseEvent): void {
    let target = event.target as HTMLElement;
    let i = this._findEntry(target);

    // Left mouse press for drag start.
    if (event.button === 0 && i !== -1) {
      this._dragData = { pressX: event.clientX, pressY: event.clientY, index: i};
      document.addEventListener('mouseup', this, true);
      document.addEventListener('mousemove', this, true);
      event.preventDefault();
    }
  }

  /**
   * Handle the `'mouseup'` event for the widget.
   */
  private _evtMouseup(event: MouseEvent): void {
    if (event.button !== 0 || !this._drag) {
      document.removeEventListener('mousemove', this, true);
      document.removeEventListener('mouseup', this, true);
      return;
    }
    event.preventDefault();
    event.stopPropagation();
  }

  /**
   * Handle the `'mousemove'` event for the widget.
   */
  private _evtMousemove(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    // Bail if we are the one dragging.
    if (this._drag) {
      return;
    }

    // Check for a drag initialization.
    let data = this._dragData;
    let dx = Math.abs(event.clientX - data.pressX);
    let dy = Math.abs(event.clientY - data.pressY);
    if (dx < DRAG_THRESHOLD && dy < DRAG_THRESHOLD) {
      return;
    }

    this._startDrag(data.index, event.clientX, event.clientY);
  }

  /**
   * Start a drag event.
   */
  private _startDrag(index: number, clientX: number, clientY: number): void {
    let toCopy = this._content.widgets[index] as ChatEntry;
    let data = [toCopy.cell.model.toJSON()];

    // Create the drag image.
    let dragImage = Private.createDragImage();

    // Set up the drag event.
    this._drag = new Drag({
      mimeData: new MimeData(),
      supportedActions: 'copy',
      proposedAction: 'copy',
      dragImage,
      source: this
    });
    this._drag.mimeData.setData(JUPYTER_CELL_MIME, data);

    // Remove mousemove and mouseup listeners and start the drag.
    document.removeEventListener('mousemove', this, true);
    document.removeEventListener('mouseup', this, true);
    this._drag.start(clientX, clientY).then(action => {
      if (this.isDisposed) {
        return;
      }
      this._drag = null;
    });
  }

  /**
   * Update the chat view after a change in the log vector.
   */
  private _onLogChanged(log: IObservableList<ChatEntry.IModel>, args: IObservableList.IChangedArgs<ChatEntry.IModel>) {
    let index = 0;
    let layout = this._content.layout as PanelLayout;
    switch (args.type) {
      case 'add':
        index = args.newIndex;
        if (index < this._start) {
          // If it is inserted before the view,
          // just update the `_start` index.
          this._start += args.newValues.length;
        } else {
          // Otherwise insert the widgets into the view.
          each(args.newValues, entry => {
            let entryWidget = this._entryWidgetFromModel(entry);
            layout.insertWidget(index++, entryWidget);
          });
        }
        break;
      case 'remove':
        index = args.oldIndex;
        if (index < this._start) {
          // If the removal is before the view,
          // just update the `_start` index.
          this._start -= args.oldValues.length;
        } else {
          // Otherwise remove the widgets from the view.
          each(args.oldValues, entry => {
            let widget = layout.widgets[args.oldIndex];
            widget.parent = null;
            widget.dispose();
          });
        }
        break;
      case 'move':
        if (args.newIndex >= this._start && args.oldIndex >= this._start) {
          // If both are in the view, it is a straightforward move.
          let fromIndex = args.oldIndex - this._start;
          let toIndex = args.newIndex - this._start;
          layout.insertWidget(toIndex, layout.widgets[fromIndex]);
        } else if (args.newIndex >= this._start) {
          // If it is moving into the view, create the widget and
          // update the `_start` index.
          let entry = args.oldValues[0];
          let entryWidget = this._entryWidgetFromModel(entry);
          layout.insertWidget(args.newIndex - this._start, entryWidget);
          this._start--;
        } else if (args.oldIndex >= this._start) {
          // If it is moving out of the view, remove the widget
          // and update the `_start index.`
          let widget = layout.widgets[args.oldIndex - this._start];
          widget.parent = null;
          this._start++;
        }
        // If both are before `_start`, this is a no-op.
        break;
      case 'set':
        index = args.newIndex;
        if (index >= this._start) {
          // Only need to update the widgets if they are in the view.
          each(args.newValues, entry => {
            let entryWidget = this._entryWidgetFromModel(entry);
            layout.insertWidget(index, entryWidget);
            let toRemove = layout.widgets[index+1];
            toRemove.parent = null;
            index++;
          });
        }
        break;
    }
    this.update();
  }

  /**
   * Post the text current prompt.
   */
  private _post(): void {
    // Dispose of the current input widget.
    let prompt = this.prompt;
    (this._input.layout as PanelLayout).widgets[0].parent = null;

    // Add the chat entry to the log.
    let collaborators = this._model.modelDB.collaborators;
    if (!collaborators) {
      throw Error('Cannot post chat entry to non-collaborative document.');
    }
    this._log.push({
      text: prompt.model.value.text,
      author: collaborators.localCollaborator
    });
    prompt.dispose();
  }


  /**
   * Given a chat entry model, create a new entry widget.
   */
  private _entryWidgetFromModel(entry: ChatEntry.IModel): ChatEntry {
    let options = this._createMarkdownCellOptions(entry.text);
    let cellWidget = this.contentFactory.createCell(options);
    this._disposables.add(cellWidget);
    cellWidget.readOnly = true;
    cellWidget.rendered = true;
    let entryWidget = new ChatEntry({
      model: entry,
      cell: cellWidget,
      isMe: entry.author.userId ===
            this._model.modelDB.collaborators.localCollaborator.userId
    });
    return entryWidget;
  }

  /**
   * Create the options used to initialize markdown cell widget.
   */
  private _createMarkdownCellOptions(text: string = ''): MarkdownCell.IOptions {
    let contentFactory = this.contentFactory.markdownCellContentFactory;
    let model = new MarkdownCellModel({ });
    this._disposables.add(model);
    let rendermime = this._rendermime;
    model.value.text = text || '';
    return { model, rendermime, contentFactory };
  }

  private _rendermime: RenderMime = null;
  private _content: Panel = null;
  private _log: IObservableList<ChatEntry.IModel> = null;
  private _start: number = null;
  private _scrollGuard: boolean = true;
  private _monitor: ActivityMonitor<any, any> = null;
  private _scrollSignal = new Signal<this, void>(this);
  private _input: Panel = null;
  private _mimetype = 'text/x-ipythongfm';
  private _model: DocumentRegistry.IModel = null;
  private _disposables = new DisposableSet();
  private _drag: Drag = null;
  private _dragData: { pressX: number, pressY: number, index: number } = null;
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
    rendermime: RenderMime;
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
    readonly markdownCellContentFactory: Cell.IContentFactory;

    /**
     * Create a new cell widget.
     */
    createCell(options: MarkdownCell.IOptions): MarkdownCell;

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

      this.markdownCellContentFactory = new MarkdownCell.ContentFactory({
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
    readonly markdownCellContentFactory: Cell.IContentFactory;

    /**
     * Create a new prompt widget.
     */
    createCell(options: MarkdownCell.IOptions): MarkdownCell {
      return new MarkdownCell(options);
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

/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * Create a chat entry drag image.
   */
  export
  function createDragImage(): HTMLElement {
    let node = document.createElement('div');
    let span = document.createElement('span');
    span.textContent = '1';
    span.className = FILLED_CIRCLE_CLASS;
    node.appendChild(span);
    node.className = DRAG_IMAGE_CLASS;
    return node;
  }
}
