// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { PanelLayout, Widget } from '@lumino/widgets';
import { IDisposable } from '@lumino/disposable';
import { ISignal, Signal } from '@lumino/signaling';
import { Message } from '@lumino/messaging';
import { CodeEditor } from '@jupyterlab/codeeditor';
import { HoverBox } from '@jupyterlab/ui-components';
import { CodeMirrorEditor } from '@jupyterlab/codemirror';
import { SourceChange } from '@jupyter/ydoc';
import { fileIcon, Toolbar } from '@jupyterlab/ui-components';
import { TranslationBundle } from '@jupyterlab/translation';
import { IInlineCompleterFactory, IInlineCompletionList } from './tokens';
import { CompletionHandler } from './handler';
import { GhostTextManager } from './ghost';

const INLINE_COMPLETER_CLASS = 'jp-InlineCompleter';

/**
 * Widget enabling user to choose among inline completions,
 * typically by pressing next/previous buttons, and showing
 * additional metadata about active completion, such as
 * inline completion provider name.
 */
export class InlineCompleter extends Widget {
  // TODO maybe create extension point to add custom buttons (per provider?)
  constructor(options: InlineCompleter.IOptions) {
    super({ node: document.createElement('div') });
    this.model = options.model ?? null;
    this.editor = options.editor ?? null;
    this.addClass(INLINE_COMPLETER_CLASS);
    this._ghostManager = new GhostTextManager();
    this._trans = options.trans;
    const layout = (this.layout = new PanelLayout());
    layout.addWidget(this._suggestionsCounter);
    layout.addWidget(this.toolbar);
    layout.addWidget(this._providerWidget);
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
    // update the shared model in a single transaction so that the undo manager works as expected
    editor.model.sharedModel.updateSource(
      requestPosition,
      cursorBeforeChange,
      value
    );
    if (cursorBeforeChange <= end && cursorBeforeChange >= start) {
      editor.setCursorPosition(editor.getPositionAt(start + value.length)!);
    }
    model.reset();
    this._ghostManager.clearGhosts((editor as CodeMirrorEditor).editor);
    this.update();
  }

  get current(): CompletionHandler.IInlineItem | null {
    const completions = this.model?.completions;
    if (!completions) {
      return null;
    }
    return completions.items[this._current];
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
    }
    this._setGeometry();
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

  private _onModelSuggestionsChanged(
    _emitter: InlineCompleter.IModel,
    args: ISuggestionsChangedArgs
  ): void {
    if (!this.isAttached) {
      this.update();
      return;
    }
    if (args.event == 'set') {
      this._current = args.indexMap!.get(this._current) ?? 0;
      this.update();
    }
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
    // Because the signal will be emitted during `EditorView.update` we want to
    // wait for the update to complete before calling `this._render()`. As there
    // is no API to check if update is done, we instead defer to next engine tick.
    setTimeout(() => this._render(), 0);
  }

  private _render(): void {
    const completions = this.model?.completions;
    if (!completions || !completions.items || completions.items.length === 0) {
      return;
    }
    const candidate = completions.items[this._current];
    this._setText(candidate);
    this._suggestionsCounter.node.innerText = this._trans.__(
      '%1/%2',
      this._current + 1,
      completions.items.length
    );
    this._providerWidget.node.title = this._trans.__(
      'Provider: %1',
      candidate.provider.name
    );
    fileIcon.render(this._providerWidget.node);
  }

  private _setText(item: CompletionHandler.IInlineItem) {
    const text = item.insertText;

    const editor = this._editor;
    const model = this._model;
    if (!model || !editor) {
      return;
    }

    const view = (editor as CodeMirrorEditor).editor;
    this._ghostManager.placeGhost(view, {
      from: editor.getOffsetAt(model.cursor),
      content: text,
      providerId: item.provider.identifier
    });
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
      anchor = editor.getCoordinateForPosition(model.cursor) as DOMRect;
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

  private _current: number = 0;
  private _ghostManager: GhostTextManager;
  private _editor: CodeEditor.IEditor | null | undefined = null;
  private _model: InlineCompleter.IModel | null = null;
  private _toolbar = new Toolbar<Widget>();
  private _suggestionsCounter = new Widget();
  private _providerWidget = new Widget();
  private _trans: TranslationBundle;
}

/**
 * Map between old and new inline completion position in the list.
 */
type IndexMap = Map<number, number>;

interface ISuggestionsChangedArgs {
  /**
   * Whether completions were set (new query) or appended (for existing query)
   */
  event: 'set' | 'append';
  /**
   * Number of providers that is expected to still report inline suggestions.
   */
  expecting: number;
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
     * Original placement of cursor.
     */
    cursor: CodeEditor.IPosition;

    /**
     * Reset completer model.
     */
    reset(): void;

    // TODO:
    // - maybe merge the two methods and add a third argument.
    // - maybe accept an object on second argument, say `IProgress`.
    // - maybe move the awaiting/progress info to separate method
    //   (the downside would be that we could then end up rendering twice/
    //   would need to be very careful about the order these two would be called).
    /**
     * Set completions clearing existing ones.
     */
    setCompletions(
      reply: IInlineCompletionList<CompletionHandler.IInlineItem>,
      awaiting: number
    ): void;

    /**
     * Append completions while preserving new ones.
     */
    appendCompletions(
      reply: IInlineCompletionList<CompletionHandler.IInlineItem>,
      awaiting: number
    ): void;

    /**
     * Current inline completions.
     */
    readonly completions: IInlineCompletionList<CompletionHandler.IInlineItem> | null;

    /**
     * Handle a source change.
     */
    handleTextChange(change: SourceChange): void;
  }

  /**
   * Model for inline completions.
   */
  export class Model implements InlineCompleter.IModel {
    setCompletions(
      reply: IInlineCompletionList<CompletionHandler.IInlineItem>,
      awaiting: number
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
        expecting: awaiting,
        indexMap
      });
    }

    appendCompletions(
      reply: IInlineCompletionList<CompletionHandler.IInlineItem>,
      awaiting: number
    ) {
      if (!this._completions) {
        console.warn('No completions to append to');
        return;
      }
      this._completions.items.push(...reply.items);
      this.suggestionsChanged.emit({ event: 'append', expecting: awaiting });
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
    private _isDisposed = false;
    private _completions: IInlineCompletionList<CompletionHandler.IInlineItem> | null =
      null;
    private _cursor: CodeEditor.IPosition;
  }
}