/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { AttachmentsData, IAttachmentsData } from '@jupyterlab/attachments';

import {
  CodeEditor,
  CodeEditorData,
  ICodeEditorData
} from '@jupyterlab/codeeditor';

import { nbformat } from '@jupyterlab/coreutils';

import { DatastoreExt } from '@jupyterlab/datastore';

import { OutputAreaData } from '@jupyterlab/outputarea';

import { IOutputData, OutputData } from '@jupyterlab/rendermime';

import { JSONExt, JSONObject, ReadonlyJSONValue } from '@phosphor/coreutils';

import {
  Datastore,
  Fields,
  ListField,
  MapField,
  RegisterField
} from '@phosphor/datastore';

/**
 * The namespace for `ICellData` interfaces, describing
 * where cells store their data in a datastore.
 */
export namespace ICellData {
  /**
   * An interface for a cell schema.
   */
  export type BaseSchema = {
    /**
     * The id for the schema.
     */
    id: string;

    fields: ICodeEditorData.Schema['fields'] & {
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
    };
  };

  /**
   * An interface for a cell schema.
   */
  export type Schema = {
    /**
     * The id for the schema.
     */
    id: string;

    /**
     * The union of cell fields.
     */
    fields: BaseSchema['fields'] &
      ICodeCellData.Schema['fields'] &
      IAttachmentsCellData.Schema['fields'];
  };

  /**
   * The location of cell data in a datastore.
   */
  export type DataLocation = {
    /**
     * The record for the cell data.
     */
    record: DatastoreExt.RecordLocation<Schema>;

    /**
     * A table in which outputs are stored.
     */
    outputs: DatastoreExt.TableLocation<IOutputData.Schema>;
  };
}

/**
 * The namespace for `IAttachmentsCellData` interfaces.
 */
export namespace IAttachmentsCellData {
  /**
   * A type alias for an attachment cell schema, which includes the fields for
   * a base cell, plus possible attachment data.
   */
  export type Schema = {
    /**
     * The id for the schema.
     */
    id: string;

    /**
     * The union of cell fields.
     */
    fields: ICellData.BaseSchema['fields'] & IAttachmentsData.Schema['fields'];
  };
}

/**
 * The namespace for `ICodeCellData` statics.
 */
export namespace ICodeCellData {
  /**
   * A type alias for a code cell data schema, which includes the fields of a base
   * cell, plus data for execution count and outputs.
   */
  export type Schema = {
    /**
     * The id for the schema.
     */
    id: string;

    /**
     * The union of cell fields.
     */
    fields: ICellData.BaseSchema['fields'] & {
      /**
       * Execution count for the cell.
       */
      executionCount: RegisterField<nbformat.ExecutionCount>;

      /**
       * A list of output ids for the cell.
       */
      outputs: ListField<string>;
    };
  };
}

/**
 * Utility functions for operating on cell data.
 */
