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
 * Require a codemirror mode by name or Codemirror spec.
 */
export
function requireMode(mode: string | CodeMirror.modespec): Promise<CodeMirror.modespec> {
  let modename = (typeof mode === 'string') ? mode :
      mode.mode || mode.name;
  let mimetype = (typeof mode !== 'string') ? mode.mime : '';
  let ext = modename.split('.').pop();

  // Get a modespec object by whatever means necessary.
  let info: CodeMirror.modespec = (
      (modename && mimetype && mode as CodeMirror.modespec) ||
      CodeMirror.findModeByName(modename) ||
      CodeMirror.findModeByExtension(ext) ||
      CodeMirror.findModeByMIME(modename) ||
      {mode: modename, mime: modename}
  );

  // Simplest, cheapest check by mode name.
  if (CodeMirror.modes.hasOwnProperty(modename)) {
    return Promise.resolve(info);
  }

  // Fetch the mode asynchronously.
  return new Promise<CodeMirror.modespec>((resolve, reject) => {
    (require as any)([`codemirror/mode/${info.mode}/${info.mode}`], () => {
      resolve(info);
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
  requireMode(info).then(() => {
    editor.setOption('mode', info.mime);
  });
}
