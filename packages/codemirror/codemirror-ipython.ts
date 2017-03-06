// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as CodeMirror
  from 'codemirror';

import 'codemirror/mode/meta';
import 'codemirror/mode/python/python';


/**
 * Define an IPython codemirror mode.
 *
 * It is a slightly altered Python Mode with a `?` operator.
 */
CodeMirror.defineMode('ipython', (config: CodeMirror.EditorConfiguration, modeOptions?: any) => {
    let pythonConf: any = {};
    for (let prop in modeOptions) {
      if (modeOptions.hasOwnProperty(prop)) {
        pythonConf[prop] = modeOptions[prop];
      }
    }
    pythonConf.name = 'python';
    pythonConf.singleOperators = new RegExp('^[\\+\\-\\*/%&|@\\^~<>!\\?]');
    pythonConf.identifiers = new RegExp('^[_A-Za-z\u00A1-\uFFFF][_A-Za-z0-9\u00A1-\uFFFF]*');
    return CodeMirror.getMode(config, pythonConf);
}, 'python');

CodeMirror.defineMIME('text/x-ipython', 'ipython');
CodeMirror.modeInfo.push({
  ext: [],
  mime: 'text/x-ipython',
  mode: 'ipython',
  name: 'ipython'
});
