// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as React from 'react';

import { DocumentRegistry } from '@jupyterlab/docregistry';

import { Widget } from '@phosphor/widgets';

import { NotebookActions } from './actions';

import {
  showDialog,
  Dialog,
  Toolbar,
  ToolbarButtonComponent,
  UseSignal,
  addToolbarButtonClass,
  ReactWidget,
  ToolbarButton
} from '@jupyterlab/apputils';

import { nbformat } from '@jupyterlab/coreutils';

import { HTMLSelect } from '@jupyterlab/ui-components';

import { NotebookPanel } from './panel';

import { Notebook } from './widget';

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
export namespace ToolbarItems {
  /**
   * Create save button toolbar item.
   */
  export function createSaveButton(panel: NotebookPanel): Widget {
    function onClick() {
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
    }
    return addToolbarButtonClass(
      ReactWidget.create(
        <UseSignal signal={panel.context.fileChanged}>
          {() => (
            <ToolbarButtonComponent
              iconClassName={TOOLBAR_SAVE_CLASS + ' jp-Icon jp-Icon-16'}
              onClick={onClick}
              tooltip="Save the notebook contents and create checkpoint"
              enabled={
                !!(
                  panel &&
                  panel.context &&
                  panel.context.contentsModel &&
                  panel.context.contentsModel.writable
                )
              }
            />
          )}
        </UseSignal>
      )
    );
  }

  /**
   * Create an insert toolbar item.
   */
  export function createInsertButton(panel: NotebookPanel): Widget {
    return new ToolbarButton({
      iconClassName: TOOLBAR_INSERT_CLASS + ' jp-Icon jp-Icon-16',
      onClick: () => {
        NotebookActions.insertBelow(panel.content);
      },
      tooltip: 'Insert a cell below'
    });
  }

  /**
   * Create a cut toolbar item.
   */
  export function createCutButton(panel: NotebookPanel): Widget {
    return new ToolbarButton({
      iconClassName: TOOLBAR_CUT_CLASS + ' jp-Icon jp-Icon-16',
      onClick: () => {
        NotebookActions.cut(panel.content);
      },
      tooltip: 'Cut the selected cells'
    });
  }

  /**
   * Create a copy toolbar item.
   */
  export function createCopyButton(panel: NotebookPanel): Widget {
    return new ToolbarButton({
      iconClassName: TOOLBAR_COPY_CLASS + ' jp-Icon jp-Icon-16',
      onClick: () => {
        NotebookActions.copy(panel.content);
      },
      tooltip: 'Copy the selected cells'
    });
  }

  /**
   * Create a paste toolbar item.
   */
  export function createPasteButton(panel: NotebookPanel): Widget {
    return new ToolbarButton({
      iconClassName: TOOLBAR_PASTE_CLASS + ' jp-Icon jp-Icon-16',
      onClick: () => {
        NotebookActions.paste(panel.content);
      },
      tooltip: 'Paste cells from the clipboard'
    });
  }

  /**
   * Create a run toolbar item.
   */
  export function createRunButton(panel: NotebookPanel): Widget {
    return new ToolbarButton({
      iconClassName: TOOLBAR_RUN_CLASS + ' jp-Icon jp-Icon-16',
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
  export function createCellTypeItem(panel: NotebookPanel): Widget {
    return new CellTypeSwitcher(panel.content);
  }

  /**
   * Get the default toolbar items for panel
   */
  export function getDefaultItems(
    panel: NotebookPanel
  ): DocumentRegistry.IToolbarItem[] {
    return [
      { name: 'save', widget: createSaveButton(panel) },
      { name: 'insert', widget: createInsertButton(panel) },
      { name: 'cut', widget: createCutButton(panel) },
      { name: 'copy', widget: createCopyButton(panel) },
      { name: 'paste', widget: createPasteButton(panel) },
      { name: 'run', widget: createRunButton(panel) },
      {
        name: 'interrupt',
        widget: Toolbar.createInterruptButton(panel.session)
      },
      {
        name: 'restart',
        widget: Toolbar.createRestartButton(panel.session)
      },
      { name: 'cellType', widget: createCellTypeItem(panel) },
      { name: 'spacer', widget: Toolbar.createSpacerItem() },
      {
        name: 'kernelName',
        widget: Toolbar.createKernelNameItem(panel.session)
      },
      {
        name: 'kernelStatus',
        widget: Toolbar.createKernelStatusItem(panel.session)
      }
    ];
  }
}

/**
 * A toolbar widget that switches cell types.
 */
export class CellTypeSwitcher extends ReactWidget {
  /**
   * Construct a new cell type switcher.
   */
  constructor(widget: Notebook) {
    super();
    this.addClass(TOOLBAR_CELLTYPE_CLASS);
    this._notebook = widget;
    if (widget.model) {
      this.update();
    }
    widget.activeCellChanged.connect(
      this.update,
      this
    );
    // Follow a change in the selection.
    widget.selectionChanged.connect(
      this.update,
      this
    );
  }

  /**
   * Handle `change` events for the HTMLSelect component.
   */
  handleChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    if (event.target.value !== '-') {
      NotebookActions.changeCellType(this._notebook, event.target
        .value as nbformat.CellType);
      this._notebook.activate();
    }
  };

  /**
   * Handle `keydown` events for the HTMLSelect component.
   */
  handleKeyDown = (event: React.KeyboardEvent): void => {
    if (event.keyCode === 13) {
      this._notebook.activate();
    }
  };

  render() {
    let value = '-';
    if (this._notebook.activeCell) {
      value = this._notebook.activeCell.model.type;
    }
    for (let widget of this._notebook.widgets) {
      if (this._notebook.isSelectedOrActive(widget)) {
        if (widget.model.type !== value) {
          value = '-';
          break;
        }
      }
    }
    return (
      <HTMLSelect
        className={TOOLBAR_CELLTYPE_DROPDOWN_CLASS}
        onChange={this.handleChange}
        onKeyDown={this.handleKeyDown}
        value={value}
        minimal
      >
        <option value="-">-</option>
        <option value="code">Code</option>
        <option value="markdown">Markdown</option>
        <option value="raw">Raw</option>
      </HTMLSelect>
    );
  }

  private _notebook: Notebook = null;
}
