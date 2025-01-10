// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Sanitizer } from '@jupyterlab/apputils';
import { CodeEditor } from '@jupyterlab/codeeditor';
import { IRenderMime, renderText } from '@jupyterlab/rendermime';
import { HoverBox, LabIcon } from '@jupyterlab/ui-components';
import { JSONObject } from '@lumino/coreutils';
import { IDisposable } from '@lumino/disposable';
import { ElementExt } from '@lumino/domutils';
import { Message } from '@lumino/messaging';
import { ISignal, Signal } from '@lumino/signaling';
import { Widget } from '@lumino/widgets';

import { CompletionHandler } from './handler';

/**
 * The class name added to completer menu items.
 */
const ITEM_CLASS = 'jp-Completer-item';

/**
 * The class name added to an active completer menu item.
 */
const ACTIVE_CLASS = 'jp-mod-active';

/**
 * The class used by item listing which determines the height of the completer.
 */
const LIST_CLASS = 'jp-Completer-list';

/**
 * Class of the documentation panel.
 */
const DOC_PANEL_CLASS = 'jp-Completer-docpanel';

/**
 * A flag to indicate that event handlers are caught in the capture phase.
 */
const USE_CAPTURE = true;

/**
 * The number of colors defined for the completer type annotations.
 * These are listed in completer/style/index.css#102-152.
 */
const N_COLORS = 10;

/**
 * A widget that enables text completion.
 *
 * #### Notes
 * The completer is intended to be absolutely positioned on the
 * page and hover over any other content, so it should be attached directly
 * to `document.body`, or a node that is the full size of `document.body`.
 * Attaching it to other nodes may incorrectly locate the completer.
 */
export class Completer extends Widget {
  /**
   * Construct a text completer menu widget.
   */
  constructor(options: Completer.IOptions) {
    super({ node: document.createElement('div') });
    this.sanitizer = options.sanitizer ?? new Sanitizer();
    this._defaultRenderer = Completer.getDefaultRenderer(this.sanitizer);
    this._renderer = options.renderer ?? this._defaultRenderer;
    this._docPanel = this._createDocPanelNode();
    this.model = options.model ?? null;
    this.editor = options.editor ?? null;
    this.addClass('jp-Completer');
    this.addClass('jp-ThemedContainer');
    this._updateConstraints();
  }

  /**
   * Cache style constraints from CSS.
   */
  protected _updateConstraints() {
    const tempNode = document.createElement('div');
    tempNode.classList.add(LIST_CLASS);
    tempNode.style.visibility = 'hidden';
    tempNode.style.overflowY = 'scroll';
    document.body.appendChild(tempNode);
    const computedStyle = window.getComputedStyle(tempNode);
    this._maxHeight = parseInt(computedStyle.maxHeight, 10);
    this._minHeight = parseInt(computedStyle.minHeight, 10);
    this._scrollbarWidth = tempNode.offsetWidth - tempNode.clientWidth;
    document.body.removeChild(tempNode);
    const tempDocPanel = this._createDocPanelNode();
    this._docPanelWidth = Private.measureSize(
      tempDocPanel,
      'inline-block'
    ).width;
  }

  /**
   * The sanitizer used to sanitize untrusted HTML inputs.
   */
  readonly sanitizer: IRenderMime.ISanitizer;

