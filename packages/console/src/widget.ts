// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { createStandaloneCell, ISharedRawCell } from '@jupyter/ydoc';
import { DOMUtils, ISessionContext } from '@jupyterlab/apputils';
import {
  AttachmentsCellModel,
  Cell,
  CellDragUtils,
  CodeCell,
  CodeCellModel,
  ICodeCellModel,
  IRawCellModel,
  isCodeCellModel,
  RawCell,
  RawCellModel
} from '@jupyterlab/cells';
import { IEditorMimeTypeService } from '@jupyterlab/codeeditor';
import * as nbformat from '@jupyterlab/nbformat';
import { IObservableList, ObservableList } from '@jupyterlab/observables';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { KernelMessage } from '@jupyterlab/services';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { JSONObject, MimeData } from '@lumino/coreutils';
import { Drag } from '@lumino/dragdrop';
import { Message } from '@lumino/messaging';
import { ISignal, Signal } from '@lumino/signaling';
import { Panel, PanelLayout, SplitPanel, Widget } from '@lumino/widgets';
import { runCell } from './cellexecutor';
import { ConsoleHistory, IConsoleHistory } from './history';
import type { IConsoleCellExecutor } from './tokens';

/**
 * The data attribute added to a widget that has an active kernel.
 */
const KERNEL_USER = 'jpKernelUser';

/**
 * The data attribute added to a widget can run code.
 */
const CODE_RUNNER = 'jpCodeRunner';

/**
 * The class name added to console widgets.
 */
const CONSOLE_CLASS = 'jp-CodeConsole';

/**
 * The class added to console cells
 */
const CONSOLE_CELL_CLASS = 'jp-Console-cell';

/**
 * The class name added to the console banner.
 */
const BANNER_CLASS = 'jp-CodeConsole-banner';

/**
 * The class name of the active prompt cell.
 */
const PROMPT_CLASS = 'jp-CodeConsole-promptCell';

/**
 * The class name of the panel that holds cell content.
 */
const CONTENT_CLASS = 'jp-CodeConsole-content';

/**
 * The class name of the panel that holds prompts.
 */
const INPUT_CLASS = 'jp-CodeConsole-input';

/**
 * The class name added to the console when an element within it is focused
 * and takes keyboard input, such as <input> and <div contenteditable>
 *
 * This class is also effective when the focused element is in shadow DOM.
 */
const READ_WRITE_CLASS = 'jp-mod-readWrite';

/**
 * The timeout in ms for execution requests to the kernel.
 */
const EXECUTION_TIMEOUT = 250;

/**
 * The mimetype used for Jupyter cell data.
 */
const JUPYTER_CELL_MIME = 'application/vnd.jupyter.cells';

/**
 * The data attribute added to a widget that can undo.
 */
const UNDOER = 'jpUndoer';

/**
 * A widget containing a Jupyter console.
 *
 * #### Notes
 * The CodeConsole class is intended to be used within a ConsolePanel
 * instance. Under most circumstances, it is not instantiated by user code.
 */
export class CodeConsole extends Widget {
  /**
   * Construct a console widget.
   */
  constructor(options: CodeConsole.IOptions) {
    super();
    this._translator = options.translator ?? nullTranslator;
    this._executor = options.executor ?? Object.freeze({ runCell });
    this.addClass(CONSOLE_CLASS);
    this.node.dataset[KERNEL_USER] = 'true';
    this.node.dataset[CODE_RUNNER] = 'true';
    this.node.dataset[UNDOER] = 'true';
    this.node.tabIndex = -1; // Allow the widget to take focus.

    // Create the panels that hold the content and input.
    const layout = (this.layout = new PanelLayout());
    this._cells = new ObservableList<Cell>();
    this._content = new Panel();
    this._input = new Panel();
    this._splitPanel = new SplitPanel({ spacing: 0 });
    this._splitPanel.addClass('jp-CodeConsole-split');

    this.contentFactory = options.contentFactory;
    this.modelFactory = options.modelFactory ?? CodeConsole.defaultModelFactory;
    this.rendermime = options.rendermime;
    this.sessionContext = options.sessionContext;
    this._mimeTypeService = options.mimeTypeService;

    // Add top-level CSS classes.
    this._content.addClass(CONTENT_CLASS);
    this._input.addClass(INPUT_CLASS);

    layout.addWidget(this._splitPanel);

    // initialize the console with defaults
    this.setConfig({
      clearCellsOnExecute: false,
      clearCodeContentOnExecute: true,
      hideCodeInput: false,
      promptCellPosition: 'bottom',
      showBanner: true
    });

    this._history = new ConsoleHistory({
      sessionContext: this.sessionContext
    });

    void this._onKernelChanged();

    this.sessionContext.kernelChanged.connect(this._onKernelChanged, this);
    this.sessionContext.statusChanged.connect(
      this._onKernelStatusChanged,
      this
    );
  }

