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
 * A single instance is meant to be shared by every render of the field. The
 * displayed cell follows the notebook tracker rather than the render calls, so
 * that the field keeps working when the metadata form is not being rebuilt, and
 * so that it does not hold on to a cell model of a closed notebook.
 *
 * One instance owns one node, so the field can only be mounted in one place at
 * a time: `render` moves the node to the most recent mount point and leaves any
 * earlier one empty. Nothing renders this field twice today.
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
    // the display immediately, see `_onActiveCellChanged`.
    this._previewDebouncer = new Debouncer<void, void, null[]>(
      () => this._update(),
      150
    );

    this._tracker.activeCellChanged.connect(this._onActiveCellChanged, this);
    // `activeCellChanged` is not emitted when the last notebook is closed:
    // NotebookTracker.onCurrentChanged returns early on a null widget. Without
    // this second connection the field would keep the cell model of a closed
    // notebook, and its shared model, alive for the rest of the session.
    this._tracker.currentChanged.connect(this._onActiveCellChanged, this);
    this._onActiveCellChanged();
  }

  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._tracker.activeCellChanged.disconnect(this._onActiveCellChanged, this);
    this._tracker.currentChanged.disconnect(this._onActiveCellChanged, this);
    this._disconnectCellModel();
    this._previewDebouncer.dispose();
    super.dispose();
  }

  render(props: FieldProps): JSX.Element {
    // The content is driven by the tracker; React only supplies the mount
    // point, which is a different element on every rebuild of the form.
    return (
      <div
        ref={ref => {
          if (!ref || this.node.parentElement === ref) {
            return;
          }
          ref.appendChild(this.node);
          if (this._pendingUpdate) {
            this._update().catch(console.warn);
          }
        }}
      ></div>
    );
  }

  /**
   * Follow the active cell of the tracker, which is null once the last
   * notebook is closed.
   */
  private _onActiveCellChanged(): void {
    const cellModel = this._tracker.activeCell?.model ?? null;
    if (cellModel === this._cellModel) {
      return;
    }
    this._disconnectCellModel();
    this._cellModel = cellModel;
    if (cellModel) {
      (cellModel.sharedModel as ISharedText).changed.connect(
        this._onCellContentChanged,
        this
      );
      cellModel.mimeTypeChanged.connect(this._onCellContentChanged, this);
    }
    // The prompt now belongs to a cell whose source line is not on screen yet,
    // so leave it to `_update` to write both together.
    this._promptOutdated = true;
    this._update().catch(console.warn);
  }

  /**
   * Handle a change to the current cell source, mime type or execution count.
   */
  private _onCellContentChanged(): void {
    if (!this.node.isConnected) {
      this._pendingUpdate = true;
      this._promptOutdated = true;
      return;
    }
    if (!this._promptOutdated) {
      // The cell is unchanged and no switch is in flight, so writing the prompt
      // now cannot pair it with the source line of a different cell.
      this._updatePrompt();
    }
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
   * Reflect the execution count of the current cell.
   */
  private _updatePrompt(): void {
    const cellModel = this._cellModel;
    if (cellModel && isCodeCellModel(cellModel)) {
      this._inputPrompt.executionCount = `${cellModel.executionCount ?? ''}`;
      this._inputPrompt.show();
    } else {
      this._inputPrompt.executionCount = null;
      this._inputPrompt.hide();
    }
  }

  /**
   * Refresh the preview, writing an outdated prompt along with it.
   *
   * The prompt is written in the same task as the preview it belongs with, so
   * that the field never shows the prompt of one cell above the source line of
   * another while a language mode is being loaded.
   */
  private async _update(): Promise<void> {
    if (!this.node.isConnected) {
      // Nothing is on screen; catch up when the field is mounted again.
      this._pendingUpdate = true;
      return;
    }
    this._pendingUpdate = false;

    const cellModel = this._cellModel;
    const pending = ++this._updateId;

    if (!cellModel) {
      this._promptOutdated = false;
      this._updatePrompt();
      this._editorEl.replaceChildren();
      return;
    }

    const source = cellModel.sharedModel.getSource();
    const lineEnd = source.indexOf('\n');
    const firstLine = lineEnd === -1 ? source : source.slice(0, lineEnd);

    // Highlight into a detached node, so that the preview is never cleared
    // while waiting for a language mode to load.
    const staging = document.createElement('pre');
    try {
      await this._languages.highlight(
        firstLine,
        this._languages.findByMIME(cellModel.mimeType),
        staging
      );
    } catch (error) {
      // Fall back to unhighlighted source rather than keeping the previous
      // cell's line on screen.
      console.warn(error);
      staging.replaceChildren(document.createTextNode(firstLine));
    }

    if (pending !== this._updateId) {
      // A newer update started while this one was highlighting; it still owes
      // the prompt write, so `_promptOutdated` is deliberately left set.
      return;
    }

    if (this._promptOutdated) {
      this._updatePrompt();
      this._promptOutdated = false;
    }
    const fragment = document.createDocumentFragment();
    while (staging.firstChild) {
      fragment.appendChild(staging.firstChild);
    }
    this._editorEl.replaceChildren(fragment);
  }

  private _tracker: INotebookTracker;
  private _languages: IEditorLanguageRegistry;
  private _cellModel: ICellModel | null = null;
  private _previewDebouncer: Debouncer<void, void, null[]>;
  private _updateId = 0;
  private _pendingUpdate = false;
  private _promptOutdated = false;
  private _editorEl: HTMLPreElement;
  private _inputPrompt: InputPrompt;
}
