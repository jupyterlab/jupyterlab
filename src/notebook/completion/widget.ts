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
   * Create an item node for a text completion menu.
   */
  static createItemNode(item: ICompletionItem): HTMLElement {
    let li = document.createElement('li');
    let code = document.createElement('code');

    // Set the raw, un-marked up value as a data attribute.
    li.dataset['value'] = item.raw;

    // Use innerHTML because search results include <mark> tags.
    code.innerHTML = item.text;

    li.className = ITEM_CLASS;
    li.appendChild(code);
    return li;
  }

  /**
   * Construct a text completion menu widget.
   */
  constructor(model: ICompletionModel) {
    super();
    this._model = model;
    this._model.stateChanged.connect(() => this.update(), this);
    this.addClass(COMPLETION_CLASS);
    this.update();
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

  /**
   * The semantic parent of the completion widget, its reference widget.
   */
  get reference(): Widget {
    return this._reference;
  }
  set reference(widget: Widget) {
    this._reference = widget;
  }

  /**
   * Dispose of the resources held by the completion widget.
   */
  dispose() {
    if (this.isDisposed) {
      return;
    }
    this._model.dispose();
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
   *
   * #### Notes
   * Captures window events in capture phase to dismiss or navigate the
   * completion widget.
   *
   * Because its parent (reference) widgets use window listeners instead of
   * document listeners, the completion widget must also use window listeners
   * in the capture phase.
   */
  protected onAfterAttach(msg: Message): void {
    window.addEventListener('keydown', this, USE_CAPTURE);
    window.addEventListener('mousedown', this, USE_CAPTURE);
    window.addEventListener('scroll', this, USE_CAPTURE);
  }

  /**
   * Handle `before_detach` messages for the widget.
   */
  protected onBeforeDetach(msg: Message): void {
    window.removeEventListener('keydown', this, USE_CAPTURE);
    window.removeEventListener('mousedown', this, USE_CAPTURE);
    window.removeEventListener('scroll', this, USE_CAPTURE);
  }

  /**
   * Handle `update_request` messages.
   */
  protected onUpdateRequest(msg: Message): void {
    let node = this.node;
    let items = this._model.items;
    let constructor = this.constructor as typeof CompletionWidget;
    node.textContent = '';

    // All repaints reset the index back to 0.
    this._activeIndex = 0;

    if (!items || !items.length) {
      this.hide();
      return;
    }

    for (let item of items) {
      node.appendChild(constructor.createItemNode(item));
    }

    let active = node.querySelectorAll(`.${ITEM_CLASS}`)[this._activeIndex];
    active.classList.add(ACTIVE_CLASS);

    if (this.isHidden) {
      this.show();
    }

    let coords = this._model.current ? this._model.current.coords
      : this._model.original.coords;
    let availableHeight = coords.top;
    let maxHeight = Math.min(availableHeight, MAX_HEIGHT);
    node.style.maxHeight = `${maxHeight}px`;

    // Account for 1px border width.
    let left = Math.floor(coords.left) + 1;
    let rect = node.getBoundingClientRect();
    let top = availableHeight - rect.height;
    node.style.left = `${left}px`;
    node.style.top = `${top}px`;
    node.style.width = 'auto';
    // Expand the menu width by the scrollbar size, if present.
    if (node.scrollHeight > maxHeight) {
      node.style.width = `${2 * node.offsetWidth - node.clientWidth}px`;
      node.scrollTop = 0;
    }
  }

  /**
   * Handle mousedown events for the widget.
   */
  private _evtMousedown(event: MouseEvent) {
    if (!this._reference || this.isHidden || Private.nonstandardClick(event)) {
      this.hide();
      return;
    }

    let target = event.target as HTMLElement;
    while (target !== document.documentElement) {
      // If the user has made a selection, emit its value and reset the model.
      if (target.classList.contains(ITEM_CLASS)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        this.selected.emit(target.dataset['value']);
        this._model.reset();
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
    this._model.reset();
  }

  /**
   * Handle keydown events for the widget.
   */
  private _evtKeydown(event: KeyboardEvent) {
    if (!this._reference || this.isHidden) {
      this.hide();
      return;
    }

    let target = event.target as HTMLElement;
    let node = this.node;
    let active: HTMLElement;
    while (target !== document.documentElement) {
      if (target === this._reference.node) {
        switch (event.keyCode) {
        case 13: // Enter key
        case 9: // Tab key
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          active = node.querySelector(`.${ACTIVE_CLASS}`) as HTMLElement;
          this.selected.emit(active.dataset['value']);
          this._model.reset();
          return;
        case 27: // Escape key
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          this._model.reset();
          return;
        case 38: // Up arrow key
        case 40: // Down arrow key
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          let items = this.node.querySelectorAll(`.${ITEM_CLASS}`);
          active = node.querySelector(`.${ACTIVE_CLASS}`) as HTMLElement;
          active.classList.remove(ACTIVE_CLASS);
          this._activeIndex = event.keyCode === 38 ?
            Math.max(--this._activeIndex, 0)
              : Math.min(++this._activeIndex, items.length - 1);
          active = items[this._activeIndex] as HTMLElement;
          active.classList.add(ACTIVE_CLASS);
          Private.scrollIfNeeded(this.node, active);
          return;
        default:
          return;
        }
      }
      target = target.parentElement;
    }
    this.hide();
  }

  /**
   * Handle scroll events for the widget
   */
  private _evtScroll(event: MouseEvent) {
    if (!this._reference || this.isHidden) {
      this.hide();
      return;
    }

    let target = event.target as HTMLElement;
    while (target !== document.documentElement) {
      // If the scroll event happened in the completion widget, allow it.
      if (target === this.node) {
        return;
      }
      target = target.parentElement;
    }
    this.hide();
  }

  private _activeIndex = 0;
  private _model: ICompletionModel = null;
  private _reference: Widget = null;
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
