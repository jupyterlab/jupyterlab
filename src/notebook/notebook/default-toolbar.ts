// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  IKernel, KernelStatus
} from 'jupyter-js-services';

import {
  showDialog
} from 'jupyter-js-ui/lib/dialog';

import {
  IDocumentContext
} from 'jupyter-js-ui/lib/docmanager';

import {
  Widget
} from 'phosphor-widget';

import {
  NotebookPanel
} from './panel';

import {
  ToolbarButton
} from './toolbar';

import {
  NotebookActions
} from './actions';


/**
 * The class name added to toolbar save button.
 */
const TOOLBAR_SAVE = 'jp-NBToolbar-save';

/**
 * The class name added to toolbar insert button.
 */
const TOOLBAR_INSERT = 'jp-NBToolbar-insert';

/**
 * The class name added to toolbar cut button.
 */
const TOOLBAR_CUT = 'jp-NBToolbar-cut';

/**
 * The class name added to toolbar copy button.
 */
const TOOLBAR_COPY = 'jp-NBToolbar-copy';

/**
 * The class name added to toolbar paste button.
 */
const TOOLBAR_PASTE = 'jp-NBToolbar-paste';

/**
 * The class name added to toolbar run button.
 */
const TOOLBAR_RUN = 'jp-NBToolbar-run';

/**
 * The class name added to toolbar interrupt button.
 */
const TOOLBAR_INTERRUPT = 'jp-NBToolbar-interrupt';

/**
 * The class name added to toolbar restart button.
 */
const TOOLBAR_RESTART = 'jp-NBToolbar-restart';

/**
 * The class name added to toolbar cell type dropdown wrapper.
 */
const TOOLBAR_CELL_WRAP = 'jp-NBToolbar-cellWrapper';

/**
 * The class name added to toolbar cell type dropdown.
 */
const TOOLBAR_CELL = 'jp-NBToolbar-cellType';

/**
 * The class name added to toolbar kernel name text.
 */
const TOOLBAR_KERNEL = 'jp-NBToolbar-kernelName';

/**
 * The class name added to toolbar kernel indicator icon.
 */
const TOOLBAR_INDICATOR = 'jp-NBToolbar-kernelIndicator';

/**
 * The class name added to a busy kernel indicator.
 */
const TOOLBAR_BUSY = 'jp-mod-busy';


/**
 * A namespace for the default toolbar items.
 */
export
namespace ToolbarItems {
  /**
   * Create save button toolbar item.
   */
  export
  function createSaveButton(panel: NotebookPanel): ToolbarButton {
    return new ToolbarButton(TOOLBAR_SAVE, () => {
      panel.context.save();
    }, 'Save the notebook contents');
  }

  /**
   * Create an insert toolbar item.
   */
  export
  function createInsertButton(panel: NotebookPanel): ToolbarButton {
    return new ToolbarButton(TOOLBAR_INSERT, () => {
      NotebookActions.insertBelow(panel.content);
    }, 'Insert a cell below');
  }

  /**
   * Create a cut toolbar item.
   */
  export
  function createCutButton(panel: NotebookPanel): ToolbarButton {
    return new ToolbarButton(TOOLBAR_CUT, () => {
      NotebookActions.cut(panel.content, panel.clipboard);
    }, 'Cut the selected cell(s)');
  }

  /**
   * Create a copy toolbar item.
   */
  export
  function createCopyButton(panel: NotebookPanel): ToolbarButton {
    return new ToolbarButton(TOOLBAR_COPY, () => {
      NotebookActions.copy(panel.content, panel.clipboard);
    }, 'Copy the selected cell(s)');
  }

  /**
   * Create a paste toolbar item.
   */
  export
  function createPasteButton(panel: NotebookPanel): ToolbarButton {
    return new ToolbarButton(TOOLBAR_PASTE, () => {
      NotebookActions.paste(panel.content, panel.clipboard);
    }, 'Paste cell(s) from the clipboard');
  }

  /**
   * Create a run toolbar item.
   */
  export
  function createRunButton(panel: NotebookPanel): ToolbarButton {
    return new ToolbarButton(TOOLBAR_RUN, () => {
      NotebookActions.runAndAdvance(panel.content, panel.context.kernel);
    }, 'Run the selected cell(s) and advance');
  }

  /**
   * Create an interrupt toolbar item.
   */
  export
  function createInterruptButton(panel: NotebookPanel): ToolbarButton {
    return new ToolbarButton(TOOLBAR_INTERRUPT, () => {
      if (panel.context.kernel) {
        panel.context.kernel.interrupt();
      }
    }, 'Interrupt the kernel');
  }

  /**
   * Create a restart toolbar item.
   */
  export
  function createRestartButton(panel: NotebookPanel): ToolbarButton {
    return new ToolbarButton(TOOLBAR_RESTART, () => {
      panel.restart();
    }, 'Restart the kernel');
  }

  /**
   * Create a cell type switcher item.
   */
  export
  function createCellTypeItem(panel: NotebookPanel): Widget {
    return new CellTypeSwitcher(panel);
  }

