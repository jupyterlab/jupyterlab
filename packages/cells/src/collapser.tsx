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


/**
 * The CSS class added to all collapsers.
 */
const COLLAPSER_CLASS = 'jp-Collapser';

/**
 * The CSS class added to the collapser child.
 */
const COLLAPSER_CHILD_CLASS = 'jp-Collapser-child';

/**
 * The CSS class added to the collapser icon.
 */
const COLLAPSER_ICON_CLASS = 'jp-Collapser-icon';

/**
 * The CSS class added to input collapsers.
 */
const INPUT_COLLAPSER = 'jp-InputCollapser';

/**
 * The CSS class added to output collapsers.
 */
const OUTPUT_COLLAPSER = 'jp-OutputCollapser';

/**
 * The CSS class added the collapser icon in the collapsed state.
 */
const COLLAPSED_ICON_CLASS = 'jp-ExpandMoreIcon';

/**
 * The CSS class added the collapser icon in the expanded state.
 */
const EXPANDED_ICON_CLASS = 'jp-ExpandLessIcon';

/**
 * The CSS class added the collapser child when collapsed.
 */
const MOD_COLLAPSED_CLASS = 'jp-mod-collapsed';


/**
 * Abstract collapser base class.
 * 
 * ### Notes
 * A collapser is a visible div to the left of a cell's
 * input/output that a user can click on to collapse the
 * input/output.
 */
export
abstract class Collapser extends VDomRenderer<null> {
  /**
   * Construct a new collapser.
   */
  constructor() {
    super();
    this.addClass(COLLAPSER_CLASS);
  }

  /**
   * Is the input/output of the parent collapsed.
   */
  get collapsed(): boolean {
    return false;
  }

  /**
   * Render the collapser with the virtual DOM.
   */
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
      <div className={childClass}  onclick={ (e) => this.handleClick(e) } >
        <div className={iconClass} />
      </div>
    );
  }

  /**
   * Handle the click event.
   */
  protected abstract handleClick(e: Event): void;

}

/**
 * A collapser subclass to collapse a cell's input area.
 */
export
class InputCollapser extends Collapser {
  /**
   * Construct a new input collapser.
   */
  constructor() {
      super();
      this.addClass(INPUT_COLLAPSER);
  }

  /**
   * Is the cell's input collapsed?
   */
  get collapsed(): boolean {
    let cell = this.parent.parent as Cell;
    if (cell) {
      return cell.inputHidden;
    } else {
      return false;
    }
  }

  /**
   * Handle a click event for the user to collapse the cell's input.
   */
  protected handleClick(e: Event): void {
    let cell = this.parent.parent as Cell;
    if (cell) {
      cell.inputHidden = !cell.inputHidden;
    }
    /* We need this until we watch the cell state */
    this.update();
  }

}

/**
 * A collapser subclass to collapse a cell's output area.
 */
export
class OutputCollapser extends Collapser {
    /**
    * Construct a new output collapser.
    */
    constructor() {
      super();
      this.addClass(OUTPUT_COLLAPSER);
    }

  /**
   * Is the cell's output collapsed?
   */
  get collapsed(): boolean {
    let cell = this.parent.parent as CodeCell;
    if (cell) {
      return cell.outputHidden;
    } else {
      return false;
    }
  }

  /**
   * Handle a click event for the user to collapse the cell's output.
   */
  protected handleClick(e: Event): void {
    let cell = this.parent.parent as CodeCell;
    if (cell) {
      cell.outputHidden = !cell.outputHidden;
    }
    /* We need this until we watch the cell state */
    this.update();
  }
}