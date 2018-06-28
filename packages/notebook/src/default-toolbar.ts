// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Message
} from '@phosphor/messaging';

import {
  Widget
} from '@phosphor/widgets';

import {
  NotebookActions
} from './actions';

import {
  showDialog, Dialog, Styling, Toolbar, ToolbarButton
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
        NotebookActions.insertBelow(panel.content);
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
        NotebookActions.cut(panel.content);
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
        NotebookActions.copy(panel.content);
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
        NotebookActions.paste(panel.content);
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
        NotebookActions.runAndAdvance(panel.content, panel.session);
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
  function createCellTypeItem(panel: NotebookPanel): Widget {
    return new CellTypeSwitcher(panel.content);
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
    toolbar.addItem('cellType', createCellTypeItem(panel));
    toolbar.addItem('spacer', Toolbar.createSpacerItem());
    toolbar.addItem('kernelName', Toolbar.createKernelNameItem(panel.session));
    toolbar.addItem('kernelStatus', Toolbar.createKernelStatusItem(panel.session));
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

    this._select = this.node.firstChild as HTMLSelectElement;
    Styling.wrapSelect(this._select);
    this._wildCard = document.createElement('option');
    this._wildCard.value = '-';
    this._wildCard.textContent = '-';
    this._notebook = widget;

    // Set the initial value.
    if (widget.model) {
      this._updateValue();
    }

    // Follow the type of the active cell.
    widget.activeCellChanged.connect(this._updateValue, this);

    // Follow a change in the selection.
    widget.selectionChanged.connect(this._updateValue, this);
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
      this._evtChange(event);
      break;
    case 'keydown':
      this._evtKeyDown(event as KeyboardEvent);
      break;
    default:
      break;
    }
  }

  /**
   * Handle `after-attach` messages for the widget.
   */
  protected onAfterAttach(msg: Message): void {
    this._select.addEventListener('change', this);
    this._select.addEventListener('keydown', this);
  }

  /**
   * Handle `before-detach` messages for the widget.
   */
  protected onBeforeDetach(msg: Message): void {
    this._select.removeEventListener('change', this);
    this._select.removeEventListener('keydown', this);
  }

  /**
   * Handle `changed` events for the widget.
   */
  private _evtChange(event: Event): void {
    let select = this._select;
    let widget = this._notebook;
    if (select.value === '-') {
      return;
    }
    if (!this._changeGuard) {
      let value = select.value as nbformat.CellType;
      NotebookActions.changeCellType(widget, value);
      widget.activate();
    }
  }

  /**
   * Handle `keydown` events for the widget.
   */
  private _evtKeyDown(event: KeyboardEvent): void {
    if (event.keyCode === 13) {  // Enter
      this._notebook.activate();
    }
  }

  /**
   * Update the value of the dropdown from the widget state.
   */
  private _updateValue(): void {
    let widget = this._notebook;
    let select = this._select;
    if (!widget.activeCell) {
      return;
    }
    let mType: string = widget.activeCell.model.type;
    for (let i = 0; i < widget.widgets.length; i++) {
      let child = widget.widgets[i];
      if (widget.isSelectedOrActive(child)) {
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
  private _select: HTMLSelectElement = null;
  private _notebook: Notebook = null;
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