export namespace CellData {
  /**
   * A concrete schema for a cell table, available at runtime.
   */
  export const SCHEMA: ICellData.Schema = {
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
   * Create an in-memory datastore capable of holding the data for an output area.
   */
  export function createStore(id: number = 1): Datastore {
    return Datastore.create({
      id,
      schemas: [SCHEMA, OutputData.SCHEMA]
    });
  }

  /**
   * Construct a cell model from optional cell content.
   */
  export function fromJSON(
    loc: ICellData.DataLocation,
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
   * Convert a cell at a given data location to JSON.
   * This delegates to specific versions of `toJSON` based
   * on the cell type.
   */
  export function toJSON(loc: ICellData.DataLocation): nbformat.ICell {
    let data = DatastoreExt.getRecord(loc.record);
    switch (data.type) {
      case 'code':
        return CodeCellData.toJSON(loc);
        break;
      case 'markdown':
        return MarkdownCellData.toJSON(loc);
        break;
      default:
        return RawCellData.toJSON(loc);
    }
  }

  /*
   * Clear a cell data. The record is not actually removed, but its data
   * is emptied as much as possible to allow it to garbage collect.
   */
  export function clear(loc: ICellData.DataLocation): void {
    let cellData = DatastoreExt.getRecord(loc.record);

    let attachments: { [x: string]: nbformat.IMimeBundle | null } = {};
    Object.keys(cellData.attachments).forEach(key => (attachments[key] = null));
    let metadata: { [x: string]: ReadonlyJSONValue | null } = {};
    Object.keys(cellData.metadata).forEach(key => (metadata[key] = null));

    DatastoreExt.withTransaction(loc.record.datastore, () => {
      DatastoreExt.updateRecord(loc.record, {
        attachments,
        metadata,
        executionCount: null,
        type: 'code',
        trusted: false,
        outputs: { index: 0, remove: cellData.outputs.length, values: [] }
      });
      OutputAreaData.clear(loc);
      CodeEditorData.clear(loc.record);
    });
  }
}

/**
 * The namespace for `AttachmentsCellData` statics.
 */
export namespace AttachmentsCellData {
  /**
   * Construct a new cell with optional attachments.
   */
  export function fromJSON(
    loc: ICellData.DataLocation,
    cell?: nbformat.IMarkdownCell | nbformat.IRawCell
  ): void {
    CellData.fromJSON(loc, cell);
    const attachments = (cell && cell.attachments) || {};
    AttachmentsData.fromJSON(loc.record, attachments);
  }

  /**
   * Serialize the model to JSON.
   */
  export function toJSON(
    loc: ICellData.DataLocation
  ): nbformat.IRawCell | nbformat.IMarkdownCell {
    const cell = Private.baseToJSON(loc) as
      | nbformat.IRawCell
      | nbformat.IMarkdownCell;
    const attachments = AttachmentsData.toJSON(loc.record);
    if (Object.keys(attachments).length) {
      cell.attachments = attachments;
    }
    return cell;
  }
}

/**
 * Utility functions for working with RawCellData.
 */
export namespace RawCellData {
  /**
   * Construct a new cell with optional attachments.
   */
  export function fromJSON(
    loc: ICellData.DataLocation,
    cell?: nbformat.IRawCell
  ): void {
    DatastoreExt.withTransaction(loc.record.datastore, () => {
      AttachmentsCellData.fromJSON(loc, cell);
      DatastoreExt.updateRecord(loc.record, {
        type: 'raw'
      });
    });
  }

  /**
   * Serialize the model to JSON.
   */
  export function toJSON(loc: ICellData.DataLocation): nbformat.IRawCell {
    return AttachmentsCellData.toJSON(loc) as nbformat.IRawCell;
  }
}

/**
 * Utility functions for working with MarkdownCellData.
 */
export namespace MarkdownCellData {
  /**
   * Construct a new cell with optional attachments.
   */
  export function fromJSON(
    loc: ICellData.DataLocation,
    cell?: nbformat.IMarkdownCell
  ): void {
    DatastoreExt.withTransaction(loc.record.datastore, () => {
      AttachmentsCellData.fromJSON(loc, cell);
      DatastoreExt.updateRecord(loc.record, {
        mimeType: 'text/x-ipythongfm',
        type: 'markdown'
      });
    });
  }

  /**
   * Serialize the model to JSON.
   */
  export function toJSON(loc: ICellData.DataLocation): nbformat.IMarkdownCell {
    return AttachmentsCellData.toJSON(loc) as nbformat.IMarkdownCell;
  }
}

/**
 * The namespace for `CodeCellData` statics.
 */
export namespace CodeCellData {
  /**
   * Construct a new code cell with optional original cell content.
   */
  export function fromJSON(
    loc: ICellData.DataLocation,
    cell?: nbformat.ICodeCell
  ) {
    let outputs: nbformat.IOutput[] = [];

    DatastoreExt.withTransaction(loc.record.datastore, () => {
      CellData.fromJSON(loc, cell);
      DatastoreExt.updateRecord(loc.record, {
        executionCount: cell ? cell.execution_count || null : null,
        type: 'code'
      });
      outputs = (cell && cell.outputs) || [];
      OutputAreaData.fromJSON(loc, outputs);
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
  export function toJSON(loc: ICellData.DataLocation): nbformat.ICodeCell {
    let cell = Private.baseToJSON(loc) as nbformat.ICodeCell;
    cell.execution_count = DatastoreExt.getField({
      ...loc.record,
      field: 'executionCount'
    });
    cell.outputs = OutputAreaData.toJSON(loc);
    return cell;
  }
}

namespace Private {
  /*export function collapseChanged(
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
  }*

  /**
   * Serialize the model to JSON.
   *
   * ### Notes
   * This is the common serialization logic for the three cell types,
   * and is called by the specializations of the cell types.
   * The `toJSON` function in this namespace correctly delegates
   * to the different subtypes.
   */
  export function baseToJSON(loc: ICellData.DataLocation): nbformat.ICell {
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
