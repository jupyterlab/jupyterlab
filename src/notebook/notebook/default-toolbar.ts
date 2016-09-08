// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IKernel
} from 'jupyter-js-services';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  restartKernel
} from '../../docregistry';

import {
  NotebookActions
} from './actions';

import {
  nbformat
} from './nbformat';

import {
  NotebookPanel
} from './panel';

import {
  ToolbarButton
} from '../../toolbar';

import {
  Notebook
} from './widget';


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
      onClick: () => {
        panel.context.save().then(() => {
          return panel.context.createCheckpoint();
        });
      },
      tooltip: 'Save the notebook contents and create checkpoint'
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
        restartKernel(panel.kernel, panel.node);
      },
      tooltip: 'Restart the kernel'
    });
  }

  /**
   * Create a cell type switcher item.
   *
   * #### Notes
   * It will display the type of the current active cell.
   * If more than one cell is selected but are of different types,
   * it will display `'-'`.
   * When the user changes the cell type, it will change the
   * cell types of the selected cells.
   * It can handle a change to the context.
   */
  export
  function createCellTypeItem(panel: NotebookPanel): Widget {
    return new CellTypeSwitcher(panel.content);
  }

  /**
   * Create a kernel name indicator item.
   *
   * #### Notes
   * It will display the `'display_name`' of the current kernel,
   * or `'No Kernel!'` if there is no kernel.
   * It can handle a change in context or kernel.
   */
  export
  function createKernelNameItem(panel: NotebookPanel): Widget {
    let widget = new Widget();
    widget.addClass(TOOLBAR_KERNEL);
    updateKernelNameItem(widget, panel.kernel);
    panel.kernelChanged.connect(() => {
      updateKernelNameItem(widget, panel.kernel);
    });
    return widget;
  }

  /**
   * Update the text of the kernel name item.
   */
  function updateKernelNameItem(widget: Widget, kernel: IKernel): void {
    widget.node.textContent = 'No Kernel!';
    if (!kernel) {
      return;
    }
    if (kernel.spec) {
      widget.node.textContent = kernel.spec.display_name;
    } else {
      kernel.getKernelSpec().then(spec => {
        widget.node.textContent = kernel.spec.display_name;
      });
    }
  }

  /**
   * Create a kernel status indicator item.
   *
   * #### Notes
   * It show display a busy status if the kernel status is
   * not idle.
   * It will show the current status in the node title.
   * It can handle a change to the context or the kernel.
   */
  export
  function createKernelStatusItem(panel: NotebookPanel): Widget {
    return new KernelIndicator(panel);
  }

  /**
   * Add the default items to the panel toolbar.
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
   * Construct a new cell type switcher.
   */
  constructor(widget: Notebook) {
    super({ node: createCellTypeSwitcherNode() });
    this.addClass(TOOLBAR_CELLTYPE);

    let select = this.node.firstChild as HTMLSelectElement;
    this._wildCard = document.createElement('option');
    this._wildCard.value = '-';
    this._wildCard.textContent = '-';

    // Change current cell type on a change in the dropdown.
    select.addEventListener('change', event => {
      if (select.value === '-') {
        return;
      }
      if (!this._changeGuard) {
        let value = select.value as nbformat.CellType;
        NotebookActions.changeCellType(widget, value);
      }
    });

    // Set the initial value.
    if (widget.model) {
      this._updateValue(widget, select);
    }

    // Follow the type of the active cell.
    widget.activeCellChanged.connect((sender, cell) => {
      this._updateValue(widget, select);
    });

    // Follow a change in the selection.
    widget.selectionChanged.connect(() => {
      this._updateValue(widget, select);
    });
  }

  /**
   * Update the value of the dropdown from the widget state.
   */
  private _updateValue(widget: Notebook, select: HTMLSelectElement): void {
    if (!widget.activeCell) {
      return;
    }
    let mType: string = widget.activeCell.model.type;
    for (let i = 0; i < widget.childCount(); i++) {
      let child = widget.childAt(i);
      if (widget.isSelected(child)) {
        if (child.model.type !== mType) {
          mType = '-';
          select.appendChild(this._wildCard);
          break;
        }
      }
    }
    if (mType !== '-') {
      select.remove(3);
    }
    this._changeGuard = true;
    select.value = mType;
    this._changeGuard = false;
  }

  private _changeGuard = false;
  private _wildCard: HTMLOptionElement = null;
}


/**
 * Create the node for the cell type switcher.
 */
function createCellTypeSwitcherNode(): HTMLElement {
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
      if (kernel) {
        this._handleStatus(kernel, kernel.status);
        kernel.statusChanged.connect(this._handleStatus, this);
      } else {
        this.node.title = 'No Kernel!';
        this.addClass(TOOLBAR_BUSY);
      }
    });
  }

  /**
   * Handle a status on a kernel.
   */
  private _handleStatus(kernel: IKernel, status: IKernel.Status) {
    if (this.isDisposed) {
      return;
    }
    this.toggleClass(TOOLBAR_BUSY, status !== 'idle');
    let title = 'Kernel ' + status[0].toUpperCase() + status.slice(1);
    this.node.title = title;
  }
}
