import React from 'react';
import { FieldProps } from '@rjsf/core';
import { INotebookTracker, NotebookTools } from '@jupyterlab/notebook';
import { ITranslator } from '@jupyterlab/translation';
import { CodeEditor } from '@jupyterlab/codeeditor';

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
export class CustomCellMetadata extends NotebookTools.MetadataEditorTool {
  constructor(options: Private.IOptions) {
    super(options);
    this._tracker = options.tracker;

    this.editor.editorHostNode.addEventListener('blur', this.editor, true);
    this.editor.editorHostNode.addEventListener('click', this.editor, true);
    this.editor.headerNode.addEventListener('click', this.editor);
  }

  render(props: FieldProps): JSX.Element {
    this.editor.source = this._tracker.activeCell?.model?.metadata ?? null;
    return (
      <div className="cell-metadata-editor">
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
export class CustomNotebookMetadata extends NotebookTools.MetadataEditorTool {
  constructor(options: Private.IOptions) {
    super(options);
    this._tracker = options.tracker;

    this.editor.editorHostNode.addEventListener('blur', this.editor, true);
    this.editor.editorHostNode.addEventListener('click', this.editor, true);
    this.editor.headerNode.addEventListener('click', this.editor);
  }

  render(props: FieldProps): JSX.Element {
    this.editor.source = this._tracker.currentWidget?.model?.metadata ?? null;
    return (
      <div className="cell-metadata-editor">
        <div ref={ref => ref?.appendChild(this.node)}></div>
      </div>
    );
  }

  private _tracker: INotebookTracker;
}
