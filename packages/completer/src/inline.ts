// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { TransactionSpec } from '@codemirror/state';
import { SourceChange } from '@jupyter/ydoc';
import { CodeEditor } from '@jupyterlab/codeeditor';
import { CodeMirrorEditor } from '@jupyterlab/codemirror';
import { TranslationBundle } from '@jupyterlab/translation';
import { HoverBox, kernelIcon, Toolbar } from '@jupyterlab/ui-components';
import { IDisposable } from '@lumino/disposable';
import { Message } from '@lumino/messaging';
import { ISignal, Signal } from '@lumino/signaling';
import { PanelLayout, Widget } from '@lumino/widgets';
import { GhostTextManager } from './ghost';
import { CompletionHandler } from './handler';
import {
  IInlineCompleterFactory,
  IInlineCompleterSettings,
  IInlineCompletionList
} from './tokens';

const INLINE_COMPLETER_CLASS = 'jp-InlineCompleter';
const INLINE_COMPLETER_ACTIVE_CLASS = 'jp-mod-inline-completer-active';
const HOVER_CLASS = 'jp-InlineCompleter-hover';
const PROGRESS_BAR_CLASS = 'jp-InlineCompleter-progressBar';

/**
 * Widget enabling user to choose among inline completions,
 * typically by pressing next/previous buttons, and showing
 * additional metadata about active completion, such as
 * inline completion provider name.
 */
export class InlineCompleter extends Widget {
  constructor(options: InlineCompleter.IOptions) {
    super({ node: document.createElement('div') });
    this.model = options.model ?? null;
    this.editor = options.editor ?? null;
    this.addClass(INLINE_COMPLETER_CLASS);
    this.addClass('jp-ThemedContainer');
    this._ghostManager = new GhostTextManager({
      onBlur: this._onEditorBlur.bind(this)
    });
    this._trans = options.trans;
    const layout = (this.layout = new PanelLayout());
    layout.addWidget(this._suggestionsCounter);
    layout.addWidget(this.toolbar);
    layout.addWidget(this._providerWidget);
    this._progressBar = document.createElement('div');
    this._progressBar.className = PROGRESS_BAR_CLASS;
    this.node.appendChild(this._progressBar);
    this._updateShortcutsVisibility();
    this._updateDisplay();
    // Allow the node to receive focus, which prevents removing the ghost text
    // when user mis-clicks on the tooltip instead of the button in the tooltip.
    this.node.tabIndex = 0;
  }

  /**
   * Toolbar with buttons such as previous/next/accept.
   */
  get toolbar() {
    return this._toolbar;
  }

  /**
   * The editor used by the completion widget.
   */
  get editor(): CodeEditor.IEditor | null | undefined {
    return this._editor;
  }
  set editor(newValue: CodeEditor.IEditor | null | undefined) {
    this.model?.reset();
    this._editor = newValue;
  }

  /**
   * The model used by the completer widget.
   */
  get model(): InlineCompleter.IModel | null {
    return this._model;
  }
  set model(model: InlineCompleter.IModel | null) {
    if ((!model && !this._model) || model === this._model) {
      return;
    }
    if (this._model) {
      this._model.suggestionsChanged.disconnect(
        this._onModelSuggestionsChanged,
        this
      );
      this._model.filterTextChanged.disconnect(
        this._onModelFilterTextChanged,
        this
      );
      this._model.provisionProgress.disconnect(this._onProvisionProgress, this);
    }
    this._model = model;
    if (this._model) {
      this._model.suggestionsChanged.connect(
        this._onModelSuggestionsChanged,
        this
      );
      this._model.filterTextChanged.connect(
        this._onModelFilterTextChanged,
        this
      );
      this._model.provisionProgress.connect(this._onProvisionProgress, this);
    }
  }

  cycle(direction: 'next' | 'previous'): void {
    const items = this.model?.completions?.items;
    if (!items) {
      return;
    }
    if (direction === 'next') {
      const proposed = this._current + 1;
      this._current = proposed === items.length ? 0 : proposed;
    } else {
      const proposed = this._current - 1;
      this._current = proposed === -1 ? items.length - 1 : proposed;
    }
    this._updateStreamTracking();
    this._render();
  }

  accept(): void {
    const model = this.model;
    const candidate = this.current;
    const editor = this._editor;
    if (!editor || !model || !candidate) {
      return;
    }
    const position = model.cursor;
    const value = candidate.insertText;
    const cursorBeforeChange = editor.getOffsetAt(editor.getCursorPosition());
    const requestPosition = editor.getOffsetAt(position);
    const start = requestPosition;
    const end = cursorBeforeChange;
    const transactions: TransactionSpec = {
      changes: { from: start, to: end, insert: value }
    };
    if (cursorBeforeChange <= end && cursorBeforeChange >= start) {
      transactions.selection = { anchor: start + value.length };
    }
    (editor as CodeMirrorEditor).editor.dispatch(transactions);
    model.reset();
    this.update();
  }

