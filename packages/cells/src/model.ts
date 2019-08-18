/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { IAttachmentsModel } from '@jupyterlab/attachments';

import { CodeEditor } from '@jupyterlab/codeeditor';

import { nbformat } from '@jupyterlab/coreutils';

import { DatastoreExt } from '@jupyterlab/datastore';

import { OutputAreaModel } from '@jupyterlab/outputarea';

import { IOutputModel } from '@jupyterlab/rendermime';

import { JSONExt, JSONObject, ReadonlyJSONValue } from '@phosphor/coreutils';

import {
  Fields,
  ListField,
  MapField,
  RegisterField,
  Schema
} from '@phosphor/datastore';

/**
 * Utility functions for cell models.
 */
export namespace CellModel {
  /**
   * Construct a cell model from optional cell content.
   */
  export function fromJSON(
    loc: CellModel.DataLocation,
    cell?: nbformat.IBaseCell
  ) {
    // Get the intitial data for the model.
    let trusted = false;
    let metadata: JSONObject = {};
    let text = '';
    let type: nbformat.CellType = 'code';
    if (cell) {
      metadata = JSONExt.deepCopy(cell.metadata);
      trusted = !!metadata['trusted'];
      delete metadata['trusted'];

      if (cell.cell_type !== 'raw') {
        delete metadata['format'];
      }
      if (cell.cell_type !== 'code') {
        delete metadata['collapsed'];
        delete metadata['scrolled'];
      }

      if (Array.isArray(cell.source)) {
        text = (cell.source as string[]).join('');
      } else {
        text = (cell.source as string) || '';
      }

      type = cell.cell_type as nbformat.CellType;
    }
    // Set the intitial data for the model.
    DatastoreExt.withTransaction(loc.record.datastore, () => {
      DatastoreExt.updateRecord(loc.record, {
        type,
        metadata,
        trusted,
        text: { index: 0, remove: 0, text }
      });
    });
  }

  /**
   * Serialize the model to JSON.
   */
  export function toJSON(loc: CellModel.DataLocation): nbformat.ICell {
    let data = DatastoreExt.getRecord(loc.record);
    let metadata = data.metadata as JSONObject;
    if (data.trusted) {
      metadata['trusted'] = true;
    }
    return {
      cell_type: data.type,
      source: data.text,
      metadata
    } as nbformat.ICell;
  }
}

/**
 * The namespace for `CellModel` statics.
 */
export namespace CellModel {
  /**
   * A type for the common fields stored in the Cell schema.
   */
  export interface IBaseFields extends CodeEditor.IFields {
    /**
     * The type of the cell.
     */
    type: RegisterField<nbformat.CellType>;

    /**
     * Whether the cell is trusted.
     */
    trusted: RegisterField<boolean>;

    /**
     * The metadata for the cell.
     */
    metadata: MapField<ReadonlyJSONValue>;
  }

  /**
   * A union interface for all the fields stored in cell schemas
   * so that they may be stored in the same table.
   */
  export interface IFields
    extends IBaseFields,
      CodeCellModel.IFields,
      AttachmentsCellModel.IFields {}

  /**
   * An interface for a cell schema.
   */
  export interface ISchema extends Schema {
    /**
     * The id for the schema.
     */
    id: '@jupyterlab/cells:cellmodel.v1';

    /**
     * The union of cell fields.
     */
    fields: IFields;
  }

  /**
   * A concrete schema for a cell table, available at runtime.
   */
  export const SCHEMA: ISchema = {
    /**
     * The id for the schema.
     */
    id: '@jupyterlab/cells:cellmodel.v1',

    /**
     * The union of cell fields.
     */
    fields: {
      attachments: Fields.Map<nbformat.IMimeBundle>(),
      executionCount: Fields.Register<nbformat.ExecutionCount>({ value: null }),
      metadata: Fields.Map<ReadonlyJSONValue>(),
      mimeType: Fields.String(),
      outputs: Fields.List<string>(),
      selections: Fields.Map<CodeEditor.ITextSelection[]>(),
      text: Fields.Text(),
      trusted: Fields.Boolean(),
      type: Fields.Register<nbformat.CellType>({ value: 'code' })
    }
  };

  /**
   * The location of cell data in a datastore.
   */
  export type DataLocation = {
    /**
     * The record for the cell data.
     */
    record: DatastoreExt.RecordLocation<ISchema>;

    /**
     * A table in which outputs are stored.
     */
    outputs: DatastoreExt.TableLocation<IOutputModel.ISchema>;
  };
}

/**
 * The namespace for `AttachmentsCellModel` statics.
 */
export namespace AttachmentsCellModel {
  /**
   * Construct a new cell with optional attachments.
   */
  export function fromJSON(
    loc: CellModel.DataLocation,
    cell?: nbformat.IBaseCell
  ): void {
    // TODO: resurrect cell attachments.
    CellModel.fromJSON(loc, cell);
  }

  /**
   * Serialize the model to JSON.
   */
  export function toJSON(
    loc: CellModel.DataLocation
  ): nbformat.IRawCell | nbformat.IMarkdownCell {
    return CellModel.toJSON(loc) as nbformat.IRawCell | nbformat.IMarkdownCell;
  }

  /**
   * An interface for cell schema fields that can store attachments.
   */
  export interface IFields
    extends CellModel.IBaseFields,
      IAttachmentsModel.IFields {}
}

