// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  each, zip
} from '@phosphor/algorithm';

import {
  Message
} from '@phosphor/messaging';

import {
  ISignal, Signal
} from '@phosphor/signaling';

import {
  Widget
} from '@phosphor/widgets';


/**
 * The supported parsing delimiters.
 */
export
const DELIMITERS = [',', ';', '\t'];

/**
 * The labels for each delimiter as they appear in the dropdown menu.
 */
export
const LABELS = [',', ';', '\\t'];

/**
 * The class name added to a csv toolbar widget.
 */
const CSV_TOOLBAR_CLASS = 'jp-CSVToolbar';

/**
 * The class name added to a csv toolbar's dropdown element.
 */
const CSV_TOOLBAR_DROPDOWN_CLASS = 'jp-CSVToolbar-dropdown';


/**
 * A widget for CSV widget toolbars.
 */
export
class CSVToolbar extends Widget {
  /**
   * Construct a new csv table widget.
   */
  constructor(options: CSVToolbar.IOptions = {}) {
    super({ node: Private.createNode(options.selected) });
    this.addClass(CSV_TOOLBAR_CLASS);
  }

  /**
   * A signal emitted when the delimiter selection has changed.
   */
  get delimiterChanged(): ISignal<this, string> {
    return this._delimiterChanged;
  }

  /**
   * The delimiter dropdown menu.
   */
  get selectNode(): HTMLSelectElement {
    return this.node.getElementsByTagName('select')[0];
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
    case 'change':
      this._delimiterChanged.emit(this.selectNode.value);
      break;
    default:
      break;
    }
  }

  /**
   * Handle `after-attach` messages for the widget.
   */
  protected onAfterAttach(msg: Message): void {
    this.selectNode.addEventListener('change', this);
  }

  /**
   * Handle `before-detach` messages for the widget.
   */
  protected onBeforeDetach(msg: Message): void {
    this.selectNode.removeEventListener('change', this);
  }

  private _delimiterChanged = new Signal<this, string>(this);
}


/**
 * A namespace for `CSVToolbar` statics.
 */
export
namespace CSVToolbar {
  /**
   * The instantiation options for a CSV toolbar.
   */
  export
  interface IOptions {
    /**
     * The initially selected delimiter.
     */
    selected?: string;
  }
}


/**
 * A namespace for private toolbar methods.
 */
namespace Private {
  /**
   * Create the node for the delimiter switcher.
   */
  export
  function createNode(selected: string): HTMLElement {
    let div = document.createElement('div');
    let label = document.createElement('label');
    let select = document.createElement('select');
    select.className = CSV_TOOLBAR_DROPDOWN_CLASS;
    label.textContent = 'Delimiter: ';
    each(zip(DELIMITERS, LABELS), ([delimiter, label]) => {
      let option = document.createElement('option');
      option.value = delimiter;
      option.textContent = label;
      if (delimiter === selected) {
        option.selected = true;
      }
      select.appendChild(option);
    });
    label.appendChild(select);
    div.appendChild(label);
    return div;
  }
}
