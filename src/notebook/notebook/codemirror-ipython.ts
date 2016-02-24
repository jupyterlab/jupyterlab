// IPython mode is just a slightly altered Python Mode with `?` being an
// operator. Here we define `ipython` mode in the require `python`
// callback to auto-load python mode.
"use strict";

import * as CodeMirror
  from 'codemirror';

import 'codemirror/mode/python/python';

CodeMirror.defineMode("ipython", (config: CodeMirror.EditorConfiguration, modeOptions?: any) => {
    let pythonConf: any = {};
    for (var prop in modeOptions) {
      if (modeOptions.hasOwnProperty(prop)) {
        pythonConf[prop] = modeOptions[prop];
      }
    }
    pythonConf.name = 'python';
    pythonConf.singleOperators = new RegExp("^[\\+\\-\\*/%&|\\^~<>!\\?]");
    if (pythonConf.version === 3) {
        pythonConf.identifiers = new RegExp("^[_A-Za-z\u00A1-\uFFFF][_A-Za-z0-9\u00A1-\uFFFF]*");
    } else if (pythonConf.version === 2) {
      pythonConf.identifiers = new RegExp("^[_A-Za-z][_A-Za-z0-9]*");
    }
    return CodeMirror.getMode(config, pythonConf);
}, 'python');

CodeMirror.defineMIME("text/x-ipython", "ipython");