  get current(): CompletionHandler.IInlineItem | null {
    const completions = this.model?.completions;
    if (!completions) {
      return null;
    }
    return completions.items[this._current];
  }

  private _updateStreamTracking() {
    if (this._lastItem) {
      this._lastItem.stream.disconnect(this._onStream, this);
    }
    const current = this.current;
    if (current) {
      current.stream.connect(this._onStream, this);
    }
    this._lastItem = current;
  }

  private _onStream(
    _emitter: CompletionHandler.IInlineItem,
    _change: CompletionHandler.StraemEvent
  ) {
    // TODO handle stuck streams, i.e. if we connected and received 'opened'
    // but then did not receive 'closed' for a long time we should disconnect
    // and update widget with an 'timed out' status.
    const completions = this.model?.completions;
    if (!completions || !completions.items || completions.items.length === 0) {
      return;
    }

    if (this.isHidden) {
      return;
    }

    const candidate = completions.items[this._current];
    this._setText(candidate);
  }

  /**
   * Change user-configurable settings.
   */
  configure(settings: IInlineCompleterSettings) {
    this._showWidget = settings.showWidget;
    this._updateDisplay();
    if (settings.showShortcuts !== this._showShortcuts) {
      this._showShortcuts = settings.showShortcuts;
      this._updateShortcutsVisibility();
    }
    GhostTextManager.streamingAnimation = settings.streamingAnimation;
    GhostTextManager.spacerRemovalDelay = Math.max(
      0,
      settings.editorResizeDelay - 300
    );
    GhostTextManager.spacerRemovalDuration = Math.max(
      0,
      Math.min(300, settings.editorResizeDelay - 300)
    );
    this._minLines = settings.minLines;
    this._maxLines = settings.maxLines;
    this._reserveSpaceForLongest = settings.reserveSpaceForLongest;
    this._suppressIfTabCompleterActive = settings.suppressIfTabCompleterActive;
  }

  /**
   * Whether to suppress the inline completer when tab completer is active.
   */
  get suppressIfTabCompleterActive(): boolean {
    return this._suppressIfTabCompleterActive;
  }

  /**
   * Whether the inline completer is active.
   */
  get isActive(): boolean {
    return !!this.editor?.host.classList.contains(
      INLINE_COMPLETER_ACTIVE_CLASS
    );
  }

  /**
   * Handle the DOM events for the widget.
   *
   * @param event - The DOM event sent to the widget.
   *
   * #### Notes
   * This method implements the DOM `EventListener` interface and is
   * called in response to events on the dock panel's node. It should
   * not be called directly by user code.
   */
  handleEvent(event: Event): void {
    if (this.isHidden || !this._editor) {
      return;
    }
    switch (event.type) {
      case 'pointerdown':
        this._evtPointerdown(event as PointerEvent);
        break;
      case 'scroll':
        this._evtScroll(event as MouseEvent);
        break;
      default:
        break;
    }
  }

  /**
   * Handle `update-request` messages.
   */
  protected onUpdateRequest(msg: Message): void {
    super.onUpdateRequest(msg);
    const model = this._model;
    if (!model) {
      return;
    }
    let reply = model.completions;

    // If there are no items, hide.
    if (!reply || !reply.items || reply.items.length === 0) {
      if (!this.isHidden) {
        this.hide();
      }
      return;
    }

    if (this.isHidden) {
      this.show();
      this._setGeometry();
    }
  }

  /**
   * Handle `after-attach` messages for the widget.
   */
  protected onAfterAttach(msg: Message): void {
    document.addEventListener('scroll', this, true);
    document.addEventListener('pointerdown', this, true);
  }

  /**
   * Handle `before-detach` messages for the widget.
   */
  protected onBeforeDetach(msg: Message): void {
    document.removeEventListener('scroll', this, true);
    document.removeEventListener('pointerdown', this, true);
  }

  /**
   * Handle pointerdown events for the widget.
   */
  private _evtPointerdown(event: PointerEvent) {
    if (this.isHidden || !this._editor) {
      return;
    }
    const target = event.target as HTMLElement;
    if (this.node.contains(target)) {
      return true;
    }
    this.hide();
    this.model?.reset();
  }

