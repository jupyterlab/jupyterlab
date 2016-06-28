// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as CodeMirror
  from 'codemirror';

import 'codemirror/mode/stex/stex';
import 'codemirror/mode/gfm/gfm';
import 'codemirror/addon/mode/multiplex';


/**
 * Define an IPython GFM (GitHub Flavored Markdown) mode. 
 *
 * Is just a slightly altered GFM Mode with support for latex.
 * Latex support was supported by Codemirror GFM as of
 *   https://github.com/codemirror/CodeMirror/pull/567
 *  But was later removed in
 *   https://github.com/codemirror/CodeMirror/commit/d9c9f1b1ffe984aee41307f3e927f80d1f23590c
 */
CodeMirror.defineMode('ipythongfm', (config: CodeMirror.EditorConfiguration, modeOptions?: any) => {
  let gfm_mode = CodeMirror.getMode(config, 'gfm');
  let tex_mode = CodeMirror.getMode(config, 'stex');

  return CodeMirror.multiplexingMode(
    gfm_mode,
    {
      open: '$', close: '$',
      mode: tex_mode,
      delimStyle: 'delimit'
    },
    {
      // not sure this works as $$ is interpreted at (opening $, closing $, as defined just above)
      open: '$$', close: '$$',
      mode: tex_mode,
      delimStyle: 'delimit'
    },
    {
      open: '\\(', close: '\\)',
      mode: tex_mode,
      delimStyle: 'delimit'
    },
    {
      open: '\\[', close: '\\]',
      mode: tex_mode,
      delimStyle: 'delimit'
    }
    // .. more multiplexed styles can follow here
  );
});


CodeMirror.defineMIME('text/x-ipythongfm', 'ipythongfm');
