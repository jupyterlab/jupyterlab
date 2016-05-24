// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  Message
} from 'phosphor-messaging';

import {
  Widget
} from 'phosphor-widget';

import {
  ICompletionModel
} from './model';

/**
 * The class name added to completion menu widgets.
 */
const COMPLETION_CLASS = 'jp-Completion';

/**
 * The class name added to completion menu contents.
 */
const ITEM_CLASS = 'jp-Completion-item';

/**
 * The maximum height of a completion widget.
 */
const MAX_HEIGHT = 250;

/**
 * The offset to add to the widget width if a scrollbar exists.
 */
const SCROLLBAR_OFFSET = 20;


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
  constructor(model: ICompletionModel) {
    super();
    this._model = model;
    this._model.optionsChanged.connect(this.onOptionsChanged, this);
    this.addClass(COMPLETION_CLASS);
    this.update();
  }

  /**
   * This list of completion options.
   */
  get options(): string[] {
    return this._options;
  }
  set options(newValue: string[]) {
    // If the new value and the old value are falsey, return;
    if (newValue === this._options || !newValue && !this._options) {
      return;
    }
    if (newValue && this._options && newValue.join() === this._options.join()) {
      return;
    }
    this._options = newValue;
    this.update();
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
    if (this.isDisposed) return;
    this._model.dispose();
    this._model = null;
    this.options = null;
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
    case 'mousedown':
      this._evtMousedown(event as MouseEvent);
      break;
    }
  }

  /**
   * Handle `after_attach` messages for the widget.
   *
   * #### Notes
   * Captures document events in the capture phase to dismiss the tooltip.
   */
  protected onAfterAttach(msg: Message): void {
    this.node.addEventListener('mousedown', this, true);
  }

  /**
   * Handle `before_detach` messages for the widget.
   */
  protected onBeforeDetach(msg: Message): void {
    this.node.removeEventListener('mousedown', this);
  }

  /**
   * Handle `update_request` messages.
   */
  protected onUpdateRequest(msg: Message): void {
    let node = this.node;
    node.textContent = '';

    if (!this._options || !this._options.length) {
      this.hide();
      return;
    }

    for (let i = 0, len = this._options.length; i < len; i++) {
      let li = document.createElement('li');
      let code = document.createElement('code');

      // Use innerHTML because search results include <mark> tags.
      code.innerHTML = this._options[i];
      li.className = ITEM_CLASS;
      li.appendChild(code);
      node.appendChild(li);
    }

    if (this.isHidden) this.show();

    let availableHeight = this._model.original.coords.top;
    let maxHeight = Math.min(availableHeight, MAX_HEIGHT);
    node.style.maxHeight = `${maxHeight}px`;

    // Account for 1px border width.
    let left = Math.floor(this._model.original.coords.left) + 1;
    let rect = node.getBoundingClientRect();
    let top = maxHeight - rect.height;
    node.style.left = `${left}px`;
    node.style.top = `${top}px`;

    // If a scrollbar is necessary, add padding to prevent horizontal scrollbar.
    let lineHeight = node.getElementsByTagName('li')[0]
      .getBoundingClientRect().height;
    if (lineHeight * this._options.length > maxHeight) {
      node.style.paddingRight = `${SCROLLBAR_OFFSET}px`;
    } else {
      node.style.paddingRight = `0px`;
    }
  }

  /**
   * Handle option changes from the model.
   */
  protected onOptionsChanged(sender: ICompletionModel, args: void): void {
    this.options = this._model.options;
  }

  /**
   * Handle mousedown events for the widget.
   */
  private _evtMousedown(event: MouseEvent) {
    let target = event.target as HTMLElement;
    while (target !== this.node) {
      // If a completion value is selected, set the model and return.
      if (target.classList.contains(ITEM_CLASS)) {
        // TODO: return a value and dismiss the completion menu.
        return;
      }
      target = target.parentElement;
    }
  }

  private _model: ICompletionModel = null;
  private _options: string[] = null;
  private _reference: Widget = null;
}


/**
 * A namespace for completion widget private data.
 */
namespace Private {
}