  /**
   * The active index.
   */
  get activeIndex(): number {
    return this._activeIndex;
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
   * A signal emitted when a selection is made from the completer menu.
   */
  get selected(): ISignal<this, string> {
    return this._selected;
  }

  /**
   * A signal emitted when the completer widget's visibility changes.
   *
   * #### Notes
   * This signal is useful when there are multiple floating widgets that may
   * contend with the same space and ought to be mutually exclusive.
   */
  get visibilityChanged(): ISignal<this, void> {
    return this._visibilityChanged;
  }

  /**
   * A signal emitted when the active index changes.
   */
  get indexChanged(): ISignal<this, number> {
    return this._indexChanged;
  }

  /**
   * The model used by the completer widget.
   */
  get model(): Completer.IModel | null {
    return this._model;
  }
  set model(model: Completer.IModel | null) {
    if ((!model && !this._model) || model === this._model) {
      return;
    }
    if (this._model) {
      this._model.stateChanged.disconnect(this.onModelStateChanged, this);
      this._model.queryChanged.disconnect(this.onModelQueryChanged, this);
    }
    this._model = model;
    if (this._model) {
      this._model.stateChanged.connect(this.onModelStateChanged, this);
      this._model.queryChanged.connect(this.onModelQueryChanged, this);
    }
  }

  /**
   * The completer used by the completer widget.
   */
  get renderer(): Completer.IRenderer {
    return this._renderer;
  }
  set renderer(renderer: Completer.IRenderer) {
    this._renderer = renderer;
  }

  /**
   * Enable/disable the document panel.
   */
  set showDocsPanel(showDoc: boolean) {
    this._showDoc = showDoc;
  }

  get showDocsPanel(): boolean {
    return this._showDoc;
  }

  /**
   * Whether to suppress the tab completer when inline completions are presented.
   */
  suppressIfInlineCompleterActive: boolean;

  /**
   * Dispose of the resources held by the completer widget.
   */
  dispose(): void {
    this._sizeCache = undefined;
    this._model = null;
    super.dispose();
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
      case 'keydown':
        this._evtKeydown(event as KeyboardEvent);
        break;
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
   * Reset the widget.
   */
  reset(): void {
    this._activeIndex = 0;
    this._lastSubsetMatch = '';
    if (this._model) {
      this._model.reset(true);
    }
    this._docPanel.style.display = 'none';
    // Clear size cache.
    this._sizeCache = undefined;
    this.node.scrollTop = 0;
  }

  /**
   * Emit the selected signal for the current active item and reset.
   */
  selectActive(): void {
    const active = this.node.querySelector(`.${ACTIVE_CLASS}`) as HTMLElement;
    if (!active) {
      this.reset();
      return;
    }
    this._selected.emit(active.getAttribute('data-value') as string);
    this.reset();
  }

  /**
   * Handle `after-attach` messages for the widget.
   */
  protected onAfterAttach(msg: Message): void {
    document.addEventListener('keydown', this, USE_CAPTURE);
    document.addEventListener('pointerdown', this, USE_CAPTURE);
    document.addEventListener('scroll', this, USE_CAPTURE);
  }

  /**
   * Handle `before-detach` messages for the widget.
   */
  protected onBeforeDetach(msg: Message): void {
    document.removeEventListener('keydown', this, USE_CAPTURE);
    document.removeEventListener('pointerdown', this, USE_CAPTURE);
    document.removeEventListener('scroll', this, USE_CAPTURE);
  }

  /**
   * Handle model state changes.
   */
  protected onModelStateChanged(): void {
    if (this.isAttached) {
      this._activeIndex = 0;
      this._indexChanged.emit(this._activeIndex);
      this.update();
    }
  }

  /**
   * Handle model query changes.
   */
  protected onModelQueryChanged(
    model: Completer.IModel,
    queryChange: Completer.IQueryChange
  ): void {
    // If query was changed by the user typing, the filtered down items
    // may no longer reach/exceed the maxHeight of the completer widget,
    // hence size needs to be recalculated.
    if (this._sizeCache && queryChange.origin === 'editorUpdate') {
      const newItems = model.completionItems();
      const oldItems = this._sizeCache.items;
      // Only reset size if the number of items changed, or the longest item changed.
      const oldWidest = oldItems[this._findWidestItemIndex(oldItems)];
      const newWidest = newItems[this._findWidestItemIndex(newItems)];
      const heuristic = this._getPreferredItemWidthHeuristic();
      if (
        newItems.length !== this._sizeCache.items.length ||
        heuristic(oldWidest) !== heuristic(newWidest)
      ) {
        this._sizeCache = undefined;
      }
    }
  }

  /**
   * Handle `update-request` messages.
   */
  protected onUpdateRequest(msg: Message): void {
    const model = this._model;
    if (!model) {
      return;
    }

    // If this is the first time the current completer session has loaded,
    // populate any initial subset match. This is being done before node
    // gets rendered to avoid rendering it twice.
    if (!model.query) {
      this._populateSubset();
    }

    let items = model.completionItems();

    // If there are no items, reset and bail.
    if (!items.length) {
      if (!this.isHidden) {
        this.reset();
        this.hide();
        this._visibilityChanged.emit(undefined);
      }
      return;
    }

    // Update constraints before any DOM modifications
    this._updateConstraints();

    // Do not trigger any geometry updates from async code when in lock.
    this._geometryLock = true;

    const node = this._createCompleterNode(model, items);

    let active = node.querySelectorAll(`.${ITEM_CLASS}`)[
      this._activeIndex
    ] as HTMLElement;
    active.classList.add(ACTIVE_CLASS);

    const resolvedItem = this.model?.resolveItem(items[this._activeIndex]);

    // Add the documentation panel
    if (this._showDoc) {
      this._docPanel.innerText = '';
      node.appendChild(this._docPanel);
      this._docPanelExpanded = false;
      this._docPanel.style.display = 'none';
      this._updateDocPanel(resolvedItem, active);
    }

    if (this.isHidden) {
      this.show();
      this._setGeometry();
      this._visibilityChanged.emit(undefined);
    } else {
      this._setGeometry();
    }
    this._geometryLock = false;
  }

  /**
   * Get cached dimensions of the completer box.
   */
  protected get sizeCache(): Completer.IDimensions | undefined {
    if (!this._sizeCache) {
      return;
    }
    return {
      width: this._sizeCache.width + this._sizeCache.docPanelWidth,
      height: Math.max(this._sizeCache.height, this._sizeCache.docPanelHeight)
    };
  }

  private _createDocPanelNode() {
    const docPanel = document.createElement('div');
    docPanel.className = DOC_PANEL_CLASS;
    return docPanel;
  }

  private _createCompleterNode(
    model: Completer.IModel,
    items: CompletionHandler.ICompletionItems
  ): HTMLElement {
    const current = ++this._renderCounter;

    // Clear the node.
    let node = this.node;
    node.textContent = '';

    // Compute an ordered list of all the types in the typeMap, this is computed
    // once by the model each time new data arrives for efficiency.
    let orderedTypes = model.orderedTypes();

    // Populate the completer items.
    let ul = document.createElement('ul');
    ul.className = LIST_CLASS;

    // Add first N items to fill the first "page" assuming that the completer
    // would reach its maximum allowed height.
    const first = this._renderer.createCompletionItemNode(
      items[0],
      orderedTypes
    );
    const renderedItems = [first];

    const firstItemSize = Private.measureSize(first, 'inline-grid');
    const pageSize = Math.max(
      Math.ceil(this._maxHeight / firstItemSize.height),
      5
    );
    // We add one item in case if height heuristic is inaccurate.
    const toRenderImmediately = Math.min(pageSize + 1, items.length);

    const start = performance.now();
    for (let i = 1; i < toRenderImmediately; i++) {
      const li = this._renderer.createCompletionItemNode(
        items[i],
        orderedTypes
      );
      renderedItems.push(li);
    }

    for (const li of renderedItems) {
      ul.appendChild(li);
    }

    // Pre-calculate size:
    //  - height will equal first element height times number of items,
    //    or maximum allowed height if there are more items than fit on a page,
    //  - width will be estimated from the widest item.
    const widestItemIndex = this._findWidestItemIndex(items);
    const widestItem =
      widestItemIndex < renderedItems.length
        ? renderedItems[widestItemIndex]
        : this._renderer.createCompletionItemNode(
            items[widestItemIndex],
            orderedTypes
          );

    // The node needs to be cloned to avoid side-effect of detaching it.
    const widestItemSize = Private.measureSize(
      widestItem.cloneNode(true) as HTMLElement,
      'inline-grid'
    );

    this._sizeCache = {
      height: Math.min(this._maxHeight, firstItemSize.height * items.length),
      width: widestItemSize.width + this._scrollbarWidth,
      items: items,
      docPanelWidth: 0,
      docPanelHeight: 0
    };

    if (toRenderImmediately < items.length) {
      // Render remaining items on idle in subsequent animation frames,
      // in chunks of size such that each frame would take about 16ms
      // allowing for 4ms of overhead, but keep the chunks no smaller
      // than 5 items at a time.
      const timePerItem = (performance.now() - start) / toRenderImmediately;

      const chunkSize = Math.max(5, Math.floor(12 / timePerItem));

      let alreadyRendered = toRenderImmediately;
      let previousChunkFinal = renderedItems[renderedItems.length - 1];

      const renderChunk = () => {
        if (alreadyRendered >= items.length) {
          return;
        }
        // Add a filler so that the list with partially rendered items has the total
        // height equal to the (predicted) final height to avoid scrollbar jitter.
        const predictedMissingHeight =
          firstItemSize.height * (items.length - alreadyRendered);
        previousChunkFinal.style.marginBottom = `${predictedMissingHeight}px`;

        requestAnimationFrame(() => {
          if (current != this._renderCounter) {
            // Bail if rendering afresh was requested in the meantime.
            return;
          }
          previousChunkFinal.style.marginBottom = '';
          const limit = Math.min(items.length, alreadyRendered + chunkSize);
          for (let i = alreadyRendered; i < limit; i++) {
            const li = this._renderer.createCompletionItemNode(
              items[i],
              orderedTypes
            );
            ul.appendChild(li);
            previousChunkFinal = li;
          }
          alreadyRendered = limit;

          renderChunk();
        });
      };
      renderChunk();
    }

    node.appendChild(ul);
    return node;
  }

  /**
   * Use preferred heuristic to find the index of the widest item.
   */
  private _findWidestItemIndex(
    items: CompletionHandler.ICompletionItems
  ): number {
    const widthHeuristic = this._getPreferredItemWidthHeuristic();

    const widthHeuristics = items.map(widthHeuristic);
    return widthHeuristics.indexOf(Math.max(...widthHeuristics));
  }

  /**
   * Get item width heuristic function from renderer if available,
   * or the default one otherwise.
   */
  private _getPreferredItemWidthHeuristic(): (
    item: CompletionHandler.ICompletionItem
  ) => number {
    return this._renderer.itemWidthHeuristic
      ? this._renderer.itemWidthHeuristic.bind(this._renderer)
      : this._defaultRenderer.itemWidthHeuristic.bind(this._defaultRenderer);
  }

  /**
   * Cycle through the available completer items.
   *
   * #### Notes
   * When the user cycles all the way `down` to the last index, subsequent
   * `down` cycles will cycle to the first index. When the user cycles `up` to
   * the first item, subsequent `up` cycles will cycle to the last index.
   */
  private _cycle(direction: Private.scrollType): void {
    const items = this.node.querySelectorAll(`.${ITEM_CLASS}`);
    const index = this._activeIndex;
    const last = items.length - 1;
    let active = this.node.querySelector(`.${ACTIVE_CLASS}`) as HTMLElement;
    active.classList.remove(ACTIVE_CLASS);

    switch (direction) {
      case 'up':
        this._activeIndex = index === 0 ? last : index - 1;
        break;
      case 'down':
        this._activeIndex = index < last ? index + 1 : 0;
        break;
      case 'pageUp':
      case 'pageDown': {
        // Measure the number of items on a page and clamp to the list length.
        const container = this.node.getBoundingClientRect();
        const current = active.getBoundingClientRect();
        const page = Math.floor(container.height / current.height);
        const sign = direction === 'pageUp' ? -1 : 1;
        this._activeIndex = Math.min(Math.max(0, index + sign * page), last);
        break;
      }
    }

    active = items[this._activeIndex] as HTMLElement;
    active.classList.add(ACTIVE_CLASS);
    let completionList = this.node.querySelector(`.${LIST_CLASS}`) as Element;
    ElementExt.scrollIntoViewIfNeeded(completionList, active);
    this._indexChanged.emit(this._activeIndex);
    const visibleCompletionItems = this.model?.completionItems();
    const activeCompletionItem = visibleCompletionItems?.[this._activeIndex];
    if (activeCompletionItem) {
      const resolvedItem = this.model?.resolveItem(activeCompletionItem);
      if (this._showDoc) {
        this._updateDocPanel(resolvedItem, active);
      }
    }
  }

  /**
   * Handle keydown events for the widget.
   */
  private _evtKeydown(event: KeyboardEvent) {
    if (this.isHidden || !this._editor) {
      return;
    }
    if (!this._editor.host.contains(event.target as HTMLElement)) {
      this.reset();
      return;
    }
    switch (event.keyCode) {
      case 9: {
        // Tab key
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        const model = this._model;
        if (!model) {
          return;
        }
        // Autoinsert single completions on manual request (tab)
        const items = model.completionItems();
        if (items && items.length === 1) {
          this._selected.emit(items[0].insertText || items[0].label);
          this.reset();
          return;
        }
        const populated = this._populateSubset();

        // If the common subset was found and set on `query`,
        // or if there is a `query` in the initialization options,
        // then emit a completion signal with that `query` (=subset match),
        // but only if the query has actually changed.
        // See: https://github.com/jupyterlab/jupyterlab/issues/10439#issuecomment-875189540
        if (model.query && model.query !== this._lastSubsetMatch) {
          model.subsetMatch = true;
          this._selected.emit(model.query);
          model.subsetMatch = false;
          this._lastSubsetMatch = model.query;
        }

        // If the query changed, update rendering of the options.
        if (populated) {
          this.update();
        }

        this._cycle(event.shiftKey ? 'up' : 'down');
        return;
      }
      case 27: // Esc key
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        this.reset();
        return;
      case 33: // PageUp
      case 34: // PageDown
      case 38: // Up arrow key
      case 40: {
        // Down arrow key
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        const cycle = Private.keyCodeMap[event.keyCode];
        this._cycle(cycle);
        return;
      }
      default:
        return;
    }
  }

  /**
   * Handle mousedown events for the widget.
   */
  private _evtPointerdown(event: PointerEvent) {
    if (this.isHidden || !this._editor) {
      return;
    }
    if (Private.nonstandardClick(event)) {
      this.reset();
      return;
    }

    let target = event.target as HTMLElement;
    while (target !== document.documentElement) {
      // If the user has made a selection, emit its value and reset the widget.
      if (target.classList.contains(ITEM_CLASS)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        this._selected.emit(target.getAttribute('data-value') as string);
        this.reset();
        return;
      }

      // If the mouse event happened anywhere else in the widget, bail.
      if (target === this.node) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return;
      }

      target = target.parentElement as HTMLElement;
    }
    this.reset();
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

  /**
   * Populate the completer up to the longest initial subset of items.
   *
   * @returns `true` if a subset match was found and populated.
   */
  private _populateSubset(): boolean {
    const { model } = this;

    if (!model) {
      return false;
    }

    const items = model.completionItems();
    const subset = Private.commonSubset(
      items.map(item => item.insertText || item.label)
    );
    const { query } = model;

    // If a common subset exists and it is not the current query, highlight it.
    if (subset && subset !== query && subset.indexOf(query) === 0) {
      model.query = subset;

      return true;
    }

    return false;
  }

  /**
   * Set the visible dimensions of the widget.
   */
  private _setGeometry(): void {
    const { node } = this;
    const model = this._model;
    const editor = this._editor;

    // This is an overly defensive test: `cursor` will always exist if
    // `original` exists, except in contrived tests. But since it is possible
    // to generate a runtime error, the check occurs here.
    if (!editor || !model || !model.original || !model.cursor) {
      return;
    }

    const start = model.cursor.start;
    const position = editor.getPositionAt(start) as CodeEditor.IPosition;
    const anchor = editor.getCoordinateForPosition(position);

    if (!anchor) {
      return;
    }

    const style = window.getComputedStyle(node);
    const borderLeft = parseInt(style.borderLeftWidth!, 10) || 0;
    const paddingLeft = parseInt(style.paddingLeft!, 10) || 0;

    // When the editor is attached to the main area, contain the completer hover box
    // to the full area available (rather than to the editor itself); the available
    // area excludes the toolbar, hence the first Widget child between MainAreaWidget
    // and editor is preferred. The difference is negligible in File Editor, but
    // substantial for Notebooks.
    const host =
      (editor.host.closest('.jp-MainAreaWidget > .lm-Widget') as HTMLElement) ||
      editor.host;

    const items = model.completionItems();

    // Fast cache invalidation (only checks for length rather than length + width)
    if (this._sizeCache && this._sizeCache.items.length !== items.length) {
      this._sizeCache = undefined;
    }

    // Calculate the geometry of the completer.
    HoverBox.setGeometry({
      anchor,
      host: host,
      maxHeight: this._maxHeight,
      minHeight: this._minHeight,
      node: node,
      size: this.sizeCache,
      offset: { horizontal: borderLeft + paddingLeft },
      privilege: 'below',
      style: style,
      outOfViewDisplay: {
        top: 'stick-inside',
        bottom: 'stick-inside',
        left: 'stick-inside',
        right: 'stick-outside'
      }
    });
    const current = ++this._geometryCounter;
    if (!this._sizeCache) {
      // If size was not pre-calculated using heuristics, save the actual
      // size into cache once rendered.
      requestAnimationFrame(() => {
        if (current != this._geometryCounter) {
          // Do not set size to cache if it may already be outdated.
          return;
        }
        let rect = node.getBoundingClientRect();
        let panel = this._docPanel.getBoundingClientRect();
        this._sizeCache = {
          width: rect.width - panel.width,
          height: rect.height,
          items: items,
          docPanelWidth: panel.width,
          docPanelHeight: panel.height
        };
      });
    }
  }

  /**
   * Update the display-state and contents of the documentation panel
   */
  private _updateDocPanel(
    resolvedItem: Promise<CompletionHandler.ICompletionItem | null> | undefined,
    activeNode: HTMLElement
  ): void {
    let docPanel = this._docPanel;

    if (!resolvedItem) {
      this._toggleDocPanel(false);
      return;
    }

    const loadingIndicator =
      this._renderer.createLoadingDocsIndicator?.() ??
      this._defaultRenderer.createLoadingDocsIndicator();
    activeNode.appendChild(loadingIndicator);

    resolvedItem
      .then(activeItem => {
        if (!activeItem) {
          return;
        }
        if (!docPanel) {
          return;
        }
        if (activeItem.documentation) {
          const node =
            this._renderer.createDocumentationNode?.(activeItem) ??
            this._defaultRenderer.createDocumentationNode(activeItem);
          docPanel.textContent = '';
          docPanel.appendChild(node);
          this._toggleDocPanel(true);
        } else {
          this._toggleDocPanel(false);
        }
      })
      .catch(e => console.error(e))
      .finally(() => {
        activeNode.removeChild(loadingIndicator);
      });
  }

  private _toggleDocPanel(show: boolean): void {
    let docPanel = this._docPanel;

    if (show) {
      if (this._docPanelExpanded) {
        return;
      }
      docPanel.style.display = '';
      this._docPanelExpanded = true;
    } else {
      if (!this._docPanelExpanded) {
        return;
      }
      docPanel.style.display = 'none';
      this._docPanelExpanded = false;
    }
    const sizeCache = this._sizeCache;
    if (sizeCache) {
      sizeCache.docPanelHeight = show ? this._maxHeight : 0;
      sizeCache.docPanelWidth = show ? this._docPanelWidth : 0;
      if (!this._geometryLock) {
        this._setGeometry();
      }
    }
  }

  private _activeIndex = 0;
  private _editor: CodeEditor.IEditor | null | undefined = null;
  private _model: Completer.IModel | null = null;
  private _renderer: Completer.IRenderer;
  private _defaultRenderer: Completer.Renderer;
  private _selected = new Signal<this, string>(this);
  private _visibilityChanged = new Signal<this, void>(this);
  private _indexChanged = new Signal<this, number>(this);
  private _lastSubsetMatch: string = '';
  private _showDoc: boolean;
  private _sizeCache: Private.IDimensionsCache | undefined;

  /**
   * The maximum height of a completer widget.
   */
  private _maxHeight: number;

  /**
   * The minimum height of a completer widget.
   */
  private _minHeight: number;

  private _scrollbarWidth: number;
  private _docPanelWidth: number;
  private _docPanel: HTMLElement;
  private _geometryLock = false;

  /**
   * Increasing this counter invalidates previous request to save geometry cache in animation callback.
   */
  private _geometryCounter: number = 0;

  private _docPanelExpanded = false;
  private _renderCounter: number = 0;
}

export namespace Completer {
  /**
   * A type map that may add type annotations to completer matches.
   */
  export type TypeMap = { [index: string]: string | null };

  /**
   * The initialization options for a completer widget.
   */
  export interface IOptions {
    /**
     * The semantic parent of the completer widget, its referent editor.
     */
    editor?: CodeEditor.IEditor | null;

    /**
     * The model for the completer widget.
     */
    model?: IModel;

    /**
     * The renderer for the completer widget nodes.
     */
    renderer?: IRenderer;

    /**
     * Flag to show or hide the document panel.
     */
    showDoc?: boolean;

    /**
     * Sanitizer used to sanitize html strings
     */
    sanitizer?: IRenderMime.ISanitizer;
  }

  /**
   * An interface for a completion request reflecting the state of the editor.
   */
  export interface ITextState extends JSONObject {
    /**
     * The current value of the editor.
     */
    readonly text: string;

    /**
     * The line number of the editor cursor.
     */
    readonly line: number;

    /**
     * The character number of the editor cursor within a line.
     */
    readonly column: number;
  }

  /**
   * Information about the query string change.
   */
  export interface IQueryChange {
    /**
     * The new value of the query.
     */
    newValue: string;
    /**
     * The event which caused the query to change, one of:
     * - `editorUpdate`: as a result of editor change, e.g. user typing code,
     * - `setter`: programmatically, e.g. by the logic in the widget,
     * - `reset`: due to completer model being reset.
     */
    origin: 'setter' | 'editorUpdate' | 'reset';
  }

  /**
   * The data model backing a code completer widget.
   */
  export interface IModel extends IDisposable {
    /**
     * A signal emitted when state of the completer model changes.
     */
    readonly stateChanged: ISignal<IModel, void>;

    /**
     * A signal emitted when query string changes (at invocation, or as user types).
     */
    readonly queryChanged: ISignal<IModel, IQueryChange>;

    /**
     * The current text state details.
     */
    current: ITextState | null;

    /**
     * The cursor details that the API has used to return matching options.
     */
    cursor: ICursorSpan | null;

    /**
     * A flag that is true when the model value was modified by a subset match.
     */
    subsetMatch: boolean;

    /**
     * The original completer request details.
     */
    original: ITextState | null;

    /**
     * The query against which items are filtered.
     */
    query: string;

    /**
     * Get the list of visible CompletionItems in the completer menu.
     */
    completionItems(): CompletionHandler.ICompletionItems;

    /**
     * Set the list of visible CompletionItems in the completer menu.
     */
    setCompletionItems(items: CompletionHandler.ICompletionItems): void;

    /**
     * Lazy load missing data of an item.
     * @param activeIndex - the item or its index
     * @remarks
     * Resolving item by index will be deprecated in
     * the next major release.
     *
     * @return Return `undefined` if the completion item with {@link activeIndex} index can not be found.
     *  Return a promise of `null` if another {@link resolveItem} is called. Otherwise return the
     * promise of resolved completion item.
     */
    resolveItem(
      activeIndex: number | CompletionHandler.ICompletionItem
    ): Promise<CompletionHandler.ICompletionItem | null> | undefined;

    /**
     * The map from identifiers (`a.b`) to their types (function, module, class,
     * instance, etc.).
     */
    typeMap(): TypeMap;

    /**
     * An ordered list of types used for visual encoding.
     */
    orderedTypes(): string[];

    /**
     * Handle a cursor change.
     */
    handleCursorChange(change: Completer.ITextState): void;

    /**
     * Handle a completion request.
     */
    handleTextChange(change: Completer.ITextState): void;

    /**
     * Create a resolved patch between the original state and a patch string.
     */
    createPatch(patch: string): IPatch | undefined;

    /**
     * Reset the state of the model and emit a state change signal.
     *
     * @param hard - Reset even if a subset match is in progress.
     */
    reset(hard?: boolean): void;
  }

  /**
   * An object describing a completion option injection into text.
   */
  export interface IPatch {
    /**
     * The start of the range to be patched.
     */
    start: number;

    /**
     * The end of the range to be patched.
     */
    end: number;

    /**
     * The value to be patched in.
     */
    value: string;
  }

  /**
   * A cursor span.
   */
  export interface ICursorSpan extends JSONObject {
    /**
     * The start position of the cursor.
     */
    start: number;

    /**
     * The end position of the cursor.
     */
    end: number;
  }

  /**
   * A renderer for completer widget nodes.
   */
  export interface IRenderer<
    T extends
      CompletionHandler.ICompletionItem = CompletionHandler.ICompletionItem
  > {
    /**
     * Create an item node (an `li` element) from a ICompletionItem
     * for a text completer menu.
     *
     * #### Notes
     * The item provided to renderer is already pre-processed by the model:
     * - the `label` is escaped to ensure that no user-generated HTML is included;
     *   if `insertText` was not originally provided, it is set to raw `label`
     *   (prior to escaping) if needed,
     * - if there were any matches against the query the `label` has them
     *    highlighted with `<mark>`s.
     */
    createCompletionItemNode(item: T, orderedTypes: string[]): HTMLLIElement;

    /**
     * Create a documentation node (a `pre` element by default) for
     * documentation panel.
     */
    createDocumentationNode?(activeItem: T): HTMLElement;

    /**
     * Create a loading indicator element for document panel.
     */
    createLoadingDocsIndicator?(): HTMLElement;

    /**
     * Get a heuristic for the width of an item.
     *
     * As a performance optimization completer will infer the hover box width
     * from the widest item node which will be rendered before all other nodes.
     * By default the widest item is selected based on label length heuristic;
     * renderers which customize item rendering can use this method to provide
     * a custom heuristic.
     */
    itemWidthHeuristic?(a: T): number;
  }

  /**
   * A namespace for the default renderer.
   */
  export namespace Renderer {
    export interface IOptions {
      /**
       * The sanitizer used to sanitize untrusted HTML inputs.
       */
      sanitizer?: IRenderMime.ISanitizer;
    }
  }

  /**
   * The default implementation of an `IRenderer`.
   */
  export class Renderer implements IRenderer {
    constructor(options?: Renderer.IOptions) {
      this.sanitizer = options?.sanitizer || new Sanitizer();
    }

    /**
     * The sanitizer used to sanitize untrusted HTML inputs.
     */
    readonly sanitizer: IRenderMime.ISanitizer;

    /**
     * Create an item node from an ICompletionItem for a text completer menu.
     */
    createCompletionItemNode(
      item: CompletionHandler.ICompletionItem,
      orderedTypes: string[]
    ): HTMLLIElement {
      let wrapperNode = this._createWrapperNode(item.insertText || item.label);
      if (item.deprecated) {
        wrapperNode.classList.add('jp-Completer-deprecated');
      }
      return this._constructNode(
        wrapperNode,
        this._createLabelNode(item.label),
        !!item.type,
        item.type,
        orderedTypes,
        item.icon
      );
    }

    /**
     * Create a documentation node for documentation panel.
     */
    createDocumentationNode(
      activeItem: CompletionHandler.ICompletionItem
    ): HTMLElement {
      const host = document.createElement('div');
      host.classList.add('jp-RenderedText');
      const sanitizer = this.sanitizer;
      const source = activeItem.documentation || '';

      renderText({ host, sanitizer, source }).catch(console.error);
      return host;
    }

    /**
     * Get a heuristic for the width of an item.
     */
    itemWidthHeuristic(item: CompletionHandler.ICompletionItem): number {
      // Get the label text without HTML markup (`<mark>` is the only markup
      // that is allowed in processed items, everything else gets escaped).
      const labelText = item.label.replace(/<(\/)?mark>/g, '');
      return labelText.length + (item.type?.length || 0);
    }

    /**
     * Create a loading bar for the documentation panel.
     */
    createLoadingDocsIndicator(): HTMLElement {
      const loadingContainer = document.createElement('div');
      loadingContainer.classList.add('jp-Completer-loading-bar-container');
      const loadingBar = document.createElement('div');
      loadingBar.classList.add('jp-Completer-loading-bar');
      loadingContainer.append(loadingBar);
      return loadingContainer;
    }

    /**
     * Create base node with the value to be inserted.
     */
    private _createWrapperNode(value: string): HTMLLIElement {
      const li = document.createElement('li');
      li.className = ITEM_CLASS;
      // Set the raw, un-marked up value as a data attribute.
      li.setAttribute('data-value', value);
      return li;
    }

    /**
     * Create match node to highlight potential prefix match within result.
     */
    private _createLabelNode(result: string): HTMLElement {
      const matchNode = document.createElement('code');
      matchNode.className = 'jp-Completer-match';
      // Use innerHTML because search results include <mark> tags.
      matchNode.innerHTML = result;
      return matchNode;
    }

    /**
     * Attaches type and match nodes to base node.
     */
    private _constructNode(
      li: HTMLLIElement,
      matchNode: HTMLElement,
      typesExist: boolean,
      type: any,
      orderedTypes: string[],
      icon?: LabIcon
    ): HTMLLIElement {
      // Add the icon or type monogram
      if (icon) {
        const iconNode = icon.element({
          className: 'jp-Completer-type jp-Completer-icon'
        });
        li.appendChild(iconNode);
      } else if (typesExist) {
        const typeNode = document.createElement('span');
        typeNode.textContent = (type[0] || '').toLowerCase();
        const colorIndex = (orderedTypes.indexOf(type) % N_COLORS) + 1;
        typeNode.className = 'jp-Completer-type jp-Completer-monogram';
        typeNode.setAttribute(`data-color-index`, colorIndex.toString());
        li.appendChild(typeNode);
      } else {
        // Create empty span to ensure consistent list styling.
        // Otherwise, in a list of two items,
        // if one item has an icon, but the other has type,
        // the icon grows out of its bounds.
        const dummyNode = document.createElement('span');
        dummyNode.className = 'jp-Completer-monogram';
        li.appendChild(dummyNode);
      }

      li.appendChild(matchNode);

      // If there is a type, add the type extension and title
      if (typesExist) {
        li.title = type;
        const typeExtendedNode = document.createElement('code');
        typeExtendedNode.className = 'jp-Completer-typeExtended';
        typeExtendedNode.textContent = type.toLocaleLowerCase();
        li.appendChild(typeExtendedNode);
      } else {
        // If no type is present on the right,
        // the highlighting of the completion item
        // doesn't cover the entire row.
        const dummyTypeExtendedNode = document.createElement('span');
        dummyTypeExtendedNode.className = 'jp-Completer-typeExtended';
        li.appendChild(dummyTypeExtendedNode);
      }
      return li;
    }
  }

  /**
   * Default renderer
   */
  let _defaultRenderer: Renderer;

  /**
   * The default `IRenderer` instance.
   */
  export function getDefaultRenderer(
    sanitizer?: IRenderMime.ISanitizer
  ): Renderer {
    if (
      !_defaultRenderer ||
      (sanitizer && _defaultRenderer.sanitizer !== sanitizer)
    ) {
      _defaultRenderer = new Renderer({ sanitizer: sanitizer });
    }
    return _defaultRenderer;
  }

  /**
   * Pre-calculated dimensions of the completer widget box.
   */
  export interface IDimensions {
    /**
     * The total width including the documentation panel if visible.
     */
    width: number;
    /**
     * The total height of the visible part of the completer.
     */
    height: number;
  }
}

/**
 * A namespace for completer widget private data.
 */
namespace Private {
  /**
   * Types of scrolling through the completer.
   */
  export type scrollType = 'up' | 'down' | 'pageUp' | 'pageDown';

  /**
   * Mapping from keyCodes to scrollTypes.
   */
  export const keyCodeMap: { [n: number]: scrollType } = {
    38: 'up',
    40: 'down',
    33: 'pageUp',
    34: 'pageDown'
  };

  /**
   * Returns the common subset string that a list of strings shares.
   */
  export function commonSubset(values: string[]): string {
    const len = values.length;
    let subset = '';
    if (len < 2) {
      return subset;
    }
    const strlen = values[0].length;
    for (let i = 0; i < strlen; i++) {
      const ch = values[0][i];
      for (let j = 1; j < len; j++) {
        if (values[j][i] !== ch) {
          return subset;
        }
      }
      subset += ch;
    }
    return subset;
  }

  /**
   * Returns true for any modified click event (i.e., not a left-click).
   */
  export function nonstandardClick(event: MouseEvent): boolean {
    return (
      event.button !== 0 ||
      event.altKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.metaKey
    );
  }

  /**
   * Measure size of provided HTML element without painting it.
   *
   * #### Notes
   * The provided element has to be detached (not connected to DOM),
   * or a side-effect of detaching it will occur.
   */
  export function measureSize(element: HTMLElement, display: string): DOMRect {
    if (element.isConnected) {
      console.warn(
        'Measuring connected elements with `measureSize` has side-effects'
      );
    }
    element.style.visibility = 'hidden';
    element.style.display = display;
    document.body.appendChild(element);
    const size = element.getBoundingClientRect();
    document.body.removeChild(element);
    element.removeAttribute('style');
    return size;
  }

  export interface IDimensionsCache extends Completer.IDimensions {
    /**
     * The items for which the cache was most originally computed.
     */
    items: CompletionHandler.ICompletionItems;
    /**
     * The width of documentation panel.
     */
    docPanelWidth: number;
    /**
     * The height of documentation panel.
     */
    docPanelHeight: number;
  }
}
