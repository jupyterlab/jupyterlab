// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  NotebookActions
} from './actions';

import {
  showDialog, Dialog, Toolbar, ToolbarButton, ToolbarSelect
} from '@jupyterlab/apputils';

import {
  nbformat
} from '@jupyterlab/coreutils';

import {
  NotebookPanel
} from './panel';

import {
  Notebook
} from './widget';


/**
 * The class name added to toolbar save button.
 */
const TOOLBAR_SAVE_CLASS = 'jp-SaveIcon';

/**
 * The class name added to toolbar insert button.
 */
const TOOLBAR_INSERT_CLASS = 'jp-AddIcon';

/**
 * The class name added to toolbar cut button.
 */
const TOOLBAR_CUT_CLASS = 'jp-CutIcon';

/**
 * The class name added to toolbar copy button.
 */
const TOOLBAR_COPY_CLASS = 'jp-CopyIcon';

/**
 * The class name added to toolbar paste button.
 */
const TOOLBAR_PASTE_CLASS = 'jp-PasteIcon';

/**
 * The class name added to toolbar run button.
 */
const TOOLBAR_RUN_CLASS = 'jp-RunIcon';

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
        if (panel.context.model.readOnly) {
          return showDialog({
            title: 'Cannot Save',
            body: 'Document is read-only',
            buttons: [Dialog.okButton()]
          });
        }
        panel.context.save().then(() => {
          if (!panel.isDisposed) {
            return panel.context.createCheckpoint();
          }
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
      onClick: () => {
        NotebookActions.insertBelow(panel.notebook);
      },
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
        NotebookActions.cut(panel.notebook);
      },
      tooltip: 'Cut the selected cells'
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
        NotebookActions.copy(panel.notebook);
      },
      tooltip: 'Copy the selected cells'
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
        NotebookActions.paste(panel.notebook);
      },
      tooltip: 'Paste cells from the clipboard'
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
        NotebookActions.runAndAdvance(panel.notebook, panel.session);
      },
      tooltip: 'Run the selected cells and advance'
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
  function createCellTypeItem(widget: Notebook): CellTypeSelect {
    return new CellTypeSelect({
      className: TOOLBAR_CELLTYPE_DROPDOWN_CLASS,
      onChange: (event: React.ChangeEvent<HTMLSelectElement>): void => {
        const { value } = event.target;
        if (value === '-') {
          return;
        }
        NotebookActions.changeCellType(widget, value as nbformat.CellType);
        widget.activate();
      },
      onKeyDown: (event: React.KeyboardEvent<HTMLSelectElement>): void => {
        if (event.keyCode === 13) {
          // On Enter
          widget.activate();
        }
      },
      options: ['Code', 'Markdown', 'Raw']
    }, widget);
  }

  /**
   * Add the default items to the panel toolbar.
   */
  export
  function populateDefaults(panel: NotebookPanel): void {
    let toolbar = panel.toolbar;
    toolbar.addItem('save', createSaveButton(panel));
    toolbar.addItem('insert', createInsertButton(panel));
    toolbar.addItem('cut', createCutButton(panel));
    toolbar.addItem('copy', createCopyButton(panel));
    toolbar.addItem('paste', createPasteButton(panel));
    toolbar.addItem('run', createRunButton(panel));
    toolbar.addItem('interrupt', Toolbar.createInterruptButton(panel.session));
    toolbar.addItem('restart', Toolbar.createRestartButton(panel.session));
    toolbar.addItem('cellType', createCellTypeItem(panel.notebook));
    toolbar.addItem('spacer', Toolbar.createSpacerItem());
    toolbar.addItem('kernelName', Toolbar.createKernelNameItem(panel.session));
    toolbar.addItem('kernelStatus', Toolbar.createKernelStatusItem(panel.session));
  }
}


export
class CellTypeSelect extends ToolbarSelect {
  /**
   * Construct a new toolbar button.
   */
  constructor(options: ToolbarSelect.IOptions, widget: Notebook) {
    super(options);
    this._widget = widget;
    if (widget.model) {
      this._updateValue();
    }
    // Follow the type of the active cell.
    widget.activeCellChanged.connect(this._updateValue, this);
    // Follow a change in the selection.
    widget.selectionChanged.connect(this._updateValue, this);
  }

  /**
   * Update the value of the dropdown from the widget state.
   */
  private _updateValue(): void {
    if (!this._widget.activeCell) {
      return;
    }
    let cellType: string = this._widget.activeCell.model.type;
    this._widget.widgets.forEach(child => {
      if (this._widget.isSelectedOrActive(child)) {
        if (child.model.type !== cellType) {
          cellType = '-';
          this.props.options = this.props.options.concat('-');
        }
      }
    });
    if (cellType !== '-') {
      this.props.options = this.props.options.filter((option: string) => option !== '-');
      this.props.selected = cellType;
    }
    this.render();
  }

  private _widget: Notebook;
}
