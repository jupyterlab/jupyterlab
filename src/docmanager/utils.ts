// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import * as CodeMirror
  from 'codemirror';

// Bundle common modes
import 'codemirror/mode/python/python';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/css/css';
import 'codemirror/mode/julia/julia';
import 'codemirror/mode/r/r';
import 'codemirror/mode/markdown/markdown';
import 'codemirror/mode/gfm/gfm';


/**
 * Load a codemirror mode by file name.
 */
export
function loadModeByFileName(editor: CodeMirror.Editor, filename: string): void {
  loadInfo(editor, CodeMirror.findModeByFileName(filename));
}


/**
 * Load a codemirror mode by mime type.
 */
export
function loadModeByMIME(editor: CodeMirror.Editor, mimetype: string): void {
  loadInfo(editor, CodeMirror.findModeByMIME(mimetype));
}



/**
 * Load a codemirror mode by mode name.
 */
export
function loadModeByName(editor: CodeMirror.Editor, mode: string): void {
  loadInfo(editor, CodeMirror.findModeByName(mode));
}


/**
 * Load a CodeMirror mode based on a mode spec.
 */
function loadInfo(editor: CodeMirror.Editor, info: CodeMirror.modespec): void {
  if (!info) {
    editor.setOption('mode', 'null');
    return;
  }
  if (CodeMirror.modes.hasOwnProperty(info.mode)) {
    editor.setOption('mode', info.mime);
  } else {
    require([`codemirror/mode/${info.mode}/${info.mode}`], () => {
      editor.setOption('mode', info.mime);
    });
  }
}
