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
import type { ICellModel } from '@jupyterlab/cells';
import { InputPrompt, isCodeCellModel } from '@jupyterlab/cells';
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
 *
 * A single instance is meant to be shared by every render of the field. `render`
 * is called by React each time the metadata form is rebuilt, while this widget
 * owns DOM nodes and signal connections which have to outlive a single render.
 */
export class ActiveCellTool extends NotebookTools.Tool {
  constructor(options: Private.IOptions) {
    super();
    this._tracker = options.tracker;
    this._languages = options.languages;

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

    // Only edits to the current cell are rate-limited; switching cells updates
    // the display immediately, see `render`.
    this._previewDebouncer = new Debouncer<void, void, null[]>(
      () => this._updatePreview(),
      150
    );
  }

  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._disconnectCellModel();
    this._previewDebouncer.dispose();
    super.dispose();
  }

  render(props: FieldProps): JSX.Element {
    const cellModel = this._tracker.activeCell?.model ?? null;

    // `render` runs on every rebuild of the metadata form, most of which are
    // not cell changes; only re-wire and repaint when the cell actually changed.
    if (cellModel && cellModel !== this._cellModel) {
      this._disconnectCellModel();
      this._cellModel = cellModel;
      (cellModel.sharedModel as ISharedText).changed.connect(
        this._onCellContentChanged,
        this
      );
      cellModel.mimeTypeChanged.connect(this._onCellContentChanged, this);

      // Not debounced: the prompt and the preview are already on screen showing
      // the previous cell, so a delayed update is visible as a stale frame.
      this._updatePrompt();
      this._updatePreview().catch(console.warn);
    }

    return (
      <div
        ref={ref => {
          if (ref && this.node.parentElement !== ref) {
            ref.appendChild(this.node);
          }
        }}
      ></div>
    );
  }

  /**
   * Handle a change to the current cell source, mime type or execution count.
   */
  private _onCellContentChanged(): void {
    // The prompt is a single text node, cheap enough to keep in sync with every
    // change; re-highlighting the source line is not, so it stays debounced.
    this._updatePrompt();
    this._previewDebouncer.invoke().catch(console.warn);
  }

  /**
   * Stop listening to the cell model the tool is currently displaying.
   */
  private _disconnectCellModel(): void {
    const cellModel = this._cellModel;
    if (!cellModel) {
      return;
    }
    (cellModel.sharedModel as ISharedText).changed.disconnect(
      this._onCellContentChanged,
      this
    );
    cellModel.mimeTypeChanged.disconnect(this._onCellContentChanged, this);
    this._cellModel = null;
  }

  /**
   * Synchronously reflect the execution count of the current cell.
   */
  private _updatePrompt(): void {
    const cellModel = this._cellModel;
    if (!cellModel) {
      return;
    }
    if (isCodeCellModel(cellModel)) {
      this._inputPrompt.executionCount = `${cellModel.executionCount ?? ''}`;
      this._inputPrompt.show();
    } else {
      this._inputPrompt.executionCount = null;
      this._inputPrompt.hide();
    }
  }

  /**
   * Highlight the first line of the current cell into the preview.
   */
  private async _updatePreview(): Promise<void> {
    const cellModel = this._cellModel;
    if (!cellModel) {
      return;
    }

    // Highlight into a detached node and swap the result in as a single
    // mutation: clearing the preview before an awaited highlight leaves it blank
    // for as long as loading the language mode takes.
    const pending = ++this._previewId;
    const staging = document.createElement('pre');
    await this._languages.highlight(
      cellModel.sharedModel.getSource().split('\n')[0],
      this._languages.findByMIME(cellModel.mimeType),
      staging
    );
    if (pending !== this._previewId) {
      // A newer update started while this one was highlighting.
      return;
    }
    this._editorEl.replaceChildren(...staging.childNodes);
  }

  private _tracker: INotebookTracker;
  private _languages: IEditorLanguageRegistry;
  private _cellModel: ICellModel | null = null;
  private _previewDebouncer: Debouncer<void, void, null[]>;
  private _previewId = 0;
  private _editorEl: HTMLPreElement;
  private _inputPrompt: InputPrompt;
}
