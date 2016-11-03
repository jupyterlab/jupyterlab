// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  VNode
} from 'phosphor/lib/ui/vdom';

import {
  VDomModel, VDomWidget
} from '../common/vdom';

import {
  HTML_COMMON_CLASS
} from '../renderers/widget';


/**
 * The class name added to a csv table widget.
 */
const CSV_TABLE_CLASS = 'jp-CSVWidget-table';


/**
 * A CSV table content model.
 */
export
class CSVModel extends VDomModel {}


/**
 * A CSV table content widget.
 */
export
class CSVTable extends VDomWidget<CSVModel> {
  constructor() {
    super();
    this.addClass(CSV_TABLE_CLASS);
    this.addClass(HTML_COMMON_CLASS);
  }
  /**
   * Render the content as virtual DOM nodes.
   */
  protected render(): VNode | VNode[] {
    return null;
  }
}