  /**
   * Create a kernel name indicator item.
   */
  export
  function createKernelNameItem(panel: NotebookPanel): Widget {
    let widget = new Widget();
    widget.addClass(TOOLBAR_KERNEL);
    widget.node.textContent = 'No Kernel!';
    if (panel.context.kernel) {
      panel.context.kernel.getKernelSpec().then(spec => {
        widget.node.textContent = spec.display_name;
      });
    }
    panel.context.kernelChanged.connect(() => {
      panel.context.kernel.getKernelSpec().then(spec => {
        widget.node.textContent = spec.display_name;
      });
    });
    return widget;
  }

  /**
   * Create a kernel status indicator item.
   */
  export
  function createKernelStatusItem(panel: NotebookPanel): Widget {
    return new KernelIndicator(panel.context);
  }

  /**
   * Add the default items to a toolbar.
   */
  export
  function populateDefaults(panel: NotebookPanel): void {
    let toolbar = panel.toolbar;
    toolbar.add('save', createSaveButton(panel));
    toolbar.add('insert', createInsertButton(panel));
    toolbar.add('cut', createCutButton(panel));
    toolbar.add('copy', createCopyButton(panel));
    toolbar.add('paste', createPasteButton(panel));
    toolbar.add('run', createRunButton(panel));
    toolbar.add('interrupt', createInterruptButton(panel));
    toolbar.add('restart', createRestartButton(panel));
    toolbar.add('cellType', createCellTypeItem(panel));
    toolbar.add('kernelName', createKernelNameItem(panel));
    toolbar.add('kernelStatus', createKernelStatusItem(panel));
  }
}


/**
 * A toolbar widget that switches cell types.
 */
class CellTypeSwitcher extends Widget {
  /**
   * Create the node for the cell type switcher.
   */
  static createNode(): HTMLElement {
    let div = document.createElement('div');
    let select = document.createElement('select');
    for (let t of ['Code', 'Markdown', 'Raw']) {
      let option = document.createElement('option');
      option.value = t.toLowerCase();
      option.textContent = t;
      select.appendChild(option);
    }
    select.className = TOOLBAR_CELL;
    div.appendChild(select);
    return div;
  }

  /**
   * Construct a new cell type switcher.
   */
  constructor(panel: NotebookPanel) {
    super();
    this.addClass(TOOLBAR_CELL_WRAP);
    let select = this.node.firstChild as HTMLSelectElement;
    // Set the initial value.
    let index = panel.content.activeCellIndex;
    select.value = panel.model.cells.get(index).type;
    // Follow the type of the current cell.
    panel.content.stateChanged.connect((sender, args) => {
      if (args.name === 'activeCellIndex') {
        this._changeGuard = true;
        select.value = panel.model.cells.get(args.newValue).type;
        this._changeGuard = false;
      }
    });
    // Follow a change in the cells.
    panel.content.model.cells.changed.connect((sender, args) => {
      index = panel.content.activeCellIndex;
      this._changeGuard = true;
      select.value = panel.model.cells.get(index).type;
      this._changeGuard = false;
    });
    // Change current cell type on a change in the dropdown.
    select.addEventListener('change', event => {
      if (!this._changeGuard) {
        NotebookActions.changeCellType(panel.content, select.value);
      }
    });
  }


  private _changeGuard = false;
}


/**
 * A toolbar item that displays kernel status.
 */
class KernelIndicator extends Widget {
  /**
   * Construct a new kernel status widget.
   */
  constructor(context: IDocumentContext) {
    super();
    this.addClass(TOOLBAR_INDICATOR);
    if (context.kernel) {
      this._handleStatus(context.kernel, context.kernel.status);
      context.kernel.statusChanged.connect(this._handleStatus, this);
    } else {
      this.addClass(TOOLBAR_BUSY);
      this.node.title = 'No Kernel!';
    }
    context.kernelChanged.connect((c, kernel) => {
      this._handleStatus(kernel, kernel.status);
      kernel.statusChanged.connect(this._handleStatus, this);
    });
  }

  /**
   * Handle a status on a kernel.
   */
  private _handleStatus(kernel: IKernel, status: KernelStatus) {
    this.toggleClass(TOOLBAR_BUSY, status !== KernelStatus.Idle);
    switch (status) {
    case KernelStatus.Idle:
      this.node.title = 'Kernel Idle';
      break;
    case KernelStatus.Busy:
      this.node.title = 'Kernel Busy';
      break;
    case KernelStatus.Dead:
      this.node.title = 'Kernel Died';
      break;
    case KernelStatus.Reconnecting:
      this.node.title = 'Kernel Reconnecting';
      break;
    case KernelStatus.Restarting:
      this.node.title = 'Kernel Restarting';
      break;
    case KernelStatus.Starting:
      this.node.title = 'Kernel Starting';
      break;
    default:
      this.node.title = 'Kernel Status Unknown';
      break;
    }
  }
}