  /**
   * A signal emitted when the console finished executing its prompt cell.
   */
  get executed(): ISignal<this, Date> {
    return this._executed;
  }

  /**
   * A signal emitted when a new prompt cell is created.
   */
  get promptCellCreated(): ISignal<this, CodeCell> {
    return this._promptCellCreated;
  }

  /**
   * The content factory used by the console.
   */
  readonly contentFactory: CodeConsole.IContentFactory;

  /**
   * The model factory for the console widget.
   */
  readonly modelFactory: CodeConsole.IModelFactory;

  /**
   * The rendermime instance used by the console.
   */
  readonly rendermime: IRenderMimeRegistry;

  /**
   * The client session used by the console.
   */
  readonly sessionContext: ISessionContext;

  /**
   * The configuration options for the text editor widget.
   */
  editorConfig: Record<string, any> = CodeConsole.defaultEditorConfig;

  /**
   * The list of content cells in the console.
   *
   * #### Notes
   * This list does not include the current banner or the prompt for a console.
   * It may include previous banners as raw cells.
   */
  get cells(): IObservableList<Cell> {
    return this._cells;
  }

  /*
   * The console input prompt cell.
   */
  get promptCell(): CodeCell | null {
    const inputLayout = this._input.layout as PanelLayout;
    return (inputLayout.widgets[0] as CodeCell) || null;
  }

  /**
   * Add a new cell to the content panel.
   *
   * @param cell - The code cell widget being added to the content panel.
   *
   * @param msgId - The optional execution message id for the cell.
   *
   * #### Notes
   * This method is meant for use by outside classes that want to add cells to a
   * console. It is distinct from the `inject` method in that it requires
   * rendered code cell widgets and does not execute them (though it can store
   * the execution message id).
   */
  addCell(cell: CodeCell, msgId?: string): void {
    if (this._config.clearCellsOnExecute) {
      this.clear();
    }
    cell.addClass(CONSOLE_CELL_CLASS);
    this._content.addWidget(cell);
    this._cells.push(cell);
    if (msgId) {
      this._msgIds.set(msgId, cell);
      this._msgIdCells.set(cell, msgId);
    }
    cell.disposed.connect(this._onCellDisposed, this);
    this.update();
  }

  /**
   * Add a banner cell.
   */
  addBanner(): void {
    if (this._banner) {
      // An old banner just becomes a normal cell now.
      const cell = this._banner;
      this._cells.push(this._banner);
      cell.disposed.connect(this._onCellDisposed, this);
    }
    // Create the banner.
    const model = this.modelFactory.createRawCell({
      sharedModel: createStandaloneCell({
        cell_type: 'raw',
        source: '...'
      }) as ISharedRawCell
    });
    const banner = (this._banner = new RawCell({
      model,
      contentFactory: this.contentFactory,
      placeholder: false,
      editorConfig: {
        autoClosingBrackets: false,
        codeFolding: false,
        highlightActiveLine: false,
        highlightTrailingWhitespace: false,
        highlightWhitespace: false,
        indentUnit: '4',
        lineNumbers: false,
        lineWrap: true,
        matchBrackets: false,
        readOnly: true,
        rulers: [],
        scrollPastEnd: false,
        smartIndent: false,
        tabSize: 4,
        theme: 'jupyter'
      }
    })).initializeState();
    banner.addClass(BANNER_CLASS);
    banner.readOnly = true;
    this._content.addWidget(banner);
  }

