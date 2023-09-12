// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as nbformat from '@jupyterlab/nbformat';

/**
 * The mime type service of a code editor.
 */
export interface IEditorMimeTypeService {
  /**
   * Get a mime type for the given language info.
   *
   * @param info - The language information.
   *
   * @returns A valid mimetype.
   *
   * #### Notes
   * If a mime type cannot be found returns the default mime type `text/plain`, never `null`.
   * There may be more than one mime type, but only the first one will be returned.
   * To access all mime types, use `IEditorLanguageRegistry` instead.
   */
  getMimeTypeByLanguage(info: nbformat.ILanguageInfoMetadata): string;

  /**
   * Get a mime type for the given file path.
   *
   * @param filePath - The full path to the file.
   *
   * @returns A valid mimetype.
   *
   * #### Notes
   * If a mime type cannot be found returns the default mime type `text/plain`, never `null`.
   * There may be more than one mime type, but only the first one will be returned.
   * To access all mime types, use `IEditorLanguageRegistry` instead.
   */
  getMimeTypeByFilePath(filePath: string): string;
}

/**
 * A namespace for `IEditorMimeTypeService`.
 */
export namespace IEditorMimeTypeService {
  /**
   * The default mime type.
   */
  export const defaultMimeType: string = 'text/plain';
}
