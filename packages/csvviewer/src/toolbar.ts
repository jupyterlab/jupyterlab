// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { ITranslator } from '@jupyterlab/translation';
import { nullTranslator } from '@jupyterlab/translation';
import { Styling } from '@jupyterlab/ui-components';
import type { Message } from '@lumino/messaging';
import { Widget } from '@lumino/widgets';
import type { CSVViewer } from './widget';

/**
 * The class name added to a csv toolbar widget.
 */
const CSV_DELIMITER_CLASS = 'jp-CSVDelimiter';

const CSV_DELIMITER_LABEL_CLASS = 'jp-CSVDelimiter-label';

/**
 * The class name added to a csv toolbar's dropdown element.
 */
const CSV_DELIMITER_DROPDOWN_CLASS = 'jp-CSVDelimiter-dropdown';

const CSV_COMMENT_CLASS = 'jp-CSVComment';

const CSV_COMMENT_LABEL_CLASS = 'jp-CSVComment-label';

const CSV_COMMENT_DROPDOWN_CLASS = 'jp-CSVComment-dropdown';

/**
 * A widget for selecting a delimiter.
 */
export class CSVDelimiter extends Widget {
  /**
   * Construct a new csv table widget.
   */
  constructor(options: CSVToolbar.IOptions) {
    super({
      node: Private.createNode({
        selected: options.widget.delimiter,
        label: 'Delimiter: ',
        labelClassName: CSV_DELIMITER_LABEL_CLASS,
        dropdownClassName: CSV_DELIMITER_DROPDOWN_CLASS,
        translator: options.translator,
        values: [
          [',', ','],
          [';', ';'],
          ['\t', 'tab'],
          ['|', 'pipe'],
          ['#', 'hash']
        ]
      })
    });
    this._widget = options.widget;
    this.addClass(CSV_DELIMITER_CLASS);
  }

  /**
   * The delimiter dropdown menu.
   */
  get selectNode(): HTMLSelectElement {
    return this.node.getElementsByTagName('select')![0];
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
        this._widget.delimiter = this.selectNode.value;
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

  protected _widget: CSVViewer;
}

/**
 * A widget for selecting a comment character.
 */
export class CSVComment extends Widget {
  /**
   * Construct a new csv comment widget.
   */
  constructor(options: CSVToolbar.IOptions) {
    super({
      node: Private.createNode({
        selected: options.widget.comment ?? '',
        label: 'Comment: ',
        labelClassName: CSV_COMMENT_LABEL_CLASS,
        dropdownClassName: CSV_COMMENT_DROPDOWN_CLASS,
        translator: options.translator,
        values: [
          ['', 'none'],
          ['#', 'hash']
        ]
      })
    });
    this._widget = options.widget;
    this.addClass(CSV_COMMENT_CLASS);
  }

  /**
   * The comment dropdown menu.
   */
  get selectNode(): HTMLSelectElement {
    return this.node.getElementsByTagName('select')![0];
  }

  /**
   * Handle DOM events for the widget.
   */
  handleEvent(event: Event): void {
    switch (event.type) {
      case 'change':
        this._widget.comment = this.selectNode.value || null;
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

  protected _widget: CSVViewer;
}

/**
 * A namespace for `CSVToolbar` statics.
 */
export namespace CSVToolbar {
  /**
   * The instantiation options for a CSV toolbar.
   */
  export interface IOptions {
    /**
     * Document widget for this toolbar
     */
    widget: CSVViewer;

    /**
     * The application language translator.
     */
    translator?: ITranslator;
  }
}

/**
 * A namespace for private toolbar methods.
 */
namespace Private {
  interface ICreateNodeOptions {
    selected: string;
    label: string;
    labelClassName: string;
    dropdownClassName: string;
    translator?: ITranslator;
    values: Array<[string, string]>;
  }

  /**
   * Create the node for a CSV toolbar select.
   */
  export function createNode(options: ICreateNodeOptions): HTMLElement {
    const {
      selected,
      label,
      labelClassName,
      dropdownClassName,
      translator,
      values
    } = options;
    const trans = (translator || nullTranslator).load('jupyterlab');

    const div = document.createElement('div');
    const labelNode = document.createElement('span');
    const select = document.createElement('select');
    labelNode.textContent = trans.__(label);
    labelNode.className = labelClassName;
    for (const [value, optionLabel] of values) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = trans.__(optionLabel);
      if (value === selected) {
        option.selected = true;
      }
      select.appendChild(option);
    }
    div.appendChild(labelNode);
    const node = Styling.wrapSelect(select);
    node.classList.add(dropdownClassName);
    div.appendChild(node);
    return div;
  }
}
