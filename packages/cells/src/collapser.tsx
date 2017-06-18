/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  VDomRenderer
} from '@jupyterlab/apputils';

import {
  h, VirtualNode
} from '@phosphor/virtualdom';

import {
  Cell, CodeCell
} from './widget';


const COLLAPSER_CLASS = 'jp-Collapser';

const COLLAPSER_CHILD_CLASS = 'jp-Collapser-child';

const COLLAPSER_ICON_CLASS = 'jp-Collapser-icon';

const INPUT_COLLAPSER = 'jp-InputCollapser';

const OUTPUT_COLLAPSER = 'jp-OutputCollapser';

const COLLAPSED_ICON_CLASS = 'jp-ExpandMoreIcon';

const EXPANDED_ICON_CLASS = 'jp-ExpandLessIcon';

const MOD_COLLAPSED_CLASS = 'jp-mod-collapsed';


/**
 * Default implementation of the collapser.
 */
export
abstract class Collapser extends VDomRenderer<null> {
  constructor() {
    super();
    this.addClass(COLLAPSER_CLASS);
  }

  get collapsed(): boolean {
    return false;
  }

  protected render(): VirtualNode | ReadonlyArray<VirtualNode> {
    let childClass = COLLAPSER_CHILD_CLASS;
    let iconClass = COLLAPSER_ICON_CLASS;
    if (this.collapsed) {
      childClass += ` ${MOD_COLLAPSED_CLASS}`;
      iconClass += ` ${COLLAPSED_ICON_CLASS}`;
    } else {
      iconClass += ` ${EXPANDED_ICON_CLASS}`;
    }
    return (
      <div className={childClass}>
        <div className={iconClass} onclick={ (e) => this.handleClick(e) } />
      </div>
    );
  }

  protected abstract handleClick(e: Event): void;

}

export
class InputCollapser extends Collapser {
  constructor() {
      super();
      this.addClass(INPUT_COLLAPSER);
  }

  get collapsed(): boolean {
    let cell = this.parent.parent as Cell;
    if (cell) {
      return cell.inputHidden;
    } else {
      return false;
    }
  }

  protected handleClick(e: Event): void {
    let cell = this.parent.parent as Cell;
    console.log("handleClick", cell);
    if (cell) {
      cell.inputHidden = !cell.inputHidden;
    }
    /* We need this until we watch the cell state */
    this.update();
  }

}


export
class OutputCollapser extends Collapser {
    constructor() {
      super();
      this.addClass(OUTPUT_COLLAPSER);
    }

  get collapsed(): boolean {
    let cell = this.parent.parent as CodeCell;
    if (cell) {
      return cell.outputHidden;
    } else {
      return false;
    }
  }

    protected handleClick(e: Event): void {
      let cell = this.parent.parent as CodeCell;
      console.log("handleClick", cell);
      if (cell) {
        cell.outputHidden = !cell.outputHidden;
      }
      /* We need this until we watch the cell state */
      this.update();
  }

}