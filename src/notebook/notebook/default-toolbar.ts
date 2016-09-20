// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Widget
} from 'phosphor/lib/ui/widget';

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
  createInterruptButton,
  createRestartButton,
  createKernelNameItem,
  createKernelStatusItem
} from '../../toolbar/kernel';

import {
  Notebook
} from './widget';


/**
 * The class name added to toolbar save button.
 */
const TOOLBAR_SAVE_CLASS = 'jp-Notebook-toolbarSave';

/**
 * The class name added to toolbar insert button.
 */
const TOOLBAR_INSERT_CLASS = 'jp-Notebook-toolbarInsert';

/**
 * The class name added to toolbar cut button.
 */
const TOOLBAR_CUT_CLASS = 'jp-Notebook-toolbarCut';

/**
 * The class name added to toolbar copy button.
 */
const TOOLBAR_COPY_CLASS = 'jp-Notebook-toolbarCopy';

/**
 * The class name added to toolbar paste button.
 */
const TOOLBAR_PASTE_CLASS = 'jp-Notebook-toolbarPaste';

/**
 * The class name added to toolbar run button.
 */
const TOOLBAR_RUN_CLASS = 'jp-Notebook-toolbarRun';

/**
 * The class name added to toolbar cell type dropdown wrapper.
 */
const TOOLBAR_CELLTYPE_CLASS = 'jp-Notebook-toolbarCellType';

/**
 * The class name added to toolbar cell type dropdown.
 */
const TOOLBAR_CELLTYPE_DROPDOWN_CLASS = 'jp-Notebook-toolbarCellTypeDropdown';


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
      className: TOOLBAR_SAVE_CLASS,
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
      className: TOOLBAR_INSERT_CLASS,
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
      className: TOOLBAR_CUT_CLASS,
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
      className: TOOLBAR_COPY_CLASS,
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
      className: TOOLBAR_PASTE_CLASS,
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
      className: TOOLBAR_RUN_CLASS,
      onClick: () => {
        NotebookActions.runAndAdvance(panel.content, panel.kernel);
      },
      tooltip: 'Run the selected cell(s) and advance'
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
    toolbar.add('restart', createRestartButton(panel, panel.node));
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
    this.addClass(TOOLBAR_CELLTYPE_CLASS);

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
  select.className = TOOLBAR_CELLTYPE_DROPDOWN_CLASS;
  div.appendChild(select);
  return div;
}