  /**
   * Clear the code cells.
   */
  clear(): void {
    // Dispose all the content cells
    const cells = this._cells;
    while (cells.length > 0) {
      cells.get(0).dispose();
    }
  }

  /**
   * Create a new cell with the built-in factory.
   */
  createCodeCell(): CodeCell {
    const factory = this.contentFactory;
    const options = this._createCodeCellOptions();
    const cell = factory.createCodeCell(options);
    cell.readOnly = true;
    cell.model.mimeType = this._mimetype;
    return cell;
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    // Do nothing if already disposed.
    if (this.isDisposed) {
      return;
    }
    this._msgIdCells = null!;
    this._msgIds = null!;
    this._history.dispose();
    super.dispose();
  }

  /**
   * Execute the current prompt.
   *
   * @param force - Whether to force execution without checking code
   * completeness.
   *
   * @param timeout - The length of time, in milliseconds, that the execution
   * should wait for the API to determine whether code being submitted is
   * incomplete before attempting submission anyway. The default value is `250`.
   */
  async execute(force = false, timeout = EXECUTION_TIMEOUT): Promise<void> {
    if (this.sessionContext.session?.kernel?.status === 'dead') {
      return;
    }

    const promptCell = this.promptCell;
    if (!promptCell) {
      throw new Error('Cannot execute without a prompt cell');
    }
    promptCell.model.trusted = true;

    if (force) {
      // Create a new prompt cell before kernel execution to allow typeahead.
      this.newPromptCell();
      await this._execute(promptCell);
      return;
    }

    // Check whether we should execute.
    const shouldExecute = await this._shouldExecute(timeout);
    if (this.isDisposed) {
      return;
    }
    if (shouldExecute) {
      // Create a new prompt cell before kernel execution to allow typeahead.
      this.newPromptCell();
      this.promptCell!.editor!.focus();
      await this._execute(promptCell);
    } else {
      // add a newline if we shouldn't execute
      promptCell.editor!.newIndentedLine();
    }
  }

  /**
   * Get a cell given a message id.
   *
   * @param msgId - The message id.
   */
  getCell(msgId: string): CodeCell | undefined {
    return this._msgIds.get(msgId);
  }

  /**
   * Inject arbitrary code for the console to execute immediately.
   *
   * @param code - The code contents of the cell being injected.
   *
   * @returns A promise that indicates when the injected cell's execution ends.
   */
  inject(code: string, metadata: JSONObject = {}): Promise<void> {
    const cell = this.createCodeCell();
    cell.model.sharedModel.setSource(code);
    for (const key of Object.keys(metadata)) {
      cell.model.setMetadata(key, metadata[key]);
    }
    this.addCell(cell);
    return this._execute(cell);
  }

  /**
   * Insert a line break in the prompt cell.
   */
  insertLinebreak(): void {
    const promptCell = this.promptCell;
    if (!promptCell) {
      return;
    }
    promptCell.editor!.newIndentedLine();
  }

  /**
   * Replaces the selected text in the prompt cell.
   *
   * @param text - The text to replace the selection.
   */
  replaceSelection(text: string): void {
    const promptCell = this.promptCell;
    if (!promptCell) {
      return;
    }
    promptCell.editor!.replaceSelection?.(text);
  }

  /**
   * Set configuration options for the console.
   */
  setConfig(config: CodeConsole.IConfig): void {
    const {
      clearCellsOnExecute,
      clearCodeContentOnExecute,
      hideCodeInput,
      promptCellPosition,
      showBanner
    } = config;
    this._config = {
      clearCellsOnExecute:
        clearCellsOnExecute ?? this._config.clearCellsOnExecute,
      clearCodeContentOnExecute:
        clearCodeContentOnExecute ?? this._config.clearCodeContentOnExecute,
      hideCodeInput: hideCodeInput ?? this._config.hideCodeInput,
      promptCellPosition: promptCellPosition ?? this._config.promptCellPosition,
      showBanner: showBanner ?? this._config.showBanner
    };
    this._updateLayout();
  }