  /**
   * Handle scroll events for the widget
   */
  private _evtScroll(event: MouseEvent) {
    if (this.isHidden || !this._editor) {
      return;
    }

    const { node } = this;

    // All scrolls except scrolls in the actual hover box node may cause the
    // referent editor that anchors the node to move, so the only scroll events
    // that can safely be ignored are ones that happen inside the hovering node.
    if (node.contains(event.target as HTMLElement)) {
      return;
    }

    // Set the geometry of the node asynchronously.
    requestAnimationFrame(() => {
      this._setGeometry();
    });
  }

  private _onEditorBlur(event: FocusEvent) {
    if (this.node.contains(event.relatedTarget as HTMLElement)) {
      // Cancel removing ghost text if our node is receiving focus
      return false;
    }
    // The ghost text will be removed, so nothing to accept
    this._editor?.host.classList.remove(INLINE_COMPLETER_ACTIVE_CLASS);
    // Hide the widget if editor was blurred.
    this.hide();
  }

  private _onModelSuggestionsChanged(
    _emitter: InlineCompleter.IModel,
    args: ISuggestionsChangedArgs
  ): void {
    if (!this.isAttached) {
      this.update();
      return;
    }
    if (args.event === 'set') {
      this._current = args.indexMap!.get(this._current) ?? 0;
    } else if (args.event === 'clear') {
      const editor = this.editor;
      if (editor) {
        this._ghostManager.clearGhosts((editor as CodeMirrorEditor).editor);
        editor.host.classList.remove(INLINE_COMPLETER_ACTIVE_CLASS);
      }
    }
    this._updateStreamTracking();
    this.update();
    this._render();
  }

  private _onModelFilterTextChanged(
    _emitter: InlineCompleter.IModel,
    mapping: Map<number, number>
  ): void {
    const completions = this.model?.completions;
    if (!completions || !completions.items || completions.items.length === 0) {
      return;
    }
    this._current = mapping.get(this._current) ?? 0;
    this._updateStreamTracking();
    // Because the signal will be emitted during `EditorView.update` we want to
    // wait for the update to complete before calling `this._render()`. As there
    // is no API to check if update is done, we instead defer to next engine tick.
    setTimeout(() => {
      this._render();
      // (reading layout to get coordinate to position hoverbox is not allowed either)
      this._setGeometry();
    }, 0);
  }

  private _onProvisionProgress(
    _emitter: InlineCompleter.IModel,
    progress: InlineCompleter.IProvisionProgress
  ): void {
    requestAnimationFrame(() => {
      if (progress.pendingProviders === 0) {
        this._progressBar.style.display = 'none';
      } else {
        this._progressBar.style.display = '';
        this._progressBar.style.width =
          (100 * progress.pendingProviders) / progress.totalProviders + '%';
      }
    });
  }

  private _render(): void {
    const completions = this.model?.completions;
    if (!completions || !completions.items || completions.items.length === 0) {
      return;
    }
    const candidate = completions.items[this._current];
    this._setText(candidate);

    if (this._showWidget === 'never') {
      return;
    }
    this._suggestionsCounter.node.innerText = this._trans.__(
      '%1/%2',
      this._current + 1,
      completions.items.length
    );
    this._providerWidget.node.title = this._trans.__(
      'Provider: %1',
      candidate.provider.name
    );
    const icon = candidate.provider.icon ?? kernelIcon;
    icon.render(this._providerWidget.node);
  }

  private _setText(item: CompletionHandler.IInlineItem) {
    const text = item.insertText;

    const editor = this._editor;
    const model = this._model;
    if (!model || !editor) {
      return;
    }

    const view = (editor as CodeMirrorEditor).editor;

    let minLines: number;
    if (this._reserveSpaceForLongest) {
      const items = this.model?.completions?.items ?? [];
      const longest = Math.max(
        ...items.map(i => i.insertText.split('\n').length)
      );
      minLines = Math.max(this._minLines, longest);
    } else {
      minLines = this._minLines;
    }

    this._ghostManager.placeGhost(view, {
      from: editor.getOffsetAt(model.cursor),
      content: text,
      providerId: item.provider.identifier,
      addedPart: item.lastStreamed,
      streaming: item.streaming,
      minLines: minLines,
      maxLines: this._maxLines,
      onPointerOver: this._onPointerOverGhost.bind(this),
      onPointerLeave: this._onPointerLeaveGhost.bind(this),
      error: item.error
    });
    editor.host.classList.add(INLINE_COMPLETER_ACTIVE_CLASS);
  }

  private _onPointerOverGhost() {
    if (this._clearHoverTimeout !== null) {
      window.clearTimeout(this._clearHoverTimeout);
      this._clearHoverTimeout = null;
    }
    this.node.classList.add(HOVER_CLASS);
  }

