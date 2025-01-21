/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import React from 'react';
import { FieldProps } from '@rjsf/utils';
import { INotebookTracker, NotebookTools } from '@jupyterlab/notebook';
import { ITranslator } from '@jupyterlab/translation';
import { CodeEditor } from '@jupyterlab/codeeditor';
import { ObservableJSON } from '@jupyterlab/observables';
import { JSONObject } from '@lumino/coreutils';

const CELL_METADATA_EDITOR_CLASS = 'jp-CellMetadataEditor';
const NOTEBOOK_METADATA_EDITOR_CLASS = 'jp-NotebookMetadataEditor';

namespace Private {
  /**
   * Custom metadata field options.
   */
  export interface IOptions {
    /**
     * The editor factory used by the tool.
     */
    editorFactory: CodeEditor.Factory;

    /**
     * The tracker to the notebook panel.
     */
    tracker: INotebookTracker;

    /**
     * The label of the JSON editor.
     */
    label?: string;

    /**
     * Language translator.
     */
    translator?: ITranslator;
  }
}

/**
 * The cell metadata field.
 *
 * ## Note
 * This field does not work as other metadata form fields, as it does not use RJSF to update metadata.
 * It extends the MetadataEditorTool which updates itself the metadata.
 * It only renders the node of MetadataEditorTool in a React element instead of displaying a RJSF field.
 */
export class CellMetadataField extends NotebookTools.MetadataEditorTool {
  constructor(options: Private.IOptions) {
    super(options);
    this._tracker = options.tracker;

    this.editor.editorHostNode.addEventListener('blur', this.editor, true);
    this.editor.editorHostNode.addEventListener('click', this.editor, true);
    this.editor.headerNode.addEventListener('click', this.editor);
  }

  private _onSourceChanged() {
    const activeCell = this._tracker.activeCell?.model.sharedModel;
    if (activeCell && this.editor.source) {
      const metadataKeys = Object.keys(activeCell.metadata ?? {});
      const source = this.editor.source.toJSON() ?? {};

      activeCell.transact(() => {
        // Iterate over all existing metadata keys and delete each one.
        // This ensures that any keys not present in the new metadata are removed.
        metadataKeys.forEach(key => activeCell.deleteMetadata(key));
        activeCell.setMetadata(source);
      });
    }
  }

  render(props: FieldProps): JSX.Element {
    const cell = this._tracker.activeCell;
    this.editor.source = cell
      ? new ObservableJSON({ values: cell.model.metadata as JSONObject })
      : null;
    this.editor.source?.changed.connect(this._onSourceChanged, this);

    return (
      <div className={CELL_METADATA_EDITOR_CLASS}>
        <div ref={ref => ref?.appendChild(this.node)}></div>
      </div>
    );
  }

  private _tracker: INotebookTracker;
}

/**
 * The notebook metadata field.
 *
 * ## Note
 * This field does not work as other metadata form fields, as it does not use RJSF to update metadata.
 * It extends the MetadataEditorTool which updates itself the metadata.
 * It only renders the node of MetadataEditorTool in a React element instead of displaying a RJSF field.
 */
export class NotebookMetadataField extends NotebookTools.MetadataEditorTool {
  constructor(options: Private.IOptions) {
    super(options);
    this._tracker = options.tracker;

    this.editor.editorHostNode.addEventListener('blur', this.editor, true);
    this.editor.editorHostNode.addEventListener('click', this.editor, true);
    this.editor.headerNode.addEventListener('click', this.editor);
  }

  private _onSourceChanged() {
    if (this.editor.source) {
      this._tracker.currentWidget?.model?.sharedModel.setMetadata(
        this.editor.source.toJSON()
      );
    }
  }

  render(props: FieldProps): JSX.Element {
    const notebook = this._tracker.currentWidget;
    this.editor.source = notebook
      ? new ObservableJSON({ values: notebook.model?.metadata as JSONObject })
      : null;
    this.editor.source?.changed.connect(this._onSourceChanged, this);

    return (
      <div className={NOTEBOOK_METADATA_EDITOR_CLASS}>
        <div ref={ref => ref?.appendChild(this.node)}></div>
      </div>
    );
  }

  private _tracker: INotebookTracker;
}
