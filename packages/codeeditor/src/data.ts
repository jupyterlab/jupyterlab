// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { DatastoreExt } from '@jupyterlab/datastore';

import {
  Datastore,
  Fields,
  MapField,
  RegisterField,
  TextField
} from '@phosphor/datastore';

import { CodeEditor } from './editor';

/**
 * A namespace for interfaces describing how a code editor holds its data.
 */
export namespace ICodeEditorData {
  /**
   * An interface for a CodeEditor schema.
   */
  export type Schema = {
    /**
     * The schema id.
     */
    id: string;

    /**
     * The schema fields.
     */
    fields: {
      /**
       * The mime type for the editor.
       */
      readonly mimeType: RegisterField<string>;

      /**
       * The text content of the editor.
       */
      readonly text: TextField;

      /**
       * The cursors for the editor.
       */
      readonly selections: MapField<CodeEditor.ITextSelection[]>;
    };
  };
}

/**
 * Concrete utitlites for working with code editor data.
 */
export namespace CodeEditorData {
  /**
   * Create an in-memory datastore capable of holding the data for an editor.
   */
  export function createStore(id: number = 1): Datastore {
    return Datastore.create({
      id,
      schemas: [SCHEMA]
    });
  }

  /**
   * A concrete CodeEditor schema, available at runtime.
   */
  export const SCHEMA: ICodeEditorData.Schema = {
    /**
     * The schema id.
     */
    id: '@jupyterlab/codeeditor:codeeditor:v1',

    /**
     * Concrete realizations of the schema fields, available at runtime.
     */
    fields: {
      mimeType: Fields.String(),
      text: Fields.Text(),
      selections: Fields.Map<CodeEditor.ITextSelection[]>()
    }
  };

  /*
   * Clear editor data. The record is not actually removed, but its data
   * is emptied as much as possible to allow it to garbage collect.
   */
  export function clear(
    loc: DatastoreExt.RecordLocation<ICodeEditorData.Schema>
  ): void {
    let editorData = DatastoreExt.getRecord(loc);

    let selections: { [x: string]: CodeEditor.ITextSelection[] | null } = {};
    Object.keys(editorData.selections).forEach(key => (selections[key] = null));

    DatastoreExt.withTransaction(loc.datastore, () => {
      DatastoreExt.updateRecord(loc, {
        selections,
        text: { index: 0, remove: editorData.text.length, text: '' },
        mimeType: 'text/plain'
      });
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
}
