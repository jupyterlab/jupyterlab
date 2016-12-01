// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  nbformat
} from '@jupyterlab/services';

/**
 * The mime type service of a code editor.
 */
export
interface IEditorMimeTypeService {
  /**
   * Returns a mime type for the given language info.
   * 
   * #### Notes
   * If a mime type cannot be found returns the defaul mime type `text/plain`, never `null`.  
   */
  getMimeTypeForLanguage(info: nbformat.ILanguageInfoMetadata): string;
  /**
   * Returns a mime type for the given file path.
   * 
   * #### Notes
   * If a mime type cannot be found returns the defaul mime type `text/plain`, never `null`.
   */
  getMimeTypeForPath(path: string): string;
}

/**
 * A namespace for `IEditorMimeTypeService`.
 */
export
namespace IEditorMimeTypeService {
  /**
   * The default mime type.
   */
  export
  const defaultMimeType = 'text/plain';
}
