// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { SchemaFields } from '@jupyterlab/datastore';

import {
  Datastore,
  Fields,
  MapField,
  RegisterField,
  Schema,
  TextField
} from '@phosphor/datastore';

import { CodeEditor } from './editor';

/**
 * A namespace for interfaces describing how a code editor holds its data.
 */
export namespace ICodeEditorData {
  /**
   * An interface for the fields stored in the CodeEditor schema.
   */
  export interface IFields extends SchemaFields {
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
  }

  /**
   * An interface for a CodeEditor schema.
   */
  export interface ISchema extends Schema {
    /**
     * The schema fields.
     */
    fields: IFields;
  }
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
  export const SCHEMA: ICodeEditorData.ISchema = {
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
}
