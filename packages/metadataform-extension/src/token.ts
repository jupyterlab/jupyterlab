// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { NotebookTools } from '@jupyterlab/notebook';
import {
  PartialJSONObject,
  ReadonlyPartialJSONObject,
  Token
} from '@lumino/coreutils';
import { MetadataForm } from './form';

/**
 * A metadata form interface provided when registering
 * to a metadata form provider.  Allows an owner widget
 * to set the metadata form content for itself.
 */

export interface IMetadataForm extends NotebookTools.Tool {
  /**
   * Get the list of existing metadataKey (array of array of string).
   */
  get metadataKeys(): MetadataForm.IMetadataKey[];

  /**
   * Get the properties of a MetadataKey.
   * @param metadataKey - metadataKey (array of string).
   */
  getProperties(
    metadataKey: MetadataForm.IMetadataKey
  ): PartialJSONObject | null;

  /**
   * Set properties to a metadataKey.
   * @param metadataKey - metadataKey (array of string).
   * @param properties - the properties to add or modify.
   */
  setProperties(
    metadataKey: MetadataForm.IMetadataKey,
    properties: PartialJSONObject
  ): void;

  /**
   * Update the metadata of the current cell or notebook.
   *
   * @param formData: the cell metadata set in the form.
   * @param reload: whether to update the form after updating the metadata.
   *
   * ## Notes
   * Metadata are updated from root only. If some metadata is nested,
   * the whole root object must be updated.
   * This function build an object with all the root object to update
   * in metadata before performing update.
   */
  updateMetadata(formData: ReadonlyPartialJSONObject, reload?: boolean): void;
}

/**
 * A provider for metadata form.
 */
export interface IMetadataFormProvider {
  /**
   * Each ID must be described in schema.
   */
  [id: string]: IMetadataForm;
}

/**
 * The property inspector provider token.
 */
export const IMetadataFormProvider = new Token<IMetadataFormProvider>(
  '@jupyterlab/metadataform:IMetadataFormProvider'
);
