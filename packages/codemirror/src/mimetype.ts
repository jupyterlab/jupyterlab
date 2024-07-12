// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IEditorMimeTypeService } from '@jupyterlab/codeeditor';
import { PathExt } from '@jupyterlab/coreutils';
import * as nbformat from '@jupyterlab/nbformat';
import { IEditorLanguageRegistry } from './token';

/**
 * The mime type service for CodeMirror.
 */
export class CodeMirrorMimeTypeService implements IEditorMimeTypeService {
  constructor(protected languages: IEditorLanguageRegistry) {}
  /**
   * Returns a mime type for the given language info.
   *
   * #### Notes
   * If a mime type cannot be found returns the default mime type `text/plain`, never `null`.
   * There may be more than one mime type, but only the first one will be returned.
   * To access all mime types, use `IEditorLanguageRegistry` instead.
   */
  getMimeTypeByLanguage(info: nbformat.ILanguageInfoMetadata): string {
    const ext = info.file_extension || '';
    const mode = this.languages.findBest(
      (info.codemirror_mode as any) || {
        mimetype: info.mimetype,
        name: info.name,
        ext: [ext.split('.').slice(-1)[0]]
      }
    );
    return mode
      ? Array.isArray(mode.mime)
        ? mode.mime[0] ?? IEditorMimeTypeService.defaultMimeType
        : mode.mime
      : IEditorMimeTypeService.defaultMimeType;
  }

  /**
   * Returns a mime type for the given file path.
   *
   * #### Notes
   * If a mime type cannot be found returns the default mime type `text/plain`, never `null`.
   * There may be more than one mime type, but only the first one will be returned.
   * To access all mime types, use `IEditorLanguageRegistry` instead.
   */
  getMimeTypeByFilePath(path: string): string {
    const ext = PathExt.extname(path);
    if (ext === '.ipy') {
      return 'text/x-python';
    } else if (ext === '.md') {
      return 'text/x-ipythongfm';
    }
    const mode = this.languages.findByFileName(path);
    return mode
      ? Array.isArray(mode.mime)
        ? mode.mime[0] ?? IEditorMimeTypeService.defaultMimeType
        : mode.mime
      : IEditorMimeTypeService.defaultMimeType;
  }
}
