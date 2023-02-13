import React from 'react';
import { FieldProps } from '@rjsf/utils';
import { INotebookTracker, NotebookTools } from '@jupyterlab/notebook';

namespace Private {
  /**
   * Custom metadata field options.
   */
  export interface IOptions {
    /**
     * The tracker to the notebook panel.
     */
    tracker: INotebookTracker;
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
export class ActiveCellTool extends NotebookTools.ActiveCellTool {
  constructor(options: Private.IOptions) {
    super();
    this._tracker = options.tracker;
  }

  render(props: FieldProps): JSX.Element {
    const activeCell = this._tracker.activeCell;
    if (activeCell) this._cellModel = activeCell?.model || null;
    this.refresh();
    return (
      <div className="cell-tool">
        <div ref={ref => ref?.appendChild(this.node)}></div>
      </div>
    );
  }

  private _tracker: INotebookTracker;
}
