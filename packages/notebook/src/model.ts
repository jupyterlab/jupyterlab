// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { showDialog, Dialog } from '@jupyterlab/apputils';

import { DatastoreExt, SchemaFields } from '@jupyterlab/datastore';

import { DocumentModel, DocumentRegistry } from '@jupyterlab/docregistry';

import {
  CodeCellModel,
  RawCellModel,
  MarkdownCellModel,
  CellModel
} from '@jupyterlab/cells';

import { nbformat } from '@jupyterlab/coreutils';

import { IOutputModel } from '@jupyterlab/rendermime';

import {
  ReadonlyJSONObject,
  ReadonlyJSONValue,
  UUID
} from '@phosphor/coreutils';

import {
  Datastore,
  Fields,
  ListField,
  MapField,
  RegisterField,
  Schema
} from '@phosphor/datastore';

/**
 * The definition of a model object for a notebook widget.
 */
export interface INotebookModel extends DocumentRegistry.IModel {
  /**
   * The cell model factory for the notebook.
   */
  readonly contentFactory: NotebookModel.IContentFactory;

  /**
   * The major version number of the nbformat.
   */
  readonly nbformat: number;

  /**
   * The minor version number of the nbformat.
   */
  readonly nbformatMinor: number;

  /**
   * The metadata associated with the notebook.
   */
  readonly metadata: ReadonlyJSONObject;

  /**
   * The location of the notebook data in a datastore.
   */
  readonly data: INotebookModel.DataLocation;

  /**
   * The array of deleted cells since the notebook was last run.
   */
  readonly deletedCells: string[];
}

export namespace INotebookModel {
  export type DataLocation = {
    /**
     * The top-level record for the notebook data.
     */
    record: DatastoreExt.RecordLocation<NotebookModel.ISchema>;

    /**
     * The table holding cell data.
     */
    cells: DatastoreExt.TableLocation<CellModel.ISchema>;

    /**
     * The table holding output data.
     */
    outputs: DatastoreExt.TableLocation<IOutputModel.ISchema>;
  };
}

/**
 * An implementation of a notebook Model.
 */
export class NotebookModel extends DocumentModel implements INotebookModel {
  /**
   * Construct a new notebook model.
   */
  constructor(options: NotebookModel.IOptions = {}) {
    super(options.languagePreference);
    let factory = options.contentFactory || NotebookModel.defaultContentFactory;

    const datastore = Datastore.create({
      id: 1,
      schemas: [NotebookModel.SCHEMA, IOutputModel.SCHEMA, CellModel.SCHEMA]
    });

    this.data = {
      record: {
        datastore,
        schema: NotebookModel.SCHEMA,
        record: 'data'
      },
      cells: {
        datastore,
        schema: CellModel.SCHEMA
      },
      outputs: {
        datastore,
        schema: IOutputModel.SCHEMA
      }
    };
    // Handle initialization of data.
    DatastoreExt.withTransaction(datastore, () => {
      DatastoreExt.updateRecord(this.data.record, {
        nbformat: nbformat.MAJOR_VERSION,
        nbformatMinor: nbformat.MINOR_VERSION
      });
      this._ensureMetadata();
    });

    this.contentFactory = factory.clone(this.data);
    // Handle initial metadata.

    DatastoreExt.listenRecord(this.record, this.triggerContentChange, this);
    this._deletedCells = [];
  }

  /**
   * The cell model factory for the notebook.
   */
  readonly contentFactory: NotebookModel.IContentFactory;

  /**
   * The location of the data in the notebook.
   */
  readonly data: INotebookModel.DataLocation;

  /**
   * The metadata associated with the notebook.
   */
  get metadata(): ReadonlyJSONObject {
    return DatastoreExt.getField({ ...this.data.record, field: 'metadata' });
  }

  /**
   * The major version number of the nbformat.
   */
  get nbformat(): number {
    return DatastoreExt.getField({ ...this.data.record, field: 'nbformat' });
  }

  /**
   * The minor version number of the nbformat.
   */
  get nbformatMinor(): number {
    return DatastoreExt.getField({
      ...this.data.record,
      field: 'nbformatMinor'
    });
  }

