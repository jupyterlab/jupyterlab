// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { NotebookTools } from '@jupyterlab/notebook';
import { ReadonlyPartialJSONObject, Token } from '@lumino/coreutils';
import { Widget } from '@lumino/widgets';

/**
 * A metadata form interface provided when registering
 * to a metadata form provider.  Allows an owner widget
 * to set the metadata form content for itself.
 */

export interface IMetadataForm extends NotebookTools.Tool {
  /*
   * Update the metadata.
   *
   * @param formData - the data to write into metadata.
   * @reload - whether to reload the form or not after updating metadata.
   */

  updateMetadata(formData: ReadonlyPartialJSONObject, reload?: boolean): void;
}

/**
 * A provider for metadata form.
 */
export interface IMetadataFormProvider {
  /**
   * Register a widget in the metadata form provider.
   *
   * @param widget The owner widget whose properties will be inspected.
   *
   * ## Notes
   * Only one metadata form can be provided for each widget.
   * Registering the same widget twice will result in an error.
   * A widget can be unregistered by disposing of its metadata
   * form.
   */
  register(widget: Widget): IMetadataForm;
}

/**
 * The property inspector provider token.
 */
export const IMetadataFormProvider = new Token<IMetadataFormProvider>(
  '@jupyterlab/metadataform:IMetadataFormProvider'
);
