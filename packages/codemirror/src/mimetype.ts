// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IEditorMimeTypeService } from '@jupyterlab/codeeditor';

import { PathExt } from '@jupyterlab/coreutils';

import * as nbformat from '@jupyterlab/nbformat';

import { Mode } from './mode';

/**
 * The mime type service for CodeMirror.
 */
export class CodeMirrorMimeTypeService implements IEditorMimeTypeService {
  /**
   * Returns a mime type for the given language info.
   *
   * #### Notes
   * If a mime type cannot be found returns the defaul mime type `text/plain`, never `null`.
   */
  getMimeTypeByLanguage(info: nbformat.ILanguageInfoMetadata): string {
    const ext = info.file_extension || '';
    return Mode.findBest(
      (info.codemirror_mode as any) || {
        mimetype: info.mimetype,
        name: info.name,
        ext: [ext.split('.').slice(-1)[0]]
      }
    ).mime;
  }

  /**
   * Returns a mime type for the given file path.
   *
   * #### Notes
   * If a mime type cannot be found returns the default mime type `text/plain`, never `null`.
   */
  getMimeTypeByFilePath(path: string): string {
    const ext = PathExt.extname(path);
    if (ext === '.ipy') {
      return 'text/x-python';
    } else if (ext === '.md') {
      return 'text/x-ipythongfm';
    }
    const mode = Mode.findByFileName(path) || Mode.findBest('');
    return mode.mime;
  }
}
