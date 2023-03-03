/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import React from 'react';
import { FieldProps } from '@rjsf/utils';
import { IEditorLanguageRegistry } from '@jupyterlab/codemirror';
import { INotebookTracker, NotebookTools } from '@jupyterlab/notebook';
import { ISharedText } from '@jupyter/ydoc';
import { PanelLayout, Widget } from '@lumino/widgets';
import { CodeCellModel, ICellModel, InputPrompt } from '@jupyterlab/cells';
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
const ACTIVE_CELL_TOOL_CELL_CONTENT_CLASS = 'jp-ActiveCellTool-CellContent';

namespace Private {
  /**
   * Custom active cell field options.
   */
  export interface IOptions {
    /**
     * The tracker to the notebook panel.
     */
    tracker: INotebookTracker;

    /**
     * Editor languages registry
     */
    languages: IEditorLanguageRegistry;
  }
}

/**
 * The active cell field, displaying the first line and execution count of the active cell.
 *
 * ## Note
 * This field does not work as other metadata form fields, as it does not update metadata.
 */
export class ActiveCellTool extends NotebookTools.Tool {
  constructor(options: Private.IOptions) {
    super();
    const { languages } = options;
    this._tracker = options.tracker;

    this.addClass(ACTIVE_CELL_TOOL_CLASS);
    this.layout = new PanelLayout();

    this._inputPrompt = new InputPrompt();
    (this.layout as PanelLayout).addWidget(this._inputPrompt);

    // First code line container
    const node = document.createElement('div');
    node.classList.add(ACTIVE_CELL_TOOL_CONTENT_CLASS);
    const container = node.appendChild(document.createElement('div'));
    const editor = container.appendChild(document.createElement('pre'));
    container.className = ACTIVE_CELL_TOOL_CELL_CONTENT_CLASS;
    this._editorEl = editor;
    (this.layout as PanelLayout).addWidget(new Widget({ node }));

    const update = async () => {
      this._editorEl.innerHTML = '';
      if (this._cellModel?.type === 'code') {
        this._inputPrompt.executionCount = `${
          (this._cellModel as CodeCellModel).executionCount ?? ''
        }`;
        this._inputPrompt.show();
      } else {
        this._inputPrompt.executionCount = null;
        this._inputPrompt.hide();
      }

      if (this._cellModel) {
        await languages.highlight(
          this._cellModel.sharedModel.getSource().split('\n')[0],
          languages.findByMIME(this._cellModel.mimeType),
          this._editorEl
        );
      }
    };

    this._refreshDebouncer = new Debouncer(update, 150);
  }

  render(props: FieldProps): JSX.Element {
    const activeCell = this._tracker.activeCell;
    if (activeCell) this._cellModel = activeCell?.model || null;
    (this._cellModel?.sharedModel as ISharedText).changed.connect(
      this.refresh,
      this
    );
    this._cellModel?.mimeTypeChanged.connect(this.refresh, this);
    this.refresh()
      .then(() => undefined)
      .catch(() => undefined);
    return <div ref={ref => ref?.appendChild(this.node)}></div>;
  }

  private async refresh(): Promise<void> {
    await this._refreshDebouncer.invoke();
  }

  private _tracker: INotebookTracker;
  private _cellModel: ICellModel | null;
  private _refreshDebouncer: Debouncer<void, void, null[]>;
  private _editorEl: HTMLPreElement;
  private _inputPrompt: InputPrompt;
}
