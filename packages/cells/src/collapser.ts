/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  Message
} from '@phosphor/messaging';

import {
  Widget
} from '@phosphor/widgets';

import {
  Cell, CodeCell
} from './widget';


const COLLAPSER_CLASS = 'jp-Collapser';

const INPUT_COLLAPSER = 'jp-InputCollapser';

const OUTPUT_COLLAPSER = 'jp-OutputCollapser';


/**
 * Default implementation of the collapser.
 */
export
abstract class Collapser extends Widget {
  constructor() {
    super();
    this.addClass(COLLAPSER_CLASS);
  }

  handleEvent(event: Event): void {
    console.log("handleEvent", event);
    if (!this.parent) {
      return;
    }
    switch (event.type) {
    case 'click':
      this._evtClick(event as MouseEvent);
      break;
    default:
      break;
    }
  }

  protected abstract _evtClick(event: MouseEvent): void;

  /**
   * Handle `after-attach` messages for the widget.
   */
  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    let node = this.node;
    node.addEventListener('click', this);
  }

  /**
   * Handle `before-detach` messages for the widget.
   */
  protected onBeforeDetach(msg: Message): void {
    let node = this.node;
    node.removeEventListener('click', this);
  }

}

export
class InputCollapser extends Collapser {
    constructor() {
        super();
        this.addClass(INPUT_COLLAPSER);
    }

    protected _evtClick(event: MouseEvent) {
    let cell = this.parent.parent as Cell;
    cell.inputHidden = !cell.inputHidden;
  }

}


export
class OutputCollapser extends Collapser {
    constructor() {
        super();
        this.addClass(OUTPUT_COLLAPSER);
    }

    protected _evtClick(event: MouseEvent) {
    let cell = this.parent.parent as CodeCell;
    cell.outputHidden = !cell.outputHidden;
  }

}