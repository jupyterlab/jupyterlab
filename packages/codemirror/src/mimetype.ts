// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IEditorMimeTypeService
} from '@jupyterlab/codeeditor';

import {
  nbformat, PathExt
} from '@jupyterlab/coreutils';

import {
  Mode
} from '.';

/**
 * The mime type service for CodeMirror.
 */
export
class CodeMirrorMimeTypeService implements IEditorMimeTypeService {
  /**
   * Returns a mime type for the given language info.
   *
   * #### Notes
   * If a mime type cannot be found returns the defaul mime type `text/plain`, never `null`.
   */
  getMimeTypeByLanguage(info: nbformat.ILanguageInfoMetadata): string {
    if (info.codemirror_mode) {
      return Mode.find(info.codemirror_mode as any).mime;
    }
    let mode = Mode.findByMIME(info.mimetype || '');
    if (mode) {
      return info.mimetype!;
    }
    let ext = info.file_extension || '';
    ext = ext.split('.').slice(-1)[0];
    mode = Mode.findByExtension(ext || '');
    if (mode) {
      return mode.mime;
    }
    mode = Mode.findByName(info.name || '');
    return mode ? mode.mime : IEditorMimeTypeService.defaultMimeType;
  }
  /**
   * Returns a mime type for the given file path.
   *
   * #### Notes
   * If a mime type cannot be found returns the defaul mime type `text/plain`, never `null`.
   */
  getMimeTypeByFilePath(path: string): string {
    if (PathExt.extname(path) === '.ipy') {
      return 'text/x-python';
    }
    const mode = Mode.findByFileName(path);
    return mode ? mode.mime : IEditorMimeTypeService.defaultMimeType;
  }
}