  /**
   * Serialize the output.
   *
   * #### Notes
   * This only serializes the code cells and the prompt cell if it exists, and
   * skips any old banner cells.
   */
  serialize(): nbformat.ICodeCell[] {
    const cells: nbformat.ICodeCell[] = [];
    for (const cell of this._cells) {
      const model = cell.model;
      if (isCodeCellModel(model)) {
        cells.push(model.toJSON());
      }
    }

    if (this.promptCell) {
      cells.push(this.promptCell.model.toJSON());
    }
    return cells;
  }

  /**
   * Handle `mousedown` events for the widget.
   */
  private _evtMouseDown(event: MouseEvent): void {
    const { button, shiftKey } = event;

    // We only handle main or secondary button actions.
    if (
      !(button === 0 || button === 2) ||
      // Shift right-click gives the browser default behavior.
      (shiftKey && button === 2)
    ) {
      return;
    }

    let target = event.target as HTMLElement;
    const cellFilter = (node: HTMLElement) =>
      node.classList.contains(CONSOLE_CELL_CLASS);
    let cellIndex = CellDragUtils.findCell(target, this._cells, cellFilter);

    if (cellIndex === -1) {
      // `event.target` sometimes gives an orphaned node in
      // Firefox 57, which can have `null` anywhere in its parent line. If we fail
      // to find a cell using `event.target`, try again using a target
      // reconstructed from the position of the click event.
      target = document.elementFromPoint(
        event.clientX,
        event.clientY
      ) as HTMLElement;
      cellIndex = CellDragUtils.findCell(target, this._cells, cellFilter);
    }

    if (cellIndex === -1) {
      return;
    }

    const cell = this._cells.get(cellIndex);

    const targetArea: CellDragUtils.ICellTargetArea =
      CellDragUtils.detectTargetArea(cell, event.target as HTMLElement);

    if (targetArea === 'prompt') {
      this._dragData = {
        pressX: event.clientX,
        pressY: event.clientY,
        index: cellIndex
      };

      this._focusedCell = cell;

      document.addEventListener('mouseup', this, true);
      document.addEventListener('mousemove', this, true);
      event.preventDefault();
    }
  }

  /**
   * Handle `mousemove` event of widget
   */
  private _evtMouseMove(event: MouseEvent) {
    const data = this._dragData;
    if (
      data &&
      CellDragUtils.shouldStartDrag(
        data.pressX,
        data.pressY,
        event.clientX,
        event.clientY
      )
    ) {
      void this._startDrag(data.index, event.clientX, event.clientY);
    }
  }

  /**
   * Start a drag event
   */
  private _startDrag(
    index: number,
    clientX: number,
    clientY: number
  ): Promise<void> {
    const cellModel = this._focusedCell!.model as ICodeCellModel;
    const selected: nbformat.ICell[] = [cellModel.toJSON()];

    const dragImage = CellDragUtils.createCellDragImage(
      this._focusedCell!,
      selected
    );

    this._drag = new Drag({
      mimeData: new MimeData(),
      dragImage,
      proposedAction: 'copy',
      supportedActions: 'copy',
      source: this
    });

    this._drag.mimeData.setData(JUPYTER_CELL_MIME, selected);
    const textContent = cellModel.sharedModel.getSource();
    this._drag.mimeData.setData('text/plain', textContent);

    this._focusedCell = null;

    document.removeEventListener('mousemove', this, true);
    document.removeEventListener('mouseup', this, true);
    return this._drag.start(clientX, clientY).then(() => {
      if (this.isDisposed) {
        return;
      }
      this._drag = null;
      this._dragData = null;
    });
  }

