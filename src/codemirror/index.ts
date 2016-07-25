// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as CodeMirror
  from 'codemirror';

import './codemirror-ipython';
import './codemirror-ipythongfm';

// Bundle other common modes
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/css/css';
import 'codemirror/mode/julia/julia';
import 'codemirror/mode/r/r';
import 'codemirror/mode/markdown/markdown';


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
 * Require a codemirror mode by name.
 */
export
function requireMode(mode: string): Promise<CodeMirror.modespec> {
  if (CodeMirror.modes.hasOwnProperty(mode)) {
    let spec = CodeMirror.findModeByName(mode);
    if (spec) {
      spec.name = spec.mode;
    }
    return Promise.resolve(spec);
  }
  return new Promise<CodeMirror.modespec>((resolve, reject) => {
    require([`codemirror/mode/${mode}/${mode}`], () => {
      let spec = CodeMirror.findModeByName(mode);
      if (spec) {
        spec.name = spec.mode;
      }
      return Promise.resolve(spec);
    });
  });
}


/**
 * Load a CodeMirror mode based on a mode spec.
 */
function loadInfo(editor: CodeMirror.Editor, info: CodeMirror.modespec): void {
  if (!info) {
    editor.setOption('mode', 'null');
    return;
  }
  requireMode(info.mode).then(() => {
    editor.setOption('mode', info.mime);
  });
}
