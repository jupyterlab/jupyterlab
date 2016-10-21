// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as CodeMirror
  from 'codemirror';

import {
  findMode
} from '../../codemirror';

import {
  nbformat
} from '../notebook/nbformat';


/**
 * Get the appropriate codemirror mimetype given language info.
 */
export
function mimetypeForLanguage(info: nbformat.ILanguageInfoMetadata): string {
  if (info.codemirror_mode) {
    return findMode(info.codemirror_mode as any).mime;
  }
  let mode = CodeMirror.findModeByMIME(info.mimetype || '');
  if (mode) {
    return info.mimetype;
  }
  let ext = info.file_extension || '';
  ext = ext.split('.').slice(-1)[0];
  mode = CodeMirror.findModeByExtension(ext || '');
  if (mode) {
    return mode.mime;
  }
  mode = CodeMirror.findModeByName(info.name || '');
  return mode ? mode.mime : 'text/plain';
}
