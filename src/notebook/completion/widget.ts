// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Message
} from 'phosphor-messaging';

import {
  ISignal, Signal, clearSignalData
} from 'phosphor-signaling';

import {
  Widget
} from 'phosphor-widget';

import {
  ICompletionModel, ICompletionItem
} from './model';

/**
 * The class name added to completion menu widgets.
 */
const COMPLETION_CLASS = 'jp-Completion';

/**
 * The class name added to completion menu items.
 */
const ITEM_CLASS = 'jp-Completion-item';

/**
 * The class name added to an active completion menu item.
 */
const ACTIVE_CLASS = 'jp-mod-active';

/**
 * The class name added to a completion widget that is scrolled out of view.
 */
const OUTOFVIEW_CLASS = 'jp-mod-outofview'

/**
 * The minimum height of a completion widget.
 */
const MIN_HEIGHT = 75;

/**
 * The maximum height of a completion widget.
 */
const MAX_HEIGHT = 250;

/**
 * A flag to indicate that event handlers are caught in the capture phase.
 */
const USE_CAPTURE = true;


/**
 * A widget that enables text completion.
 */
export
class CompletionWidget extends Widget {
  /**
   * Create the DOM node for a text completion menu.
   */
  static createNode(): HTMLElement {
    let node = document.createElement('ul');
    return node;
  }

  /**
   * Construct a text completion menu widget.
   */
  constructor(options: CompletionWidget.IOptions = {}) {
    super();
    this._renderer = options.renderer || CompletionWidget.defaultRenderer;
    this.anchor = options.anchor || null;
    this.model = options.model || null;
    this.addClass(COMPLETION_CLASS);
  }


  /**
   * A signal emitted when a selection is made from the completion menu.
   */
  get selected(): ISignal<CompletionWidget, string> {
    return Private.selectedSignal.bind(this);
  }

  /**
   * The model used by the completion widget.
   *
   * #### Notes
   * This is a read-only property.
   */
  get model(): ICompletionModel {
    return this._model;
  }
  set model(model: ICompletionModel) {
    if (!model && !this._model || model === this._model) {
      return;
    }
    if (this._model) {
      this._model.stateChanged.disconnect(this.onModelStateChanged, this);
    }
    this._model = model;
    if (this._model) {
      this._model.stateChanged.connect(this.onModelStateChanged, this);
    }
  }

  /**
   * The semantic parent of the completion widget, its anchor element. An
   * event listener will peg the position of the completion widget to the
   * anchor element's scroll position. Other event listeners will guarantee
   * the completion widget behaves like a child of the reference element even
   * if it does not appear as a descendant in the DOM.
   */
  get anchor(): HTMLElement {
    return this._anchor;
  }
  set anchor(element: HTMLElement) {
    if (this._anchor === element) {
      return;
    }
    // Clean up scroll listener if anchor is being replaced.
    if (this._anchor) {
      this._anchor.removeEventListener('scroll', this, USE_CAPTURE);
    }

    this._anchor = element;

    // Add scroll listener to anchor element.
    if (this._anchor) {
      this._anchor.addEventListener('scroll', this, USE_CAPTURE);
    }
  }

  /**
   * Dispose of the resources held by the completion widget.
   */
  dispose() {
    if (this.isDisposed) {
      return;
    }
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
    if (this.isHidden || !this._anchor) {
      return;
    }
    switch (event.type) {
    case 'keydown':
      this._evtKeydown(event as KeyboardEvent);
      break;
    case 'mousedown':
      this._evtMousedown(event as MouseEvent);
      break;
    case 'scroll':
      this._evtScroll(event as MouseEvent);
      break;
    default:
      break;
    }
  }

  /**
   * Handle `after_attach` messages for the widget.
   */
  protected onAfterAttach(msg: Message): void {
    document.addEventListener('keydown', this, USE_CAPTURE);
    document.addEventListener('mousedown', this, USE_CAPTURE);
  }

  /**
   * Handle `before_detach` messages for the widget.
   */
  protected onBeforeDetach(msg: Message): void {
    document.removeEventListener('keydown', this, USE_CAPTURE);
    document.removeEventListener('mousedown', this, USE_CAPTURE);

    if (this._anchor) {
      this._anchor.removeEventListener('scroll', this, USE_CAPTURE);
    }
  }

  /**
   * Handle model state changes.
   */
  protected onModelStateChanged(): void {
    if (this.isAttached) {
      this.update();
    }
  }

