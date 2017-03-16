// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as CodeMirror
  from 'codemirror';

import 'codemirror/mode/meta';
import 'codemirror/addon/runmode/runmode';

import './codemirror-ipython';
import './codemirror-ipythongfm';

// Bundle other common modes
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/css/css';
import 'codemirror/mode/julia/julia';
import 'codemirror/mode/r/r';
import 'codemirror/mode/markdown/markdown';


// Stub for the require function.
declare var require: any;


/**
 * The interface of a codemirror mode.
 */
export
interface IModeSpec {
  [ key: string ]: string;
  name?: string;
  mode: string;
  mime: string;
}


/**
 * Running a CodeMirror mode outside of an editor.
 */
export
function runMode(code: string, mode: string | IModeSpec, el: HTMLElement): void {
  CodeMirror.runMode(code, mode, el);
}


/**
 * Find a mode name by extension.
 */
export
function findModeByExtension(ext: string): string {
  let mode = CodeMirror.findModeByExtension(ext);
  return mode && mode.mode;
}


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
 * Find a codemirror mode by name or CodeMirror spec.
 */
export
function findMode(mode: string | IModeSpec): IModeSpec {
  let modename = (typeof mode === 'string') ? mode :
      mode.mode || mode.name;
  let mimetype = (typeof mode !== 'string') ? mode.mime : '';

  return (
    CodeMirror.findModeByName(modename) ||
    CodeMirror.findModeByMIME(mimetype) ||
    CodeMirror.modes['null']
  );
}


/**
 * Require a codemirror mode by name or Codemirror spec.
 */
export
function requireMode(mode: string | IModeSpec): Promise<IModeSpec> {
  let info = findMode(mode);

  // Simplest, cheapest check by mode name.
  if (CodeMirror.modes.hasOwnProperty(info.mode)) {
    return Promise.resolve(info);
  }

  // Fetch the mode asynchronously.
  return new Promise<CodeMirror.modespec>((resolve, reject) => {
    require([`codemirror/mode/${info.mode}/${info.mode}.js`], () => {
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
