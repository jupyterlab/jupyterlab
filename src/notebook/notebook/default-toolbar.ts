// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IKernel, KernelStatus
} from 'jupyter-js-services';

import {
  Widget
} from 'phosphor-widget';

import {
  NotebookPanel
} from './panel';

import {
  Notebook
} from './widget';

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
const TOOLBAR_CELLTYPE = 'jp-NBToolbar-cellType';

/**
 * The class name added to toolbar cell type dropdown.
 */
const TOOLBAR_CELLTYPE_DROPDOWN = 'jp-NBToolbar-cellTypeDropdown';

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
    return new ToolbarButton({
      className: TOOLBAR_SAVE,
      onClick: () => { panel.context.save();  },
      tooltip: 'Save the notebook contents'
    });
  }

  /**
   * Create an insert toolbar item.
   */
  export
  function createInsertButton(panel: NotebookPanel): ToolbarButton {
    return new ToolbarButton({
      className: TOOLBAR_INSERT,
      onClick: () => { NotebookActions.insertBelow(panel.content); },
      tooltip: 'Insert a cell below'
    });
  }

  /**
   * Create a cut toolbar item.
   */
  export
  function createCutButton(panel: NotebookPanel): ToolbarButton {
    return new ToolbarButton({
      className: TOOLBAR_CUT,
      onClick: () => {
        NotebookActions.cut(panel.content, panel.clipboard);
      },
      tooltip: 'Cut the selected cell(s)'
    });
  }

  /**
   * Create a copy toolbar item.
   */
  export
  function createCopyButton(panel: NotebookPanel): ToolbarButton {
    return new ToolbarButton({
      className: TOOLBAR_COPY,
      onClick: () => {
        NotebookActions.copy(panel.content, panel.clipboard);
      },
      tooltip: 'Copy the selected cell(s)'
    });
  }

  /**
   * Create a paste toolbar item.
   */
  export
  function createPasteButton(panel: NotebookPanel): ToolbarButton {
    return new ToolbarButton({
      className: TOOLBAR_PASTE,
      onClick: () => {
        NotebookActions.paste(panel.content, panel.clipboard);
      },
      tooltip: 'Paste cell(s) from the clipboard'
    });
  }

  /**
   * Create a run toolbar item.
   */
  export
  function createRunButton(panel: NotebookPanel): ToolbarButton {
    return new ToolbarButton({
      className: TOOLBAR_RUN,
      onClick: () => {
        NotebookActions.runAndAdvance(panel.content, panel.kernel);
      },
      tooltip: 'Run the selected cell(s) and advance'
    });
  }

  /**
   * Create an interrupt toolbar item.
   */
  export
  function createInterruptButton(panel: NotebookPanel): ToolbarButton {
    return new ToolbarButton({
      className: TOOLBAR_INTERRUPT,
      onClick: () => {
        if (panel.kernel) {
          panel.context.kernel.interrupt();
        }
      },
      tooltip: 'Interrupt the kernel'
    });
  }

  /**
   * Create a restart toolbar item.
   */
  export
  function createRestartButton(panel: NotebookPanel): ToolbarButton {
    return new ToolbarButton({
      className: TOOLBAR_RESTART,
      onClick: () => {
        panel.restart();
      },
      tooltip: 'Restart the kernel'
    });
  }

  /**
   * Create a cell type switcher item.
   */
  export
  function createCellTypeItem(panel: NotebookPanel): Widget {
    return new CellTypeSwitcher(panel.content);
  }

  /**
   * Create a kernel name indicator item.
   */
  export
  function createKernelNameItem(panel: NotebookPanel): Widget {
    let widget = new Widget();
    widget.addClass(TOOLBAR_KERNEL);
    widget.node.textContent = 'No Kernel!';
    if (panel.kernel) {
      panel.kernel.getKernelSpec().then(spec => {
        widget.node.textContent = spec.display_name;
      });
    }
    panel.kernelChanged.connect(() => {
      panel.kernel.getKernelSpec().then(spec => {
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
    return new KernelIndicator(panel);
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
    select.className = TOOLBAR_CELLTYPE_DROPDOWN;
    div.appendChild(select);
    return div;
  }

  /**
   * Construct a new cell type switcher.
   */
  constructor(content: Notebook) {
    super();
    this.addClass(TOOLBAR_CELLTYPE);

    let select = this.node.firstChild as HTMLSelectElement;
    // Change current cell type on a change in the dropdown.
    select.addEventListener('change', event => {
      if (!this._changeGuard) {
        NotebookActions.changeCellType(content, select.value);
      }
    });

    // Set the initial value.
    let index = content.activeCellIndex;
    if (content.model) {
      select.value = content.model.cells.get(index).type;
    }

    let update = () => {
      select = this.node.firstChild as HTMLSelectElement;
      index = content.activeCellIndex;
      this._changeGuard = true;
      select.value = content.model.cells.get(index).type;
      this._changeGuard = false;
    };

    // Follow the type of the current cell.
    content.modelContentChanged.connect(() => { update(); });
    content.stateChanged.connect(() => { update(); });
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
  constructor(panel: NotebookPanel) {
    super();
    this.addClass(TOOLBAR_INDICATOR);
    if (panel.kernel) {
      this._handleStatus(panel.kernel, panel.kernel.status);
      panel.kernel.statusChanged.connect(this._handleStatus, this);
    } else {
      this.addClass(TOOLBAR_BUSY);
      this.node.title = 'No Kernel!';
    }
    panel.kernelChanged.connect((c, kernel) => {
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
