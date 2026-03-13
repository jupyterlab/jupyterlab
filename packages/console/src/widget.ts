import type { ISharedRawCell } from '@jupyter/ydoc';
import { createStandaloneCell } from '@jupyter/ydoc';
import type { ISessionContext } from '@jupyterlab/apputils';
import { DOMUtils } from '@jupyterlab/apputils';
import type {
  AttachmentsCellModel,
  ICodeCellModel,
  IRawCellModel
} from '@jupyterlab/cells';
import {
  Cell,
  CellDragUtils,
  CodeCell,
  CodeCellModel,
  isCodeCellModel,
  RawCell,
  RawCellModel
} from '@jupyterlab/cells';
import type { IEditorMimeTypeService } from '@jupyterlab/codeeditor';
import type { CodeMirrorEditor } from '@jupyterlab/codemirror';
import type * as nbformat from '@jupyterlab/nbformat';
import type { IObservableList } from '@jupyterlab/observables';
import { ObservableList } from '@jupyterlab/observables';
import type { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import type { KernelMessage } from '@jupyterlab/services';
import type { ITranslator } from '@jupyterlab/translation';
import { nullTranslator } from '@jupyterlab/translation';
import type { JSONObject } from '@lumino/coreutils';
import { MimeData } from '@lumino/coreutils';
import { Drag } from '@lumino/dragdrop';
import type { Message } from '@lumino/messaging';
import type { ISignal } from '@lumino/signaling';
import { Signal } from '@lumino/signaling';
import { Panel, PanelLayout, SplitPanel, Widget } from '@lumino/widgets';
import { runCell } from './cellexecutor';
import type { IConsoleHistory } from './history';
import { ConsoleHistory } from './history';
import type { IConsoleCellExecutor } from './tokens';

const KERNEL_USER = 'jpKernelUser';
const CODE_RUNNER = 'jpCodeRunner';
const CONSOLE_CLASS = 'jp-CodeConsole';
const CONSOLE_CELL_CLASS = 'jp-Console-cell';
const BANNER_CLASS = 'jp-CodeConsole-banner';
const PROMPT_CLASS = 'jp-CodeConsole-promptCell';
const CONTENT_CLASS = 'jp-CodeConsole-content';
const INPUT_CLASS = 'jp-CodeConsole-input';
const READ_WRITE_CLASS = 'jp-mod-readWrite';
const EXECUTION_TIMEOUT = 250;
const JUPYTER_CELL_MIME = 'application/vnd.jupyter.cells';
const UNDOER = 'jpUndoer';

export class CodeConsole extends Widget {
  constructor(options: CodeConsole.IOptions) {
    super();
    this._translator = options.translator ?? nullTranslator;
    this._executor = options.executor ?? Object.freeze({ runCell });
    this.addClass(CONSOLE_CLASS);
    this.node.dataset[KERNEL_USER] = 'true';
    this.node.dataset[CODE_RUNNER] = 'true';
    this.node.dataset[UNDOER] = 'true';
    this.node.tabIndex = -1;

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

    this._content.addClass(CONTENT_CLASS);
    this._input.addClass(INPUT_CLASS);

    layout.addWidget(this._splitPanel);

    this._splitPanel.handleMoved.connect(() => {
      this._setManualResize();
    }, this);

    this._splitPanel.node.addEventListener(
      'pointerdown',
      event => {
        const target = event.target as HTMLElement;
        if (target.classList.contains('lm-SplitPanel-handle')) {
          this._setManualResize();
        }
      },
      true
    );

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

  get executed(): ISignal<this, Date> {
    return this._executed;
  }

  get promptCellCreated(): ISignal<this, CodeCell> {
    return this._promptCellCreated;
  }

  readonly contentFactory: CodeConsole.IContentFactory;
  readonly modelFactory: CodeConsole.IModelFactory;
  readonly rendermime: IRenderMimeRegistry;
  readonly sessionContext: ISessionContext;

  editorConfig: Record<string, any> = CodeConsole.defaultEditorConfig;

  get cells(): IObservableList<Cell> {
    return this._cells;
  }

  get promptCell(): CodeCell | null {
    const inputLayout = this._input.layout as PanelLayout | null;
    if (!inputLayout) {
      return null;
    }
    return (inputLayout.widgets[0] as CodeCell) || null;
  }

  addCell(cell: CodeCell, msgId?: string): void {
    if (this._config.clearCellsOnExecute) {
      this.clear();
    }
    cell.addClass(CONSOLE_CELL_CLASS);
    cell.node.tabIndex = -1;
    cell.node.querySelectorAll<HTMLElement>(
      '[tabindex], input, button, textarea, select, a'
    ).forEach(el => el.setAttribute('tabindex', '-1'));
    this._content.addWidget(cell);
    this._cells.push(cell);
    if (msgId) {
      this._msgIds.set(msgId, cell);
      this._msgIdCells.set(cell, msgId);
    }
    cell.disposed.connect(this._onCellDisposed, this);
    this.update();
  }

  private _applyBannerAccessibility(banner: RawCell): void {
    banner.node.tabIndex = 0;
    banner.node.setAttribute('role', 'note');
    banner.node.setAttribute('aria-label', 'Kernel Banner');
    banner.node.querySelectorAll<HTMLElement>(
      'input, button, textarea, select, a, [tabindex]'
    ).forEach(el => el.setAttribute('tabindex', '-1'));
  }

  addBanner(): void {
    if (this._banner) {
      const cell = this._banner;
      this._cells.push(this._banner);
      cell.disposed.connect(this._onCellDisposed, this);
    }
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
    this._applyBannerAccessibility(banner);
  }

  clear(): void {
    const cells = this._cells;
    while (cells.length > 0) {
      cells.get(0).dispose();
    }
  }

  createCodeCell(): CodeCell {
    const factory = this.contentFactory;
    const options = this._createCodeCellOptions();
    const cell = factory.createCodeCell(options);
    cell.readOnly = true;
    cell.model.mimeType = this._mimetype;
    return cell;
  }

  dispose(): void {
    if (this.isDisposed) {
      return;
    }

    const promptCell = this.promptCell;
    if (promptCell) {
      if (this._promptResizeObserver) {
        this._promptResizeObserver.disconnect();
        this._promptResizeObserver = null;
      }
      promptCell.model.sharedModel.changed.disconnect(
        this._onPromptContentChanged,
        this
      );
    }

    this._cancelPendingResizeAdjustment();

    this._msgIdCells = null!;
    this._msgIds = null!;
    this._history.dispose();
    super.dispose();
  }

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
      this.newPromptCell();
      await this._execute(promptCell);
      return;
    }

    const shouldExecute = await this._shouldExecute(timeout);
    if (this.isDisposed) {
      return;
    }
    if (shouldExecute) {
      this.newPromptCell();
      this.promptCell!.editor!.focus();
      await this._execute(promptCell);
    } else {
      promptCell.editor!.newIndentedLine();
    }
  }

  getCell(msgId: string): CodeCell | undefined {
    return this._msgIds.get(msgId);
  }

  inject(code: string, metadata: JSONObject = {}): Promise<void> {
    const cell = this.createCodeCell();
    cell.model.sharedModel.setSource(code);
    for (const key of Object.keys(metadata)) {
      cell.model.setMetadata(key, metadata[key]);
    }
    this.addCell(cell);
    if (this._config.hideCodeInput) {
      cell.inputArea?.setHidden(true);
    }
    return this._execute(cell);
  }

  insertLinebreak(): void {
    const promptCell = this.promptCell;
    if (!promptCell) {
      return;
    }
    promptCell.editor!.newIndentedLine();
  }

  replaceSelection(text: string): void {
    const promptCell = this.promptCell;
    if (!promptCell) {
      return;
    }
    promptCell.editor!.replaceSelection?.(text);
  }

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

  private _evtMouseDown(event: MouseEvent): void {
    const { button, shiftKey } = event;

    if (
      !(button === 0 || button === 2) ||
      (shiftKey && button === 2)
    ) {
      return;
    }

    let target = event.target as HTMLElement;
    const cellFilter = (node: HTMLElement) =>
      node.classList.contains(CONSOLE_CELL_CLASS);
    let cellIndex = CellDragUtils.findCell(target, this._cells, cellFilter);

    if (cellIndex === -1) {
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

    protected onAfterAttach(msg: Message): void {
    const node = this.node;
    node.addEventListener('keydown', this, true);
    node.addEventListener('click', this);
    node.addEventListener('mousedown', this);
    node.addEventListener('focusin', this);
    node.addEventListener('focusout', this);

    node.tabIndex = -1;

    const contentNode = this._content.node;
    contentNode.tabIndex = 0;
    contentNode.setAttribute('role', 'log');
    contentNode.setAttribute('aria-label', 'Console Output');
    contentNode.setAttribute('aria-live', 'polite');

    this._input.node.tabIndex = -1;

    contentNode.addEventListener('keydown', (event: KeyboardEvent) => {
      const lineHeight = 24;
      if (event.key === 'ArrowUp') {
        contentNode.scrollBy({ top: -lineHeight, behavior: 'smooth' });
        event.preventDefault();
      } else if (event.key === 'ArrowDown') {
        contentNode.scrollBy({ top: lineHeight, behavior: 'smooth' });
        event.preventDefault();
      } else if (event.key === 'PageUp') {
        contentNode.scrollBy({ top: -contentNode.clientHeight, behavior: 'smooth' });
        event.preventDefault();
      } else if (event.key === 'PageDown') {
        contentNode.scrollBy({ top: contentNode.clientHeight, behavior: 'smooth' });
        event.preventDefault();
      } else if (event.key === 'Home') {
        contentNode.scrollTo({ top: 0, behavior: 'smooth' });
        event.preventDefault();
      } else if (event.key === 'End') {
        contentNode.scrollTo({ top: contentNode.scrollHeight, behavior: 'smooth' });
        event.preventDefault();
      } else if (event.key === 'Escape') {
        this.promptCell?.editor?.focus();
        event.preventDefault();
      }
    });

    if (!this.promptCell) {
      this.newPromptCell();
    } else {
      this.promptCell.editor!.focus();
      this.update();
    }
  }

  protected onBeforeDetach(msg: Message): void {
    const node = this.node;
    node.removeEventListener('keydown', this, true);
    node.removeEventListener('click', this);
    node.removeEventListener('focusin', this);
    node.removeEventListener('focusout', this);
  }

  protected onActivateRequest(msg: Message): void {
    const editor = this.promptCell && this.promptCell.editor;
    if (editor) {
      editor.focus();
    }
    this.update();
  }

  protected newPromptCell(): void {
    let promptCell = this.promptCell;
    const input = this._input;

    const previousContent = promptCell?.model.sharedModel.getSource() ?? '';
    const previousCursorPosition = promptCell?.editor?.getCursorPosition();

    if (promptCell) {
      promptCell.readOnly = true;
      promptCell.removeClass(PROMPT_CLASS);

      promptCell.model.sharedModel.changed.disconnect(
        this._onPromptContentChanged,
        this
      );

      const oldCell = promptCell;
      const promptResizeObserver = this._promptResizeObserver;
      requestIdleCallback(() => {
        Signal.clearData(oldCell.editor);
        if (promptResizeObserver) {
          promptResizeObserver.disconnect();
        }
      });

      promptCell.editor?.blur();
      const child = input.widgets[0];
      child.parent = null;
      if (this._config.hideCodeInput) {
        promptCell.inputArea?.setHidden(true);
      }
      this.addCell(promptCell);
    }

    const factory = this.contentFactory;
    const options = this._createCodeCellOptions();
    promptCell = factory.createCodeCell(options);
    promptCell.model.mimeType = this._mimetype;
    promptCell.addClass(PROMPT_CLASS);

    this._input.addWidget(promptCell);

    this._history.editor = promptCell.editor;

    if (promptCell.node) {
      this._promptResizeObserver = new ResizeObserver(() => {
        this._scheduleInputSizeAdjustment();
      });
      this._promptResizeObserver.observe(promptCell.node);
    }

    promptCell.model.sharedModel.changed.connect(
      this._onPromptContentChanged,
      this
    );

    if (!this._config.clearCodeContentOnExecute) {
      promptCell.model.sharedModel.setSource(previousContent);
      if (previousCursorPosition) {
        promptCell.editor?.setCursorPosition(previousCursorPosition);
      }
    }

    requestAnimationFrame(() => {
      const editorNode = promptCell.editorWidget?.node;
      if (editorNode) {
        editorNode.tabIndex = 0;
        editorNode.setAttribute('aria-label', 'Console Input');
      }

      const cmContent = promptCell.node.querySelector<HTMLElement>(
        '.cm-content, .cm-editor [contenteditable]'
      );
      if (cmContent) {
        cmContent.addEventListener('keydown', (evt: KeyboardEvent) => {
          if (evt.key === 'Escape') {
            evt.preventDefault();
            evt.stopImmediatePropagation();
            setTimeout(() => {
              if (!this.isDisposed) {
                promptCell.editor?.focus();
              }
            }, 0);
            return;
          }

          if (evt.key === 'Tab') {
            const autocompleteOpen = promptCell.node.querySelector(
              '.cm-tooltip-autocomplete, .jp-Completer, [data-id="completer"]'
            );

            if (autocompleteOpen) {
              return;
            }

            if (!evt.shiftKey) {
              evt.stopImmediatePropagation();
              evt.preventDefault();
              const focusable = Array.from(
                document.querySelectorAll<HTMLElement>(
                  '[tabindex="0"], button:not([disabled]), a[href], input:not([disabled])'
                )
              ).filter(el => el.offsetParent !== null);
              const idx = focusable.indexOf(editorNode!);
              const next = focusable[idx + 1];
              if (next) {
                next.focus();
              }
            } else {
              evt.stopImmediatePropagation();
              evt.preventDefault();
              this._content.node.focus();
            }
          }
        }, true);
      }
    });

    this._promptCellCreated.emit(promptCell);
  }

  protected onUpdateRequest(msg: Message): void {
    Private.scrollToBottom(this._content.node);
  }

  private _evtKeyDown(event: KeyboardEvent): void {
    const editor = this.promptCell && this.promptCell.editor;
    if (!editor) {
      return;
    }
    if (event.keyCode === 13 && !editor.hasFocus()) {
      event.preventDefault();
      editor.focus();
    } else if (event.keyCode === 27 && editor.hasFocus()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      setTimeout(() => {
        if (!this.isDisposed) {
          editor.focus();
        }
      }, 0);
    }
  }

  private _evtMouseUp(event: MouseEvent): void {
    if (
      this.promptCell &&
      this.promptCell.node.contains(event.target as HTMLElement)
    ) {
      this.promptCell.editor!.focus();
    }
  }

  private _evtFocusIn(event: FocusEvent): void {
    this._updateReadWrite();
  }

  private _evtFocusOut(event: FocusEvent): void {
    this._updateReadWrite();
  }

  private async _execute(cell: CodeCell): Promise<void> {
    const source = cell.model.sharedModel.getSource();
    this._history.push(source);
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

  private async _onKernelStatusChanged(): Promise<void> {
    const kernel = this.sessionContext.session?.kernel;
    if (kernel?.status === 'restarting') {
      if (this._config.showBanner) {
        this.addBanner();
      }
      this._handleInfo(await kernel?.info);
    }
  }

  private _updateReadWrite(): void {
    const inReadWrite = DOMUtils.hasActiveEditableElement(this.node);
    this.node.classList.toggle(READ_WRITE_CLASS, inReadWrite);
  }

  private _calculateRelativeSizes(): number[] {
    const { promptCellPosition = 'bottom' } = this._config;

    let sizes = [1, 1];
    if (promptCellPosition === 'top') {
      sizes = [1, 100];
    } else if (promptCellPosition === 'bottom') {
      sizes = [100, 1];
    }
    return sizes;
  }

  private _setManualResize(): void {
    this._hasManualResize = true;
    this._cancelPendingResizeAdjustment();
  }

  private _cancelPendingResizeAdjustment(): void {
    if (this._resizeAnimationFrameId !== null) {
      cancelAnimationFrame(this._resizeAnimationFrameId);
      this._resizeAnimationFrameId = null;
    }
  }

  private _scheduleInputSizeAdjustment(): void {
    if (this._hasManualResize) {
      return;
    }
    if (this._resizeAnimationFrameId === null) {
      this._resizeAnimationFrameId = requestAnimationFrame(() => {
        this._resizeAnimationFrameId = null;
        this._adjustSplitPanelForInputGrowth();
      });
    }
  }

  private _onPromptContentChanged(): void {
    this._scheduleInputSizeAdjustment();
  }

  private _adjustSplitPanelForInputGrowth(): void {
    if (
      this.isDisposed ||
      !this._input.node ||
      !this._content.node ||
      this._hasManualResize
    ) {
      return;
    }

    const { promptCellPosition = 'bottom' } = this._config;

    if (promptCellPosition === 'left' || promptCellPosition === 'right') {
      return;
    }

    const promptCell = this.promptCell;
    if (!promptCell || !promptCell.editor) {
      return;
    }

    const cmEditor = promptCell.editor as CodeMirrorEditor;
    const editorContentHeight = cmEditor.editor.contentHeight;

    const cellPadding = this._getInputCellPadding();
    const inputHeight = editorContentHeight + cellPadding;

    const totalHeight = this._splitPanel.node.clientHeight;

    if (totalHeight <= 0 || inputHeight <= 0) {
      this._splitPanel.fit();
      return;
    }

    const remainingHeight = totalHeight - inputHeight;
    let contentRatio: number;
    let inputRatio: number;

    if (promptCellPosition === 'bottom') {
      contentRatio = remainingHeight / totalHeight;
      inputRatio = inputHeight / totalHeight;
    } else {
      inputRatio = inputHeight / totalHeight;
      contentRatio = remainingHeight / totalHeight;
    }

    const totalRatio = contentRatio + inputRatio;
    if (totalRatio > 0) {
      const normalizedSizes =
        promptCellPosition === 'bottom'
          ? [contentRatio / totalRatio, inputRatio / totalRatio]
          : [inputRatio / totalRatio, contentRatio / totalRatio];

      this._splitPanel.setRelativeSizes(normalizedSizes);
    }
  }

  private _getInputCellPadding(): number {
    const inputPanelNode = this._input.node;
    const inputPanelStyle = window.getComputedStyle(inputPanelNode);
    const inputPanelPadding =
      parseFloat(inputPanelStyle.paddingTop) +
      parseFloat(inputPanelStyle.paddingBottom);

    const promptCell = this.promptCell;
    if (!promptCell) {
      return inputPanelPadding;
    }

    const cellStyle = window.getComputedStyle(promptCell.node);
    const cellPadding =
      parseFloat(cellStyle.paddingTop) + parseFloat(cellStyle.paddingBottom);

    const editorWrapper = promptCell.editorWidget?.node;
    let editorBorder = 0;
    if (editorWrapper) {
      const editorStyle = window.getComputedStyle(editorWrapper);
      editorBorder =
        parseFloat(editorStyle.borderTopWidth) +
        parseFloat(editorStyle.borderBottomWidth);
    }

    return inputPanelPadding + cellPadding + editorBorder;
  }

  private _updateLayout(): void {
    const { promptCellPosition = 'bottom' } = this._config;

    this._hasManualResize = false;

    this._splitPanel.orientation = ['left', 'right'].includes(
      promptCellPosition
    )
      ? 'horizontal'
      : 'vertical';

    SplitPanel.setStretch(this._content, 1);
    SplitPanel.setStretch(this._input, 1);

    if (promptCellPosition === 'bottom' || promptCellPosition === 'right') {
      this._splitPanel.insertWidget(0, this._content);
      this._splitPanel.insertWidget(1, this._input);
    } else {
      this._splitPanel.insertWidget(0, this._input);
      this._splitPanel.insertWidget(1, this._content);
    }

    this._splitPanel.setRelativeSizes(this._calculateRelativeSizes());

    requestAnimationFrame(() => {
      this._adjustSplitPanelForInputGrowth();
    });
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
  private _promptResizeObserver: ResizeObserver | null = null;
  private _hasManualResize = false;
  private _resizeAnimationFrameId: number | null = null;
}

export namespace CodeConsole {
  export type PromptCellPosition = 'top' | 'bottom' | 'left' | 'right';

  export interface IConfig {
    clearCellsOnExecute?: boolean;
    clearCodeContentOnExecute?: boolean;
    hideCodeInput?: boolean;
    promptCellPosition?: PromptCellPosition;
    showBanner?: boolean;
  }

  export interface IOptions {
    contentFactory: IContentFactory;
    executor?: IConsoleCellExecutor;
    modelFactory?: IModelFactory;
    rendermime: IRenderMimeRegistry;
    sessionContext: ISessionContext;
    mimeTypeService: IEditorMimeTypeService;
    translator?: ITranslator;
  }

  export const defaultEditorConfig: Record<string, any> = {
    codeFolding: false,
    lineNumbers: false
  };

  export interface IContentFactory extends Cell.IContentFactory {
    createCodeCell(options: CodeCell.IOptions): CodeCell;
    createRawCell(options: RawCell.IOptions): RawCell;
  }

  export class ContentFactory
    extends Cell.ContentFactory
    implements IContentFactory
  {
    createCodeCell(options: CodeCell.IOptions): CodeCell {
      return new CodeCell(options).initializeState();
    }

    createRawCell(options: RawCell.IOptions): RawCell {
      return new RawCell(options).initializeState();
    }
  }

  export namespace ContentFactory {
    export interface IOptions extends Cell.IContentFactory {}
  }

  export interface IModelFactory {
    readonly codeCellContentFactory: CodeCellModel.IContentFactory;
    createCodeCell(options: CodeCellModel.IOptions): ICodeCellModel;
    createRawCell(
      options: AttachmentsCellModel.IOptions<ISharedRawCell>
    ): IRawCellModel;
  }

  export class ModelFactory {
    constructor(options: IModelFactoryOptions = {}) {
      this.codeCellContentFactory =
        options.codeCellContentFactory || CodeCellModel.defaultContentFactory;
    }

    readonly codeCellContentFactory: CodeCellModel.IContentFactory;

    createCodeCell(options: CodeCellModel.IOptions = {}): ICodeCellModel {
      if (!options.contentFactory) {
        options.contentFactory = this.codeCellContentFactory;
      }
      return new CodeCellModel(options);
    }

    createRawCell(
      options: AttachmentsCellModel.IOptions<ISharedRawCell>
    ): IRawCellModel {
      return new RawCellModel(options);
    }
  }

  export interface IModelFactoryOptions {
    codeCellContentFactory?: CodeCellModel.IContentFactory;
  }

  export const defaultModelFactory = new ModelFactory({});
}

namespace Private {
  export function scrollToBottom(node: HTMLElement): void {
    node.scrollTop = node.scrollHeight - node.clientHeight;
  }
}