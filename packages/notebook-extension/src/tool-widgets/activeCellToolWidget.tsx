/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import React from 'react';
import type { FieldProps } from '@rjsf/utils';
import type { IEditorLanguageRegistry } from '@jupyterlab/codemirror';
import type { INotebookTracker } from '@jupyterlab/notebook';
import { NotebookTools } from '@jupyterlab/notebook';
import type { ISharedText } from '@jupyter/ydoc';
import { PanelLayout, Widget } from '@lumino/widgets';
import type { CodeCellModel, ICellModel } from '@jupyterlab/cells';
import { InputPrompt } from '@jupyterlab/cells';
import { Debouncer } from '@lumino/polling';

/**
 * The class name added to the ActiveCellTool.
 */
const ACTIVE_CELL_TOOL_CLASS = 'jp-ActiveCellTool';

/**
 * The class name added to the ActiveCellTool content.
 */
const ACTIVE_CELL_TOOL_CONTENT_CLASS = 'jp-ActiveCellTool-Content';

/**
 * The class name added to the ActiveCellTool cell content.
 */
const ACTIVE_CELL_TOOL_CELL_CONTENT_CLASS =
  'jp-ActiveCellTool-CellContent';

/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * Initialization options for ActiveCellTool.
   */
  export interface IOptions {
    /** The notebook tracker */
    tracker: INotebookTracker;

    /** Editor language registry */
    languages: IEditorLanguageRegistry;
  }
}

/**
 * A notebook tool displaying the first line and execution count
 * of the currently active cell.
 */
export class ActiveCellTool extends NotebookTools.Tool {
  constructor(options: Private.IOptions) {
    super();

    this._tracker = options.tracker;
    this._languages = options.languages;

    this.addClass(ACTIVE_CELL_TOOL_CLASS);
    this.layout = new PanelLayout();

    // Prompt showing execution count for code cells
    this._inputPrompt = new InputPrompt();
    (this.layout as PanelLayout).addWidget(this._inputPrompt);

    // Container for highlighted source preview
    const node = document.createElement('div');
    node.classList.add(ACTIVE_CELL_TOOL_CONTENT_CLASS);

    const container = node.appendChild(document.createElement('div'));
    container.className = ACTIVE_CELL_TOOL_CELL_CONTENT_CLASS;

    this._editorEl = container.appendChild(document.createElement('pre'));

    (this.layout as PanelLayout).addWidget(new Widget({ node }));

    /**
     * Update the UI to reflect the active cell state.
     */
    const update = async () => {
      this._editorEl.textContent = '';

      const model = this._cellModel;
      const type = model?.type ?? null;

      // Only update prompt visibility when type changes
      if (type !== this._previousCellType) {
        if (type === 'code') {
          this._inputPrompt.executionCount =
            (model as CodeCellModel).executionCount ?? '';
          this._inputPrompt.show();
        } else {
          this._inputPrompt.executionCount = null;
          this._inputPrompt.hide();
        }
      }

      this._previousCellType = type;

      // Highlight first line of cell source
      if (model) {
        const lang = this._languages.findByMIME(model.mimeType);
        if (lang) {
          await this._languages.highlight(
            model.sharedModel.getSource().split('\n')[0],
            lang,
            this._editorEl
          );
        }
      }
    };

    // Debounced refresh to prevent flicker
    this._refreshDebouncer = new Debouncer(update, 120);
  }

  /**
   * React render hook used ONLY as mount point for Lumino widget.
   * Lumino owns DOM. React only provides host container.
   */
  render(_: FieldProps): JSX.Element {
    const activeCell = this._tracker.activeCell;
    const newModel = activeCell?.model ?? null;

    // Only reconnect signals when model actually changes
    if (this._cellModel !== newModel) {
      this._disconnectSignals();
      this._cellModel = newModel;
      this._connectSignals();
      void this.refresh();
    }

    return (
      <div
        ref={host => {
          if (!host) {
            return;
          }

          // Attach only once
          if (this.node.parentElement !== host) {
            Widget.attach(this, host);
          }
        }}
      />
    );
  }

  /**
   * Connect signals from current cell model.
   */
  private _connectSignals(): void {
    if (!this._cellModel) return;

    (this._cellModel.sharedModel as ISharedText).changed.connect(
      this.refresh,
      this
    );
    this._cellModel.mimeTypeChanged.connect(this.refresh, this);
  }

  /**
   * Disconnect signals from previous cell model.
   */
  private _disconnectSignals(): void {
    if (!this._cellModel) return;

    (this._cellModel.sharedModel as ISharedText).changed.disconnect(
      this.refresh,
      this
    );
    this._cellModel.mimeTypeChanged.disconnect(this.refresh, this);
  }

  /**
   * Refresh the widget UI.
   */
  private async refresh(): Promise<void> {
    await this._refreshDebouncer.invoke();
  }

  private _tracker: INotebookTracker;
  private _languages: IEditorLanguageRegistry;
  private _cellModel: ICellModel | null = null;
  private _previousCellType: ICellModel['type'] | null = null;
  private _refreshDebouncer: Debouncer<void, void, null[]>;
  private _editorEl: HTMLPreElement;
  private _inputPrompt: InputPrompt;
}