  /**
   * The default kernel name of the document.
   */
  get defaultKernelName(): string {
    let spec = this.metadata['kernelspec'] as nbformat.IKernelspecMetadata;
    return spec ? spec.name : '';
  }

  /**
   * A list of deleted cells for the notebook..
   */
  get deletedCells(): string[] {
    return this._deletedCells;
  }

  /**
   * The default kernel language of the document.
   */
  get defaultKernelLanguage(): string {
    let info = this.metadata['language_info'] as nbformat.ILanguageInfoMetadata;
    return info ? info.name : '';
  }

  /**
   * Dispose of the resources held by the model.
   */
  dispose(): void {
    // Do nothing if already disposed.
    super.dispose();
  }

  /**
   * Serialize the model to a string.
   */
  toString(): string {
    return JSON.stringify(this.toJSON());
  }

  /**
   * Deserialize the model from a string.
   *
   * #### Notes
   * Should emit a [contentChanged] signal.
   */
  fromString(value: string): void {
    this.fromJSON(JSON.parse(value));
  }

  /**
   * Serialize the model to JSON.
   */
  toJSON(): nbformat.INotebookContent {
    let cells: nbformat.ICell[] = [];
    let data = DatastoreExt.getRecord(this.data.record);
    for (let i = 0; i < data.cells.length; i++) {
      // TODO use the rigt version of toJSON
      let cell = CellModel.toJSON({
        record: { ...this.data.cells, record: data.cells[i] },
        outputs: this.data.outputs
      });
      cells.push(cell);
    }
    this._ensureMetadata();
    let metadata = Object.create(null) as nbformat.INotebookMetadata;
    for (let key of Object.keys(this.metadata)) {
      metadata[key] = JSON.parse(JSON.stringify(this.metadata[key]));
    }
    return {
      metadata,
      nbformat_minor: data.nbformatMinor,
      nbformat: data.nbformat,
      cells
    };
  }

  /**
   * Deserialize the model from JSON.
   *
   * #### Notes
   * Should emit a [contentChanged] signal.
   */
  fromJSON(value: nbformat.INotebookContent): void {
    DatastoreExt.withTransaction(this.data.record.datastore, () => {
      const cellIds: string[] = [];
      for (let cell of value.cells) {
        const id = UUID.uuid4();
        cellIds.push(id);
        const loc = {
          record: { ...this.data.cells, record: id },
          outputs: this.data.outputs
        };
        switch (cell.cell_type) {
          case 'code':
            CodeCellModel.fromJSON(loc, cell as nbformat.ICodeCell);
            break;
          case 'markdown':
            MarkdownCellModel.fromJSON(loc, cell as nbformat.IMarkdownCell);
            break;
          case 'raw':
            RawCellModel.fromJSON(loc, cell as nbformat.IRawCell);
            break;
          default:
            continue;
        }
      }
      const cellLoc: DatastoreExt.FieldLocation<
        NotebookModel.ISchema,
        'cells'
      > = { ...this.data.record, field: 'cells' };
      const oldCells = DatastoreExt.getField(cellLoc);
      DatastoreExt.updateField(cellLoc, {
        index: 0,
        remove: oldCells.length,
        values: cellIds
      });
      // TODO: also clear cell content.

      let newValue = 0;
      const origNbformat = value.metadata.orig_nbformat;

      if (value.nbformat !== nbformat.MAJOR_VERSION) {
        newValue = value.nbformat;
        DatastoreExt.updateField(
          { ...this.data.record, field: 'nbformat' },
          newValue
        );
      }
      if (value.nbformat_minor > nbformat.MINOR_VERSION) {
        newValue = value.nbformat_minor;
        DatastoreExt.updateField(
          { ...this.data.record, field: 'nbformatMinor' },
          newValue
        );
      }

      // Alert the user if the format changes.
      if (origNbformat !== undefined && newValue !== origNbformat) {
        const newer = newValue > origNbformat;
        const msg = `This notebook has been converted from ${
          newer ? 'an older' : 'a newer'
        } notebook format (v${origNbformat}) to the current notebook format (v${newValue}). The next time you save this notebook, the current notebook format (v${newValue}) will be used. ${
          newer
            ? 'Older versions of Jupyter may not be able to read the new format.'
            : 'Some features of the original notebook may not be available.'
        }  To preserve the original format version, close the notebook without saving it.`;
        void showDialog({
          title: 'Notebook converted',
          body: msg,
          buttons: [Dialog.okButton()]
        });
      }

      // Update the metadata.
      let metadata = { ...value.metadata };
      // orig_nbformat is not intended to be stored per spec.
      delete metadata['orig_nbformat'];
      let oldMetadata = { ...this.metadata };
      for (let key in oldMetadata) {
        oldMetadata[key] = null;
      }
      let update = { ...oldMetadata, ...metadata };
      DatastoreExt.updateField(
        { ...this.data.record, field: 'metadata' },
        update
      );
      this._ensureMetadata();
      this.dirty = true;
    });
  }