  private _onPointerLeaveGhost() {
    // Remove after a small delay to avoid flicker when moving cursor
    // between the lines or around the edges of the ghost text.
    this._clearHoverTimeout = window.setTimeout(
      () => this.node.classList.remove(HOVER_CLASS),
      500
    );
  }

  private _setGeometry() {
    const { node } = this;
    const model = this._model;
    const editor = this._editor;

    if (!editor || !model || !model.cursor) {
      return;
    }

    const host =
      (editor.host.closest('.jp-MainAreaWidget > .lm-Widget') as HTMLElement) ||
      editor.host;

    let anchor: DOMRect;
    try {
      const maybeAnchor = editor.getCoordinateForPosition(model.cursor);
      if (!maybeAnchor) {
        throw Error('No coordinates for cursor position');
      }
      anchor = maybeAnchor as DOMRect;
    } catch {
      // if coordinate is no longer in editor (e.g. after deleting a line), hide widget
      this.hide();
      return;
    }
    HoverBox.setGeometry({
      anchor,
      host: host,
      maxHeight: 40,
      minHeight: 20,
      node: node,
      privilege: 'forceAbove',
      outOfViewDisplay: {
        top: 'stick-outside',
        bottom: 'stick-inside',
        left: 'stick-inside',
        right: 'stick-outside'
      }
    });
  }

  private _updateShortcutsVisibility() {
    this.node.dataset.showShortcuts = this._showShortcuts + '';
  }

  private _updateDisplay() {
    this.node.dataset.display = this._showWidget;
  }

  private _clearHoverTimeout: number | null = null;
  private _current: number = 0;
  private _editor: CodeEditor.IEditor | null | undefined = null;
  private _ghostManager: GhostTextManager;
  private _lastItem: CompletionHandler.IInlineItem | null = null;
  private _maxLines: number;
  private _minLines: number;
  private _model: InlineCompleter.IModel | null = null;
  private _providerWidget = new Widget();
  private _showShortcuts = InlineCompleter.defaultSettings.showShortcuts;
  private _showWidget = InlineCompleter.defaultSettings.showWidget;
  private _suggestionsCounter = new Widget();
  private _trans: TranslationBundle;
  private _toolbar = new Toolbar<Widget>();
  private _progressBar: HTMLElement;
  private _reserveSpaceForLongest: boolean;
  private _suppressIfTabCompleterActive: boolean;
}

/**
 * Map between old and new inline completion position in the list.
 */
export type IndexMap = Map<number, number>;

export interface ISuggestionsChangedArgs {
  /**
   * Whether completions were set (new query) or appended (for existing query)
   */
  event: 'set' | 'append' | 'clear';
  /**
   * Map between old and new inline indices, only present for `set` event.
   */
  indexMap?: IndexMap;
}

/**
 * A namespace for inline completer statics.
 */
export namespace InlineCompleter {
  /**
   * The initialization options for inline completer widget.
   */
  export interface IOptions extends IInlineCompleterFactory.IOptions {
    /**
     * JupyterLab translation bundle.
     */
    trans: TranslationBundle;
  }

  /**
   * Defaults for runtime user-configurable settings.
   */
  export const defaultSettings: IInlineCompleterSettings = {
    showWidget: 'onHover',
    showShortcuts: true,
    streamingAnimation: 'uncover',
    providers: {},
    minLines: 2,
    maxLines: 4,
    editorResizeDelay: 1000,
    reserveSpaceForLongest: false,
    suppressIfTabCompleterActive: true
  };

  /**
   * Progress in generation of completion candidates by providers.
   */
  export interface IProvisionProgress {
    /**
     * The number of providers to yet provide a reply.
     * Excludes providers which resolved/rejected their promise, or timed out.
     */
    pendingProviders: number;

    /**
     * The number of providers from which inline completions were requested.
     */
    totalProviders: number;
  }

  /**
   * Model for inline completions.
   */
  export interface IModel extends IDisposable {
    /**
     * A signal emitted when new suggestions are set on the model.
     */
    readonly suggestionsChanged: ISignal<IModel, ISuggestionsChangedArgs>;

    /**
     * A signal emitted when filter text is updated.
     * Emits a mapping from old to new index for items after filtering.
     */
    readonly filterTextChanged: ISignal<IModel, IndexMap>;

    /**
     * A signal emitted when new information about progress is available.
     */
    readonly provisionProgress: ISignal<IModel, IProvisionProgress>;

    /**
     * Original placement of cursor.
     */
    cursor: CodeEditor.IPosition;

