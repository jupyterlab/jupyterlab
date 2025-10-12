// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Toolbar as AppToolbar,
  Dialog,
  ISessionContext,
  ISessionContextDialogs,
  SessionContextDialogs,
  showDialog
} from '@jupyterlab/apputils';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import * as nbformat from '@jupyterlab/nbformat';
import {
  ITranslator,
  nullTranslator,
  TranslationBundle
} from '@jupyterlab/translation';
import {
  addIcon,
  addToolbarButtonClass,
  copyIcon,
  cutIcon,
  fastForwardIcon,
  HTMLSelect,
  pasteIcon,
  ReactWidget,
  runIcon,
  saveIcon,
  Toolbar,
  ToolbarButton,
  ToolbarButtonComponent,
  UseSignal
} from '@jupyterlab/ui-components';
import * as React from 'react';
import { NotebookActions } from './actions';
import { NotebookPanel } from './panel';
import { Notebook } from './widget';

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
   *
   * @deprecated since v3.2
   * This is dead code now.
   */
  export function createSaveButton(
    panel: NotebookPanel,
    translator?: ITranslator
  ): ReactWidget {
    const trans = (translator || nullTranslator).load('jupyterlab');
    function onClick() {
      if (panel.context.model.readOnly) {
        return showDialog({
          title: trans.__('Cannot Save'),
          body: trans.__('Document is read-only'),
          buttons: [Dialog.okButton()]
        });
      }
      void panel.context.save().then(() => {
        if (!panel.isDisposed) {
          return panel.context.createCheckpoint();
        }
      });
    }

    return addToolbarButtonClass<ReactWidget>(
      ReactWidget.create(
        <UseSignal signal={panel.context.fileChanged}>
          {() => (
            <ToolbarButtonComponent
              icon={saveIcon}
              onClick={onClick}
              tooltip={trans.__(
                'Save the notebook contents and create checkpoint'
              )}
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
   *
   * @deprecated since v3.2
   * This is dead code now.
   */
  export function createInsertButton(
    panel: NotebookPanel,
    translator?: ITranslator
  ): ReactWidget {
    const trans = (translator || nullTranslator).load('jupyterlab');
    return new ToolbarButton({
      icon: addIcon,
      onClick: () => {
        NotebookActions.insertBelow(panel.content);
      },
      tooltip: trans.__('Insert a cell below')
    });
  }

  /**
   * Create a cut toolbar item.
   *
   * @deprecated since v3.2
   * This is dead code now.
   */
  export function createCutButton(
    panel: NotebookPanel,
    translator?: ITranslator
  ): ReactWidget {
    const trans = (translator || nullTranslator).load('jupyterlab');
    return new ToolbarButton({
      icon: cutIcon,
      onClick: async (): Promise<void> => {
        await NotebookActions.cutToSystemClipboard(panel.content);
      },
      tooltip: trans.__('Cut the selected cells')
    });
  }

  /**
   * Create a copy toolbar item.
   *
   * @deprecated since v3.2
   * This is dead code now.
   */
  export function createCopyButton(
    panel: NotebookPanel,
    translator?: ITranslator
  ): ReactWidget {
    const trans = (translator || nullTranslator).load('jupyterlab');
    return new ToolbarButton({
      icon: copyIcon,
      onClick: async (): Promise<void> => {
        await NotebookActions.copyToSystemClipboard(panel.content);
      },
      tooltip: trans.__('Copy the selected cells')
    });
  }

  /**
   * Create a paste toolbar item.
   *
   * @deprecated since v3.2
   * This is dead code now.
   */
  export function createPasteButton(
    panel: NotebookPanel,
    translator?: ITranslator
  ): ReactWidget {
    const trans = (translator || nullTranslator).load('jupyterlab');
    return new ToolbarButton({
      icon: pasteIcon,
      onClick: async (): Promise<void> => {
        await NotebookActions.pasteFromSystemClipboard(panel.content);
      },
      tooltip: trans.__('Paste cells from the clipboard')
    });
  }

  /**
   * Create a run toolbar item.
   *
   * @deprecated since v3.2
   * This is dead code now.
   */
  export function createRunButton(
    panel: NotebookPanel,
    sessionDialogs?: ISessionContextDialogs,
    translator?: ITranslator
  ): ReactWidget {
    const trans = (translator ?? nullTranslator).load('jupyterlab');
    return new ToolbarButton({
      icon: runIcon,
      onClick: () => {
        void NotebookActions.runAndAdvance(
          panel.content,
          panel.sessionContext,
          sessionDialogs,
          translator
        );
      },
      tooltip: trans.__('Run the selected cells and advance')
    });
  }
  /**
   * Create a restart run all toolbar item
   *
   * @deprecated since v3.2
   * This is dead code now.
   */
  export function createRestartRunAllButton(
    panel: NotebookPanel,
    dialogs?: ISessionContext.IDialogs,
    translator?: ITranslator
  ): ReactWidget {
    const trans = (translator ?? nullTranslator).load('jupyterlab');
    return new ToolbarButton({
      icon: fastForwardIcon,
      onClick: () => {
        const dialogs_ = dialogs ?? new SessionContextDialogs({ translator });
        void dialogs_.restart(panel.sessionContext).then(restarted => {
          if (restarted) {
            void NotebookActions.runAll(
              panel.content,
              panel.sessionContext,
              dialogs_,
              translator
            );
          }
          return restarted;
        });
      },
      tooltip: trans.__('Restart the kernel, then re-run the whole notebook')
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
  export function createCellTypeItem(
    panel: NotebookPanel,
    translator?: ITranslator
  ): ReactWidget {
    return new CellTypeSwitcher(panel.content, translator);
  }

  /**
   * Get the default toolbar items for panel
   *
   * @deprecated since v4
   */
  export function getDefaultItems(
    panel: NotebookPanel,
    sessionDialogs?: ISessionContextDialogs,
    translator?: ITranslator
  ): DocumentRegistry.IToolbarItem[] {
    return [
      { name: 'save', widget: createSaveButton(panel, translator) },
      { name: 'insert', widget: createInsertButton(panel, translator) },
      { name: 'cut', widget: createCutButton(panel, translator) },
      { name: 'copy', widget: createCopyButton(panel, translator) },
      { name: 'paste', widget: createPasteButton(panel, translator) },
      {
        name: 'run',
        widget: createRunButton(panel, sessionDialogs, translator)
      },
      {
        name: 'interrupt',
        widget: AppToolbar.createInterruptButton(
          panel.sessionContext,
          translator
        )
      },
      {
        name: 'restart',
        widget: AppToolbar.createRestartButton(
          panel.sessionContext,
          sessionDialogs,
          translator
        )
      },
      {
        name: 'restart-and-run',
        widget: createRestartRunAllButton(panel, sessionDialogs, translator)
      },
      { name: 'cellType', widget: createCellTypeItem(panel, translator) },
      { name: 'spacer', widget: Toolbar.createSpacerItem() },
      {
        name: 'kernelName',
        widget: AppToolbar.createKernelNameItem(
          panel.sessionContext,
          sessionDialogs,
          translator
        )
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
  constructor(widget: Notebook, translator?: ITranslator) {
    super();
    this._trans = (translator || nullTranslator).load('jupyterlab');
    this.addClass(TOOLBAR_CELLTYPE_CLASS);
    this._notebook = widget;
    if (widget.model) {
      this.update();
    }
    widget.activeCellChanged.connect(this.update, this);
    // Follow a change in the selection.
    widget.selectionChanged.connect(this.update, this);
  }

  /**
   * Handle `change` events for the HTMLSelect component.
   */
  handleChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    if (event.target.value !== '-') {
      NotebookActions.changeCellType(
        this._notebook,
        event.target.value as nbformat.CellType
      );
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

  render(): JSX.Element {
    let value = '-';
    if (this._notebook.activeCell) {
      value = this._notebook.activeCell.model.type;
    }
    for (const widget of this._notebook.widgets) {
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
        aria-label={this._trans.__('Cell type')}
        title={this._trans.__('Select the cell type')}
      >
        <option value="-">-</option>
        <option value="code">{this._trans.__('Code')}</option>
        <option value="markdown">{this._trans.__('Markdown')}</option>
        <option value="raw">{this._trans.__('Raw')}</option>
      </HTMLSelect>
    );
  }

  private _trans: TranslationBundle;
  private _notebook: Notebook;
}