  /**
   * Handle the DOM events for the widget.
   *
   * @param event -The DOM event sent to the widget.
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
      case 'mousemove':
        this._evtMouseMove(event as MouseEvent);
        break;
      case 'mouseup':
        this._evtMouseUp(event as MouseEvent);
        break;
      case 'resize':
        this._splitPanel.fit();
        break;
      case 'focusin':
        this._evtFocusIn(event as MouseEvent);
        break;
      case 'focusout':
        this._evtFocusOut(event as MouseEvent);
        break;
      default:
        break;
    }
  }

  /**
   * Handle `after_attach` messages for the widget.
   */
  protected onAfterAttach(msg: Message): void {
    const node = this.node;
    node.addEventListener('keydown', this, true);
    node.addEventListener('click', this);
    node.addEventListener('mousedown', this);
    node.addEventListener('focusin', this);
    node.addEventListener('focusout', this);
    // Create a prompt if necessary.
    if (!this.promptCell) {
      this.newPromptCell();
    } else {
      this.promptCell.editor!.focus();
      this.update();
    }
  }

  /**
   * Handle `before-detach` messages for the widget.
   */
  protected onBeforeDetach(msg: Message): void {
    const node = this.node;
    node.removeEventListener('keydown', this, true);
    node.removeEventListener('click', this);
    node.removeEventListener('focusin', this);
    node.removeEventListener('focusout', this);
  }

  /**
   * Handle `'activate-request'` messages.
   */
  protected onActivateRequest(msg: Message): void {
    const editor = this.promptCell && this.promptCell.editor;
    if (editor) {
      editor.focus();
    }
    this.update();
  }

  /**
   * Make a new prompt cell.
   */
  protected newPromptCell(): void {
    let promptCell = this.promptCell;
    const input = this._input;

    const previousContent = promptCell?.model.sharedModel.getSource() ?? '';
    const previousCursorPosition = promptCell?.editor?.getCursorPosition();

    // Make the last prompt read-only, clear its signals, and move to content.
    if (promptCell) {
      promptCell.readOnly = true;
      promptCell.removeClass(PROMPT_CLASS);

      // Schedule execution of signal clearance to happen later so that
      // the `readOnly` configuration gets updated before editor signals
      // get disconnected (see `Cell.onUpdateRequest`).
      const oldCell = promptCell;
      requestIdleCallback(() => {
        // Clear the signals to avoid memory leaks
        Signal.clearData(oldCell.editor);
      });

      // Ensure to clear the cursor
      promptCell.editor?.blur();
      const child = input.widgets[0];
      child.parent = null;
      if (this._config.hideCodeInput) {
        promptCell.inputArea?.setHidden(true);
      }
      this.addCell(promptCell);
    }

    // Create the new prompt cell.
    const factory = this.contentFactory;
    const options = this._createCodeCellOptions();
    promptCell = factory.createCodeCell(options);
    promptCell.model.mimeType = this._mimetype;
    promptCell.addClass(PROMPT_CLASS);

    // Add the prompt cell to the DOM, making `this.promptCell` valid again.
    this._input.addWidget(promptCell);

    this._history.editor = promptCell.editor;

    if (!this._config.clearCodeContentOnExecute) {
      promptCell.model.sharedModel.setSource(previousContent);
      if (previousCursorPosition) {
        promptCell.editor?.setCursorPosition(previousCursorPosition);
      }
    }
    this._promptCellCreated.emit(promptCell);
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
    const editor = this.promptCell && this.promptCell.editor;
    if (!editor) {
      return;
    }
    if (event.keyCode === 13 && !editor.hasFocus()) {
      event.preventDefault();
      editor.focus();
    } else if (event.keyCode === 27 && editor.hasFocus()) {
      // Set to command mode
      event.preventDefault();
      event.stopPropagation();
      this.node.focus();
    }
  }

  /**
   * Handle the `'mouseup'` event for the widget.
   */
  private _evtMouseUp(event: MouseEvent): void {
    if (
      this.promptCell &&
      this.promptCell.node.contains(event.target as HTMLElement)
    ) {
      this.promptCell.editor!.focus();
    }
  }

  /**
   * Handle `focus` events for the widget.
   */
  private _evtFocusIn(event: FocusEvent): void {
    // Update read-write class state.
    this._updateReadWrite();
  }

  /**
   * Handle `focusout` events for the widget.
   */
  private _evtFocusOut(event: FocusEvent): void {
    // Update read-write class state.
    this._updateReadWrite();
  }