  /**
   * Initialize the model with its current state.
   */
  initialize(): void {
    super.initialize();
  }

  /**
   * Make sure we have the required metadata fields.
   */
  private _ensureMetadata(): void {
    DatastoreExt.withTransaction(this.data.record.datastore, () => {
      let metadata = { ...this.metadata };
      metadata['language_info'] = metadata['language_info'] || { name: '' };
      metadata['kernelspec'] = metadata['kernelspec'] || {
        name: '',
        display_name: ''
      };
      DatastoreExt.updateField(
        { ...this.data.record, field: 'metadata' },
        metadata
      );
    });
  }

  private _deletedCells: string[];
}

/**
 * The namespace for the `NotebookModel` class statics.
 */
export namespace NotebookModel {
  export interface IFields extends SchemaFields {
    /**
     * The major nbformat version number.
     */
    readonly nbformat: RegisterField<number>;

    /**
     * The minor nbformat version number.
     */
    readonly nbformatMinor: RegisterField<number>;

    /**
     * The list of cell IDs in the notebook.
     */
    readonly cells: ListField<string>;

    /**
     * The metadata for the notebook.
     */
    readonly metadata: MapField<ReadonlyJSONValue>;
  }

  /**
   * An interface for a notebook schema.
   */
  export interface ISchema extends Schema {
    /**
     * The schema fields.
     */
    fields: IFields;
  }

  /**
   * The concreate notebook schema, available at runtime.
   */
  export const SCHEMA: ISchema = {
    /**
     * The schema id.
     */
    id: '@jupyterlab/notebook:notebookmodel.v1',

    /**
     * Concrete realizations of the schema fields, available at runtime.
     */
    fields: {
      nbformat: Fields.Number(),
      nbformatMinor: Fields.Number(),
      cells: Fields.List<string>(),
      metadata: Fields.Map<ReadonlyJSONValue>()
    }
  };

  /**
   * An options object for initializing a notebook model.
   */
  export interface IOptions {
    /**
     * The language preference for the model.
     */
    languagePreference?: string;

    /**
     * A factory for creating cell models.
     *
     * The default is a shared factory instance.
     */
    contentFactory?: IContentFactory;
  }

  /**
   * A factory for creating notebook model content.
   */
  export interface IContentFactory {
    /**
     * Create a new cell by cell type.
     *
     * @param type:  the type of the cell to create.
     *
     * @param options: the cell creation options.
     *
     * #### Notes
     * This method is intended to be a convenience method to programmaticaly
     * call the other cell creation methods in the factory.
     */
    createCell(type: nbformat.CellType, cell?: nbformat.IBaseCell): string;

    /**
     * Create a new code cell.
     *
     * @param options - The options used to create the cell.
     *
     * @returns A new code cell. If a source cell is provided, the
     *   new cell will be initialized with the data from the source.
     */
    createCodeCell(cell?: nbformat.ICodeCell): string;