    /**
     * Reset completer model.
     */
    reset(): void;

    /**
     * Set completions clearing existing ones.
     */
    setCompletions(
      reply: IInlineCompletionList<CompletionHandler.IInlineItem>
    ): void;

    /**
     * Append completions while preserving new ones.
     */
    appendCompletions(
      reply: IInlineCompletionList<CompletionHandler.IInlineItem>
    ): void;

    /**
     * Notify model about progress in generation of completion candidates by providers.
     */
    notifyProgress(providerProgress: IProvisionProgress): void;

    /**
     * Current inline completions.
     */
    readonly completions: IInlineCompletionList<CompletionHandler.IInlineItem> | null;

    /**
     * Handle a source change.
     */
    handleTextChange(change: SourceChange): void;

    /**
     * Handle cursor selection change.
     */
    handleSelectionChange(range: CodeEditor.IRange): void;
  }

  /**
   * Model for inline completions.
   */
  export class Model implements InlineCompleter.IModel {
    setCompletions(
      reply: IInlineCompletionList<CompletionHandler.IInlineItem>
    ) {
      const previousPositions: Map<string, number> = new Map(
        this._completions?.items?.map((item, index) => [item.insertText, index])
      );
      this._completions = reply;
      const indexMap = new Map(
        reply.items.map((item, newIndex) => [
          previousPositions.get(item.insertText)!,
          newIndex
        ])
      );
      this.suggestionsChanged.emit({
        event: 'set',
        indexMap
      });
    }

    appendCompletions(
      reply: IInlineCompletionList<CompletionHandler.IInlineItem>
    ) {
      if (!this._completions || !this._completions.items) {
        console.warn('No completions to append to');
        return;
      }
      this._completions.items.push(...reply.items);
      this.suggestionsChanged.emit({ event: 'append' });
    }

    notifyProgress(progress: IProvisionProgress) {
      this.provisionProgress.emit(progress);
    }

    get cursor(): CodeEditor.IPosition {
      return this._cursor;
    }

    set cursor(value: CodeEditor.IPosition) {
      this._cursor = value;
    }

    get completions() {
      return this._completions;
    }

    reset() {
      this._completions = null;
      this.suggestionsChanged.emit({ event: 'clear' });
    }

    /**
     * Get whether the model is disposed.
     */
    get isDisposed(): boolean {
      return this._isDisposed;
    }

    handleTextChange(sourceChange: SourceChange) {
      const completions = this._completions;
      if (
        !completions ||
        !completions.items ||
        completions.items.length === 0
      ) {
        return;
      }
      const originalPositions: Map<CompletionHandler.IInlineItem, number> =
        new Map(completions.items.map((item, index) => [item, index]));
      for (let change of sourceChange.sourceChange ?? []) {
        const insert = change.insert;
        if (insert) {
          const items = completions.items.filter(item => {
            const filterText = item.filterText ?? item.insertText;
            if (!filterText.startsWith(insert)) {
              return false;
            }
            item.filterText = filterText.substring(insert.length);
            item.insertText = item.insertText.substring(insert.length);
            return true;
          });
          if (items.length === 0) {
            // all items from this provider were filtered out
            this._completions = null;
          }
          completions.items = items;
        } else {
          if (!change.retain) {
            this._completions = null;
          }
        }
      }
      const indexMap = new Map(
        completions.items.map((item, newIndex) => [
          originalPositions.get(item)!,
          newIndex
        ])
      );
      this.filterTextChanged.emit(indexMap);
    }

    handleSelectionChange(range: CodeEditor.IRange) {
      const initialCursor = this.cursor;
      if (!initialCursor) {
        return;
      }
      const { start, end } = range;
      if (start.column !== end.column || start.line !== end.line) {
        // Cancel if user started selecting text.
        this.reset();
      }
      if (
        start.line !== initialCursor.line ||
        start.column < initialCursor.column
      ) {
        // Cancel if user moved cursor to next line or receded to before the origin
        this.reset();
      }
    }

    /**
     * Dispose of the resources held by the model.
     */
    dispose(): void {
      // Do nothing if already disposed.
      if (this._isDisposed) {
        return;
      }
      this._isDisposed = true;
      Signal.clearData(this);
    }

    suggestionsChanged = new Signal<this, ISuggestionsChangedArgs>(this);
    filterTextChanged = new Signal<this, IndexMap>(this);
    provisionProgress = new Signal<this, IProvisionProgress>(this);
    private _isDisposed = false;
    private _completions: IInlineCompletionList<CompletionHandler.IInlineItem> | null =
      null;
    private _cursor: CodeEditor.IPosition;
  }
}