  /**
   * Execute the code in the current prompt cell.
   */
  private async _execute(cell: CodeCell): Promise<void> {
    const source = cell.model.sharedModel.getSource();
    this._history.push(source);
    // If the source of the console is just "clear", clear the console as we
    // do in IPython or QtConsole.
    if (source === 'clear' || source === '%clear') {
      this.clear();
      return Promise.resolve(void 0);
    }
    cell.model.contentChanged.connect(this.update, this);

    const options = {
      cell,
      sessionContext: this.sessionContext,
      onCellExecuted: (args: {
        cell: CodeCell;
        executionDate: Date;
        success: boolean;
        error?: Error | null;
      }) => {
        this._executed.emit(args.executionDate);

        if (args.error) {
          for (const cell of this._cells) {
            if ((cell.model as ICodeCellModel).executionCount === null) {
              (cell.model as ICodeCellModel).executionState = 'idle';
            }
          }
        }
      }
    } satisfies IConsoleCellExecutor.IRunCellOptions;

    try {
      await this._executor.runCell(options);
    } finally {
      if (!this.isDisposed) {
        cell.model.contentChanged.disconnect(this.update, this);
        this.update();
      }
    }
  }

  /**
   * Update the console based on the kernel info.
   */
  private _handleInfo(info: KernelMessage.IInfoReplyMsg['content']): void {
    if (info.status !== 'ok') {
      if (this._banner) {
        this._banner.model.sharedModel.setSource(
          'Error in getting kernel banner'
        );
      }
      return;
    }
    if (this._banner) {
      this._banner.model.sharedModel.setSource(info.banner);
    }
    const lang = info.language_info as nbformat.ILanguageInfoMetadata;
    this._mimetype = this._mimeTypeService.getMimeTypeByLanguage(lang);
    if (this.promptCell) {
      this.promptCell.model.mimeType = this._mimetype;
    }
  }

  /**
   * Create the options used to initialize a code cell widget.
   */
  private _createCodeCellOptions(): CodeCell.IOptions {
    const contentFactory = this.contentFactory;
    const modelFactory = this.modelFactory;
    const model = modelFactory.createCodeCell({});
    const rendermime = this.rendermime;
    const editorConfig = this.editorConfig;

    return {
      model,
      rendermime,
      contentFactory,
      editorConfig,
      placeholder: false,
      translator: this._translator
    };
  }

  /**
   * Handle cell disposed signals.
   */
  private _onCellDisposed(sender: Cell, args: void): void {
    if (!this.isDisposed) {
      this._cells.removeValue(sender);
      const msgId = this._msgIdCells.get(sender as CodeCell);
      if (msgId) {
        this._msgIdCells.delete(sender as CodeCell);
        this._msgIds.delete(msgId);
      }
    }
  }

  /**
   * Test whether we should execute the prompt cell.
   */
  private _shouldExecute(timeout: number): Promise<boolean> {
    const promptCell = this.promptCell;
    if (!promptCell) {
      return Promise.resolve(false);
    }
    const model = promptCell.model;
    const code = model.sharedModel.getSource();
    return new Promise<boolean>((resolve, reject) => {
      const timer = setTimeout(() => {
        resolve(true);
      }, timeout);
      const kernel = this.sessionContext.session?.kernel;
      if (!kernel) {
        resolve(false);
        return;
      }
      kernel
        .requestIsComplete({ code })
        .then(isComplete => {
          clearTimeout(timer);
          if (this.isDisposed) {
            resolve(false);
          }
          if (isComplete.content.status !== 'incomplete') {
            resolve(true);
            return;
          }
          resolve(false);
        })
        .catch(() => {
          resolve(true);
        });
    });
  }

  /**
   * Handle a change to the kernel.
   */
  private async _onKernelChanged(): Promise<void> {
    this.clear();
    if (this._banner) {
      this._banner.dispose();
      this._banner = null;
    }
    if (this._config.showBanner) {
      this.addBanner();
    }
    if (this.sessionContext.session?.kernel) {
      this._handleInfo(await this.sessionContext.session.kernel.info);
    }
  }

  /**
   * Handle a change to the kernel status.
   */
  private async _onKernelStatusChanged(): Promise<void> {
    const kernel = this.sessionContext.session?.kernel;
    if (kernel?.status === 'restarting') {
      if (this._config.showBanner) {
        this.addBanner();
      }
      this._handleInfo(await kernel?.info);
    }
  }