    /**
     * Create a new markdown cell.
     *
     * @param options - The options used to create the cell.
     *
     * @returns A new markdown cell. If a source cell is provided, the
     *   new cell will be initialized with the data from the source.
     */
    createMarkdownCell(cell?: nbformat.IMarkdownCell): string;

    /**
     * Create a new raw cell.
     *
     * @param options - The options used to create the cell.
     *
     * @returns A new raw cell. If a source cell is provided, the
     *   new cell will be initialized with the data from the source.
     */
    createRawCell(cell?: nbformat.IRawCell): string;

    /**
     * Clone the content factory with a data location.
     */
    clone(data: ContentFactory.DataLocation): IContentFactory;
  }

  /**
   * The default implementation of an `IContentFactory`.
   */
  export class ContentFactory {
    /**
     * Create a new cell model factory.
     */
    constructor(options: ContentFactory.IOptions) {
      this._data = options.data;
    }

    /**
     * Create a new cell by cell type.
     *
     * @param type:  the type of the cell to create.
     *
     * @param options: the cell creation options.
     *
     * #### Notes
     * This method is intended to be a convenience method to programmaticaly
     * call the other cell creation methods in the factory.
     */
    createCell(type: nbformat.CellType, cell?: nbformat.IBaseCell): string {
      switch (type) {
        case 'code':
          return this.createCodeCell(cell as nbformat.ICodeCell);
          break;
        case 'markdown':
          return this.createMarkdownCell(cell as nbformat.IMarkdownCell);
          break;
        case 'raw':
        default:
          return this.createRawCell(cell as nbformat.IRawCell);
      }
    }

    /**
     * Create a new code cell.
     *
     * @param source - The data to use for the original source data.
     *
     * @returns A cell id.
     */
    createCodeCell(value?: nbformat.ICodeCell): string {
      const id = UUID.uuid4();
      const loc = {
        record: {
          datastore: this._data.cells.datastore,
          schema: this._data.cells.schema,
          record: id
        },
        outputs: this._data.outputs
      };
      CodeCellModel.fromJSON(loc, value);
      return id;
    }

    /**
     * Create a new markdown cell.
     *
     * @param source - The data to use for the original source data.
     *
     * @returns A new markdown cell. If a source cell is provided, the
     *   new cell will be initialized with the data from the source.
     */
    createMarkdownCell(value?: nbformat.IMarkdownCell): string {
      const id = UUID.uuid4();
      const loc = {
        record: {
          datastore: this._data.cells.datastore,
          schema: this._data.cells.schema,
          record: id
        },
        outputs: this._data.outputs
      };
      MarkdownCellModel.fromJSON(loc, value);
      return id;
    }

    /**
     * Create a new raw cell.
     *
     * @param source - The data to use for the original source data.
     *
     * @returns A new raw cell. If a source cell is provided, the
     *   new cell will be initialized with the data from the source.
     */
    createRawCell(value?: nbformat.IRawCell): string {
      const id = UUID.uuid4();
      const loc = {
        record: {
          datastore: this._data.cells.datastore,
          schema: this._data.cells.schema,
          record: id
        },
        outputs: this._data.outputs
      };
      RawCellModel.fromJSON(loc, value);
      return id;
    }

    /**
     * Clone the content factory with a new IModelDB.
     */
    clone(data: ContentFactory.DataLocation): ContentFactory {
      return new ContentFactory({
        data
      });
    }

    private _data: ContentFactory.DataLocation;
  }

  /**
   * A namespace for the notebook model content factory.
   */
  export namespace ContentFactory {
    /**
     * The options used to initialize a `ContentFactory`.
     */
    export interface IOptions {
      /**
       * The data in which to place new content.
       */
      data?: DataLocation;
    }

    /**
     * Data location for a cell content factory.
     */
    export type DataLocation = {
      /**
       * A cell table.
       */
      cells: DatastoreExt.TableLocation<CellModel.ISchema>;

      /**
       * An outputs table.
       */
      outputs: DatastoreExt.TableLocation<IOutputModel.ISchema>;
    };
  }

  /**
   * The default `ContentFactory` instance.
   */
  export const defaultContentFactory = new ContentFactory({});
}
