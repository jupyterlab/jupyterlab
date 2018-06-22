// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import CodeMirror from 'codemirror';

import 'codemirror/mode/stex/stex';
import 'codemirror/mode/gfm/gfm';
import 'codemirror/addon/mode/multiplex';


/**
 * Define an IPython GFM (GitHub Flavored Markdown) mode.
 *
 * Is just a slightly altered GFM Mode with support for LaTeX.
 * LaTeX support was supported by Codemirror GFM as of
 *   https://github.com/codemirror/CodeMirror/pull/567
 *  But was later removed in
 *   https://github.com/codemirror/CodeMirror/commit/d9c9f1b1ffe984aee41307f3e927f80d1f23590c
 */
CodeMirror.defineMode('ipythongfm', (config: CodeMirror.EditorConfiguration, modeOptions?: any) => {
  let gfmMode = CodeMirror.getMode(config, 'gfm');
  let texMode = CodeMirror.getMode(config, { name: 'stex', inMathMode: true });

  return CodeMirror.multiplexingMode(
    gfmMode,
    {
      open: '$$', close: '$$',
      mode: texMode,
      delimStyle: 'delimit'
    },
    {
      open: '$', close: '$',
      mode: texMode,
      delimStyle: 'delimit'
    },
    {
      open: '\\(', close: '\\)',
      mode: texMode,
      delimStyle: 'delimit'
    },
    {
      open: '\\[', close: '\\]',
      mode: texMode,
      delimStyle: 'delimit'
    }
    // .. more multiplexed styles can follow here
  );
}, 'gfm');

CodeMirror.defineMIME('text/x-ipythongfm', 'ipythongfm');
CodeMirror.modeInfo.push({
  ext: [],
  mime: 'text/x-ipythongfm',
  mode: 'ipythongfm',
  name: 'ipythongfm'
});