  /**
   * Update the console node with class indicating read-write state.
   */
  private _updateReadWrite(): void {
    // TODO: de-duplicate with code in notebook/src/widget.ts
    const inReadWrite = DOMUtils.hasActiveEditableElement(this.node);
    this.node.classList.toggle(READ_WRITE_CLASS, inReadWrite);
  }

  /**
   * Update the layout of the code console.
   */
  private _updateLayout(): void {
    const { promptCellPosition = 'bottom' } = this._config;

    this._splitPanel.orientation = ['left', 'right'].includes(
      promptCellPosition
    )
      ? 'horizontal'
      : 'vertical';

    // Insert the content and input panes into the widget.
    SplitPanel.setStretch(this._content, 1);
    SplitPanel.setStretch(this._input, 1);

    if (promptCellPosition === 'bottom' || promptCellPosition === 'right') {
      this._splitPanel.insertWidget(0, this._content);
      this._splitPanel.insertWidget(1, this._input);
    } else {
      this._splitPanel.insertWidget(0, this._input);
      this._splitPanel.insertWidget(1, this._content);
    }

    // Default relative sizes
    let sizes = [1, 1];
    if (promptCellPosition === 'top') {
      sizes = [1, 100];
    } else if (promptCellPosition === 'bottom') {
      sizes = [100, 1];
    }
    this._splitPanel.setRelativeSizes(sizes);
  }

  private _banner: RawCell | null = null;
  private _cells: IObservableList<Cell>;
  private _content: Panel;
  private _executor: IConsoleCellExecutor;
  private _executed = new Signal<this, Date>(this);
  private _history: IConsoleHistory;
  private _config: CodeConsole.IConfig = {};
  private _input: Panel;
  private _mimetype = 'text/x-ipython';
  private _mimeTypeService: IEditorMimeTypeService;
  private _msgIds = new Map<string, CodeCell>();
  private _msgIdCells = new Map<CodeCell, string>();
  private _promptCellCreated = new Signal<this, CodeCell>(this);
  private _dragData: {
    pressX: number;
    pressY: number;
    index: number;
  } | null = null;
  private _drag: Drag | null = null;
  private _focusedCell: Cell | null = null;
  private _translator: ITranslator;
  private _splitPanel: SplitPanel;
}

/**
 * A namespace for CodeConsole statics.
 */
export namespace CodeConsole {
  /**
   * Where the prompt cell is located.
   */
  export type PromptCellPosition = 'top' | 'bottom' | 'left' | 'right';

  /**
   * The configuration options for a console widget.
   */
  export interface IConfig {
    /**
     * Whether to clear the previous cells on execute.
     */
    clearCellsOnExecute?: boolean;

    /**
     * Whether to clear the code content of the prompt cell on execute.
     */
    clearCodeContentOnExecute?: boolean;

    /**
     * Whether to hide the code input after a cell is executed.
     */
    hideCodeInput?: boolean;

    /**
     * Where the prompt cell should be located.
     */
    promptCellPosition?: PromptCellPosition;

    /**
     * Whether to show the kernel banner.
     */
    showBanner?: boolean;
  }

  /**
   * The initialization options for a console widget.
   */
  export interface IOptions {
    /**
     * The content factory for the console widget.
     */
    contentFactory: IContentFactory;

    /**
     * Console cell executor
     */
    executor?: IConsoleCellExecutor;

    /**
     * The model factory for the console widget.
     */
    modelFactory?: IModelFactory;

    /**
     * The mime renderer for the console widget.
     */
    rendermime: IRenderMimeRegistry;

    /**
     * The client session for the console widget.
     */
    sessionContext: ISessionContext;

    /**
     * The service used to look up mime types.
     */
    mimeTypeService: IEditorMimeTypeService;

    /**
     * The application language translator.
     */
    translator?: ITranslator;
  }

  /**
   * Default console editor configuration
   */
  export const defaultEditorConfig: Record<string, any> = {
    codeFolding: false,
    lineNumbers: false
  };

