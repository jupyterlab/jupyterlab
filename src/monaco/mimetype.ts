// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  nbformat
} from '@jupyterlab/services';

import {
  IEditorMimeTypeService
} from '../codeeditor';

import {
  findLanguageForPath,
  findLanguageForMimeType,
  getMimeTypeForLanguage,
  findMimeTypeForLanguageId
} from './language';

/**
 * The mime type service for CodeMirror.
 */
export
class MonacoMimeTypeService implements IEditorMimeTypeService {
  /**
   * Returns a mime type for the given language info.
   *
   * #### Notes
   * If a mime type cannot be found returns the defaul mime type `text/plain`, never `null`.
   */
  getMimeTypeByLanguage(info: nbformat.ILanguageInfoMetadata): string {
    if (info.mimetype) {
      const language = findLanguageForMimeType(info.mimetype);
      if (language) {
        return info.mimetype;
      }
    }
    if (info.file_extension) {
      const language = findLanguageForPath(info.file_extension);
      if (language) {
        return getMimeTypeForLanguage(language);
      }
    }
    return findMimeTypeForLanguageId(info.name);
  }
  /**
   * Returns a mime type for the given file path.
   *
   * #### Notes
   * If a mime type cannot be found returns the defaul mime type `text/plain`, never `null`.
   */
  getMimeTypeByFilePath(path: string): string {
    const language = findLanguageForPath(path);
    return getMimeTypeForLanguage(language);
  }
}