  /**
   * Handle `update_request` messages.
   */
  protected onUpdateRequest(msg: Message): void {
    let model = this.model;
    if (!model) {
      return;
    }

    let items = model.items;

    // If there are no items, hide and bail.
    if (!items || !items.length) {
      this.hide();
      return;
    }

    // If there is only one item, signal and bail.
    if (items.length === 1) {
      this.selected.emit(items[0].raw);
      this._reset();
      return;
    }

    let node = this.node;
    node.textContent = '';

    for (let item of items) {
      let li = this._renderer.createItemNode(item);
      // Set the raw, un-marked up value as a data attribute.
      li.dataset['value'] = item.raw;
      node.appendChild(li);
    }

    let active = node.querySelectorAll(`.${ITEM_CLASS}`)[this._activeIndex];
    active.classList.add(ACTIVE_CLASS);

    if (this.isHidden) {
      this.show();
    }
    this._anchorPoint = this._anchor.scrollTop;
    this._setGeometry();
  }

  /**
   * Cycle through the available completion items.
   */
  private _cycle(direction: 'up' | 'down'): void {
    let items = this.node.querySelectorAll(`.${ITEM_CLASS}`);
    let index = this._activeIndex;
    let active = this.node.querySelector(`.${ACTIVE_CLASS}`) as HTMLElement;
    active.classList.remove(ACTIVE_CLASS);
    if (direction === 'up') {
      this._activeIndex = index === 0 ? items.length - 1 : index - 1;
    } else {
      this._activeIndex = index < items.length - 1 ? index + 1 : 0;
    }
    active = items[this._activeIndex] as HTMLElement;
    active.classList.add(ACTIVE_CLASS);
    Private.scrollIfNeeded(this.node, active);
  }

  /**
   * Handle keydown events for the widget.
   */
  private _evtKeydown(event: KeyboardEvent) {
    let target = event.target as HTMLElement;
    while (target !== document.documentElement) {
      if (target === this._anchor) {
        switch (event.keyCode) {
          case 9:  // Tab key
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            if (this._populateSubset()) {
              return;
            }
            this._selectActive();
            return;
          case 13: // Enter key
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            this._selectActive();
            return;
          case 27: // Escape key
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            this._reset();
            return;
          case 38: // Up arrow key
          case 40: // Down arrow key
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            this._cycle(event.keyCode === 38 ? 'up' : 'down');
            return;
          default:
            return;
        }
      }
      target = target.parentElement;
    }
    this._reset();
  }

  /**
   * Handle mousedown events for the widget.
   */
  private _evtMousedown(event: MouseEvent) {
    if (Private.nonstandardClick(event)) {
      this._reset();
      return;
    }

    let target = event.target as HTMLElement;
    while (target !== document.documentElement) {
      // If the user has made a selection, emit its value and reset the widget.
      if (target.classList.contains(ITEM_CLASS)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        this.selected.emit(target.dataset['value']);
        this._reset();
        return;
      }
      // If the mouse event happened anywhere else in the widget, bail.
      if (target === this.node) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return;
      }
      target = target.parentElement;
    }
    this._reset();
  }

  /**
   * Handle scroll events for the widget
   */
  private _evtScroll(event: MouseEvent) {
    if (this.isHidden) {
      return;
    }
    this._setGeometry();
  }

  /**
   * Populate the completion up to the longest initial subset of items.
   *
   * @returns `true` if a subset match was found and populated.
   */
  private _populateSubset(): boolean {
    let items = this.node.querySelectorAll(`.${ITEM_CLASS}`);
    let subset = Private.commonSubset(Private.itemValues(items));
    let query = this.model.query;
    if (subset && subset !== query && subset.indexOf(query) === 0) {
      this.model.query = subset;
      this.selected.emit(subset);
      this.update();
      return true;
    }
    return false;
  }

  /**
   * Reset the widget.
   */
  private _reset(): void {
    if (this._model) {
      this._model.reset();
    }
    this._activeIndex = 0;
    this._anchorPoint = 0;
  }

  /**
   * Set the visible dimensions of the widget.
   */
  private _setGeometry(): void {
    if (!this.model || !this._model.original) {
      return;
    }

    let node = this.node;
    let coords = this._model.current ? this._model.current.coords
      : this._model.original.coords;
    let scrollDelta = this._anchorPoint - this._anchor.scrollTop;
    let availableHeight = coords.top + scrollDelta;
    let maxHeight = Math.max(0, Math.min(availableHeight, MAX_HEIGHT));

    if (maxHeight > MIN_HEIGHT) {
      node.classList.remove(OUTOFVIEW_CLASS);
    } else {
      node.classList.add(OUTOFVIEW_CLASS);
      return;
    }
    node.style.maxHeight = `${maxHeight}px`;

    let border = parseInt(window.getComputedStyle(node).borderWidth, 10);
    let left = coords.left + border
    let rect = node.getBoundingClientRect();
    let top = availableHeight - rect.height;
    node.style.left = `${Math.floor(left)}px`;
    node.style.top = `${Math.floor(top)}px`;
    node.style.width = 'auto';

    // Expand the menu width by the scrollbar size, if present.
    if (node.scrollHeight > maxHeight) {
      node.style.width = `${2 * node.offsetWidth - node.clientWidth}px`;
      node.scrollTop = 0;
    }
  }

  /**
   * Emit the selected signal for the current active item and reset.
   */
  private _selectActive(): void {
    let active = this.node.querySelector(`.${ACTIVE_CLASS}`) as HTMLElement;
    if (!active) {
      return;
    }
    this.selected.emit(active.dataset['value']);
    this._reset();
  }

  private _anchor: HTMLElement = null;
  private _anchorPoint = 0;
  private _activeIndex = 0;
  private _model: ICompletionModel = null;
  private _renderer: CompletionWidget.IRenderer = null;
}