  /**
   * A content factory for console children.
   */
  export interface IContentFactory extends Cell.IContentFactory {
    /**
     * Create a new code cell widget.
     */
    createCodeCell(options: CodeCell.IOptions): CodeCell;

    /**
     * Create a new raw cell widget.
     */
    createRawCell(options: RawCell.IOptions): RawCell;
  }

  /**
   * Default implementation of `IContentFactory`.
   */
  export class ContentFactory
    extends Cell.ContentFactory
    implements IContentFactory
  {
    /**
     * Create a new code cell widget.
     *
     * #### Notes
     * If no cell content factory is passed in with the options, the one on the
     * notebook content factory is used.
     */
    createCodeCell(options: CodeCell.IOptions): CodeCell {
      return new CodeCell(options).initializeState();
    }

    /**
     * Create a new raw cell widget.
     *
     * #### Notes
     * If no cell content factory is passed in with the options, the one on the
     * notebook content factory is used.
     */
    createRawCell(options: RawCell.IOptions): RawCell {
      return new RawCell(options).initializeState();
    }
  }

  /**
   * A namespace for the code console content factory.
   */
  export namespace ContentFactory {
    /**
     * An initialize options for `ContentFactory`.
     */
    export interface IOptions extends Cell.IContentFactory {}
  }

  /**
   * A model factory for a console widget.
   */
  export interface IModelFactory {
    /**
     * The factory for code cell content.
     */
    readonly codeCellContentFactory: CodeCellModel.IContentFactory;

    /**
     * Create a new code cell.
     *
     * @param options - The options used to create the cell.
     *
     * @returns A new code cell. If a source cell is provided, the
     *   new cell will be initialized with the data from the source.
     */
    createCodeCell(options: CodeCellModel.IOptions): ICodeCellModel;

    /**
     * Create a new raw cell.
     *
     * @param options - The options used to create the cell.
     *
     * @returns A new raw cell. If a source cell is provided, the
     *   new cell will be initialized with the data from the source.
     */
    createRawCell(
      options: AttachmentsCellModel.IOptions<ISharedRawCell>
    ): IRawCellModel;
  }

  /**
   * The default implementation of an `IModelFactory`.
   */
  export class ModelFactory {
    /**
     * Create a new cell model factory.
     */
    constructor(options: IModelFactoryOptions = {}) {
      this.codeCellContentFactory =
        options.codeCellContentFactory || CodeCellModel.defaultContentFactory;
    }

    /**
     * The factory for output area models.
     */
    readonly codeCellContentFactory: CodeCellModel.IContentFactory;

    /**
     * Create a new code cell.
     * @param options - The data to use for the original source data.
     * @returns A new code cell. If a source cell is provided, the
    new cell will be initialized with the data from the source.
    If the contentFactory is not provided, the instance
    `codeCellContentFactory` will be used.
     */
    createCodeCell(options: CodeCellModel.IOptions = {}): ICodeCellModel {
      if (!options.contentFactory) {
        options.contentFactory = this.codeCellContentFactory;
      }
      return new CodeCellModel(options);
    }

    /**
     * Create a new raw cell.
     * @param options - The data to use for the original source data.
     * @returns A new raw cell. If a source cell is provided, the
    new cell will be initialized with the data from the source.
     */
    createRawCell(
      options: AttachmentsCellModel.IOptions<ISharedRawCell>
    ): IRawCellModel {
      return new RawCellModel(options);
    }
  }

  /**
   * The options used to initialize a `ModelFactory`.
   */
  export interface IModelFactoryOptions {
    /**
     * The factory for output area models.
     */
    codeCellContentFactory?: CodeCellModel.IContentFactory;
  }

  /**
   * The default `ModelFactory` instance.
   */
  export const defaultModelFactory = new ModelFactory({});
}

/**
 * A namespace for console widget private data.
 */
namespace Private {
  /**
   * Jump to the bottom of a node.
   *
   * @param node - The scrollable element.
   */
  export function scrollToBottom(node: HTMLElement): void {
    node.scrollTop = node.scrollHeight - node.clientHeight;
  }
}