/**
 * An implementation of a raw cell model.
 */
export namespace RawCellModel {
  /**
   * Construct a new cell with optional attachments.
   */
  export function fromJSON(
    loc: CellModel.DataLocation,
    cell?: nbformat.IRawCell
  ): void {
    // TODO: resurrect cell attachments.
    DatastoreExt.withTransaction(loc.record.datastore, () => {
      AttachmentsCellModel.fromJSON(loc, cell);
      DatastoreExt.updateRecord(loc.record, {
        type: 'raw'
      });
    });
  }

  /**
   * Serialize the model to JSON.
   */
  export function toJSON(loc: CellModel.DataLocation): nbformat.IRawCell {
    return AttachmentsCellModel.toJSON(loc) as nbformat.IRawCell;
  }
}

/**
 * An implementation of a markdown cell model.
 */
export namespace MarkdownCellModel {
  /**
   * Construct a new cell with optional attachments.
   */
  export function fromJSON(
    loc: CellModel.DataLocation,
    cell?: nbformat.IMarkdownCell
  ): void {
    // TODO: resurrect cell attachments.
    DatastoreExt.withTransaction(loc.record.datastore, () => {
      AttachmentsCellModel.fromJSON(loc, cell);
      DatastoreExt.updateRecord(loc.record, {
        mimeType: 'text/x-ipythongfm',
        type: 'markdown'
      });
    });
  }

  /**
   * Serialize the model to JSON.
   */
  export function toJSON(loc: CellModel.DataLocation): nbformat.IMarkdownCell {
    return AttachmentsCellModel.toJSON(loc) as nbformat.IMarkdownCell;
  }
}

/**
 * The namespace for `CodeCellModel` statics.
 */
export namespace CodeCellModel {
  /**
   * Construct a new code cell with optional original cell content.
   */
  export function fromJSON(
    loc: CellModel.DataLocation,
    cell?: nbformat.ICodeCell
  ) {
    let outputs: nbformat.IOutput[] = [];

    DatastoreExt.withTransaction(loc.record.datastore, () => {
      cell.cell_type = 'code';
      CellModel.fromJSON(loc, cell);
      DatastoreExt.updateRecord(loc.record, {
        executionCount: cell ? cell.execution_count || null : null,
        type: 'code'
      });
      if (cell) {
        outputs = cell.outputs || [];
      }
      OutputAreaModel.fromJSON(loc, outputs);
    });

    // We keep `collapsed` and `jupyter.outputs_hidden` metadata in sync, since
    // they are redundant in nbformat 4.4. See
    // https://github.com/jupyter/nbformat/issues/137
    /* DatastoreExt.listenField(
      { ...this.record, field: 'metadata' },
      Private.collapseChanged,
      this
    );

    // Sync `collapsed` and `jupyter.outputs_hidden` for the first time, giving
    // preference to `collapsed`.
    const metadata = DatastoreExt.getField({
      ...this.record,
      field: 'metadata'
    });
    if (metadata['collapsed']) {
      let collapsed = metadata['collapsed'];
      Private.collapseChanged(this.metadata, {
        type: 'change',
        key: 'collapsed',
        oldValue: collapsed,
        newValue: collapsed
      });
    } else if (this.metadata.has('jupyter')) {
      let jupyter = this.metadata.get('jupyter') as JSONObject;
      if (jupyter.hasOwnProperty('outputs_hidden')) {
        Private.collapseChanged(this.metadata, {
          type: 'change',
          key: 'jupyter',
          oldValue: jupyter,
          newValue: jupyter
        });
      }
    }*/
  }

  /**
   * Serialize the model to JSON.
   */
  export function toJSON(loc: CellModel.DataLocation): nbformat.ICodeCell {
    let cell = CellModel.toJSON(loc) as nbformat.ICodeCell;
    cell.execution_count = DatastoreExt.getField({
      ...loc.record,
      field: 'executionCount'
    });
    cell.outputs = OutputAreaModel.toJSON(loc);
    return cell;
  }

  /**
   * The schema type for code cell models.
   */
  export interface IFields extends CellModel.IBaseFields {
    /**
     * Execution count for the cell.
     */
    executionCount: RegisterField<nbformat.ExecutionCount>;

    /**
     * A list of output ids for the cell.
     */
    outputs: ListField<string>;
  }
}

/* namespace Private {
  export function collapseChanged(
    metadata: IObservableJSON,
    args: IObservableMap.IChangedArgs<JSONValue>
  ) {
    if (args.key === 'collapsed') {
      const jupyter = (metadata.get('jupyter') || {}) as JSONObject;
      const { outputs_hidden, ...newJupyter } = jupyter;

      if (outputs_hidden !== args.newValue) {
        if (args.newValue !== undefined) {
          newJupyter['outputs_hidden'] = args.newValue;
        }
        if (Object.keys(newJupyter).length === 0) {
          metadata.delete('jupyter');
        } else {
          metadata.set('jupyter', newJupyter);
        }
      }
    } else if (args.key === 'jupyter') {
      const jupyter = (args.newValue || {}) as JSONObject;
      if (jupyter.hasOwnProperty('outputs_hidden')) {
        metadata.set('collapsed', jupyter.outputs_hidden);
      } else {
        metadata.delete('collapsed');
      }
    }
  }
 } */
