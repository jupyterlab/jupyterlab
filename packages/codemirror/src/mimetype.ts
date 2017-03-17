// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as CodeMirror
  from 'codemirror';

import {
  IEditorMimeTypeService
} from '@jupyterlab/codeeditor';

import {
  nbformat
} from '@jupyterlab/coreutils';

import {
  findMode
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
      return findMode(info.codemirror_mode as any).mime;
    }
    let mode = CodeMirror.findModeByMIME(info.mimetype || '');
    if (mode) {
      return info.mimetype!;
    }
    let ext = info.file_extension || '';
    ext = ext.split('.').slice(-1)[0];
    mode = CodeMirror.findModeByExtension(ext || '');
    if (mode) {
      return mode.mime;
    }
    mode = CodeMirror.findModeByName(info.name || '');
    return mode ? mode.mime : IEditorMimeTypeService.defaultMimeType;
  }
  /**
   * Returns a mime type for the given file path.
   *
   * #### Notes
   * If a mime type cannot be found returns the defaul mime type `text/plain`, never `null`.
   */
  getMimeTypeByFilePath(path: string): string {
    const mode = CodeMirror.findModeByFileName(path);
    return mode ? mode.mime : IEditorMimeTypeService.defaultMimeType;
  }
}
