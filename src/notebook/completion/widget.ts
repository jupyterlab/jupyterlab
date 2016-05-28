// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  IKernel
} from 'jupyter-js-services';

import {
  Message
} from 'phosphor-messaging';

import {
  Widget
} from 'phosphor-widget';

import {
  ITextChange, ICompletionRequest, CellEditorWidget
} from '../cells/editor';

import {
  ICompletionModel, ICompletionItem, CompletionModel
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
 * A widget which provides text completions.
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
   * Create a new model for the widget.
   */
  static createModel(): ICompletionModel {
    return new CompletionModel();
  }

  /**
   * Construct a text completion menu widget.
   */
  constructor() {
    super();
    let constructor = this.constructor as typeof CompletionWidget;
    this._model = constructor.createModel();
    this._model.stateChanged.connect(() => this.update(), this);
    this.addClass(COMPLETION_CLASS);
    this.update();
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
   * The kernel used for handling completions.
   */
  get kernel(): IKernel {
    return this._kernel;
  }
  set kernel(value: IKernel) {
    this._kernel = value;
  }

  /**
   * The current code cell editor.
   */
  get editor(): CellEditorWidget {
    return this._editor;
  }
  set editor(value: CellEditorWidget) {
    // Remove existing signals.
    if (this._editor) {
      this._editor.completionRequested.disconnect(this.onCompletionRequest, this);
      this._editor.textChanged.disconnect(this.onTextChange, this);
    }
    this._editor = value;
    value.completionRequested.connect(this.onCompletionRequest, this);
    value.textChanged.connect(this.onTextChange, this);
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
    default:
      break;
    }
  }

  /**
   * Handle `after_attach` messages for the widget.
   *
   * #### Notes
   * Captures document events in capture phase to dismiss or navigate the
   * completion widget.
   */
  protected onAfterAttach(msg: Message): void {
    document.addEventListener('keydown', this, true);
    document.addEventListener('mousedown', this, true);
  }

  /**
   * Handle `before_detach` messages for the widget.
   */
  protected onBeforeDetach(msg: Message): void {
    document.removeEventListener('keydown', this);
    document.removeEventListener('mousedown', this);
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
    let top = maxHeight - rect.height;
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
   * Handle a completion request from the editor widget.
   */
  protected onCompletionRequest(widget: CellEditorWidget, args: ICompletionRequest): void {
    // Bail if there is no current kernel.
    if (!this._kernel) {
      return;
    }
    let contents = {
      // Only send the current line of code for completion.
      code: args.currentValue.split('\n')[args.line],
      cursor_pos: args.ch
    };
    let pendingComplete = ++this._pendingComplete;
    let model = this._model;
    this._kernel.complete(contents).then(value => {
      // If model has been disposed, bail.
      if (this.isDisposed) {
        return;
      }
      // If a newer completion requesy has created a pending request, bail.
      if (pendingComplete !== this._pendingComplete) {
        return;
      }
      // Completion request failures or negative results fail silently.
      if (value.status !== 'ok') {
        return;
      }
      // Update the model.
      model.options = value.matches;
      model.cursor = { start: value.cursor_start, end: value.cursor_end };
    }).then(() => {
      model.original = args;
    });
  }

  /**
   * Handle a text change on the editor widget.
   */
  protected onTextChange(widget: CellEditorWidget, args: ITextChange): void {
    let line = args.newValue.split('\n')[args.line];
    let model = this._model;
    // If last character entered is not whitespace, update completion.
    if (line[args.ch - 1] && line[args.ch - 1].match(/\S/)) {
      // If there is currently a completion
      if (model.original) {
        model.current = args;
      }
    } else {
      // If final character is whitespace, reset completion.
      model.options = null;
      model.original = null;
      model.cursor = null;
      return;
    }
  }

  /**
   * Perform a selection on a codemirror widget.
   */
  protected handleSelection(value: string): void {
    let patch = this._model.createPatch(value);
    let editor = this._editor.editor;
    let doc = editor.getDoc();
    doc.setValue(patch.text);
    doc.setCursor(doc.posFromIndex(patch.position));
  }

  /**
   * Handle mousedown events for the widget.
   */
  private _evtMousedown(event: MouseEvent) {
    if (Private.nonstandardClick(event)) {
      return;
    }

    let target = event.target as HTMLElement;
    while (target !== document.documentElement) {
      // If the user has made a selection, emit its value and reset the model.
      if (target.classList.contains(ITEM_CLASS)) {
        this.handleSelection(target.dataset['value']);
        this._model.reset();
        return;
      }
      // If the mouse event happened anywhere else in the widget, bail.
      if (target === this.node) {
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
    let target = event.target as HTMLElement;
    let node = this.node;

    if (!this._editor) {
      this.hide();
      return;
    }
    if (this.isHidden) {
      return;
    }

    let active: HTMLElement;
    while (target !== document.documentElement) {
      if (target === this._editor.node) {
        switch (event.keyCode) {
        case 13: // Enter key
        case 9: // Tab key
          event.preventDefault();
          event.stopPropagation();
          active = node.querySelector(`.${ACTIVE_CLASS}`) as HTMLElement;
          this.handleSelection(target.dataset['value']);
          this._model.reset();
          return;
        case 27: // Escape key
          event.preventDefault();
          event.stopPropagation();
          this._model.reset();
          return;
        case 38: // Up arrow key
        case 40: // Down arrow key
          event.preventDefault();
          event.stopPropagation();
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

  private _activeIndex = 0;
  private _model: ICompletionModel = null;
  private _pendingComplete = 0;
  private _editor: CellEditorWidget = null;
  private _kernel: IKernel = null;
}


/**
 * A namespace for completion widget private data.
 */
namespace Private {
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
