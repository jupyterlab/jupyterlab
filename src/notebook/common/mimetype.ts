// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import * as CodeMirror
  from 'codemirror';

import 'codemirror/mode/meta';

import {
  IKernelLanguageInfo
} from 'jupyter-js-services';


/**
 * Get the appropriate codemirror mimetype given language info.
 */
export
function mimetypeForLangauge(info: IKernelLanguageInfo): string {
  // Use the codemirror mode if given since some kernels rely on it.
  let mode = info.codemirror_mode;
  let mime = 'text/plain';
  if (mode) {
    if (typeof mode === 'string') {
      mode = CodeMirror.findModeByName(mode as string);
    } else if ((mode as CodeMirror.modespec).mime) {
      // Do nothing.
    } else if ((mode as CodeMirror.modespec).name) {
      let name = (mode as CodeMirror.modespec).name;
      mode = CodeMirror.findModeByName(name);
    }
    if (mode) {
      mime = (mode as CodeMirror.modespec).mime;
    }
  } else if (info.mimetype) {
    mime = info.mimetype;
  }
  return mime;
}