export
namespace CompletionWidget {
  /**
   * The initialization options for a completion widget.
   */
  export
  interface IOptions {
    /**
     * The model for the completion widget.
     */
    model?: ICompletionModel;

    /**
     * The semantic parent of the completion widget, its anchor element. An
     * event listener will peg the position of the completion widget to the
     * anchor element's scroll position. Other event listeners will guarantee
     * the completion widget behaves like a child of the reference element even
     * if it does not appear as a descendant in the DOM.
     */
    anchor?: HTMLElement;

    /**
     * The renderer for the completion widget nodes.
     */
    renderer?: IRenderer;
  }

  /**
   * A renderer for completion widget nodes.
   */
  export
  interface IRenderer {
    /**
     * Create an item node (an `li` element) for a text completion menu.
     */
    createItemNode(item: ICompletionItem): HTMLLIElement;
  }

  /**
   * The default implementation of an `IRenderer`.
   */
  export
  class Renderer implements IRenderer {
    /**
     * Create an item node for a text completion menu.
     */
    createItemNode(item: ICompletionItem): HTMLLIElement {
      let li = document.createElement('li');
      let code = document.createElement('code');

      // Use innerHTML because search results include <mark> tags.
      code.innerHTML = item.text;

      li.className = ITEM_CLASS;
      li.appendChild(code);
      return li;
    }
  }


  /**
   * The default `IRenderer` instance.
   */
  export
  const defaultRenderer = new Renderer();
}


/**
 * A namespace for completion widget private data.
 */
namespace Private {
  /**
   * A signal emitted when state of the completion menu changes.
   */
  export
  const selectedSignal = new Signal<CompletionWidget, string>();

  /**
   * Returns the common subset string that a list of strings shares.
   */
  export
  function commonSubset(values: string[]): string {
    let len = values.length;
    let subset = '';
    if (len < 2) {
      return subset;
    }
    let strlen = values[0].length;
    for (let i = 0; i < strlen; i++) {
      let ch = values[0][i];
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
   * Returns the list of raw item values currently in the DOM.
   */
  export
  function itemValues(items: NodeList): string[] {
    let values: string[] = [];
    for (let i = 0, len = items.length; i < len; i++) {
      values.push((items[i] as HTMLElement).dataset['value']);
    }
    return values;
  }

  /**
   * Returns true for any modified click event (i.e., not a left-click).
   */
  export
  function nonstandardClick(event: MouseEvent): boolean {
    return event.button !== 0 ||
      event.altKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.metaKey;
  }

  /**
   * Scroll an element into view if needed.
   *
   * @param area - The scroll area element.
   *
   * @param elem - The element of interest.
   */
  export
  function scrollIfNeeded(area: HTMLElement, elem: HTMLElement): void {
    let ar = area.getBoundingClientRect();
    let er = elem.getBoundingClientRect();
    if (er.top < ar.top - 10) {
      area.scrollTop -= ar.top - er.top + 10;
    } else if (er.bottom > ar.bottom + 10) {
      area.scrollTop += er.bottom - ar.bottom + 10;
    }
  }
}
