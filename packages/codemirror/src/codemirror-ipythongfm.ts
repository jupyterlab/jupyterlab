// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import CodeMirror from 'codemirror';
import 'codemirror/addon/mode/multiplex.js';
import 'codemirror/mode/gfm/gfm.js';
import 'codemirror/mode/stex/stex.js';

/**
 * Define an IPython GFM (GitHub Flavored Markdown) mode.
 *
 * Is just a slightly altered GFM Mode with support for LaTeX.
 * LaTeX support was supported by Codemirror GFM as of
 *   https://github.com/codemirror/CodeMirror/pull/567
 *  But was later removed in
 *   https://github.com/codemirror/CodeMirror/commit/d9c9f1b1ffe984aee41307f3e927f80d1f23590c
 */
CodeMirror.defineMode(
  'ipythongfm',
  (config: CodeMirror.EditorConfiguration, modeOptions?: any) => {
    const gfmMode = CodeMirror.getMode(config, {
      name: 'gfm',
      // Override list3 with an under-used token, rather than `keyword`
      tokenTypeOverrides: { list3: 'string-2' }
    });
    const texMode = CodeMirror.getMode(config, {
      name: 'stex',
      inMathMode: true
    });

    return CodeMirror.multiplexingMode(
      gfmMode,
      // force parsing inline code and code blocks with gfmMode to prevent
      // parsing them as tex see:
      // https://github.com/jupyterlab/jupyterlab/issues/6774
      {
        open: '<code>',
        close: '</code>',
        mode: gfmMode,
        parseDelimiters: true
      },
      {
        open: '<pre>',
        close: '</pre>',
        mode: gfmMode,
        parseDelimiters: true
      },
      {
        open: '```',
        close: '```',
        mode: gfmMode,
        parseDelimiters: true
      },
      {
        open: '`',
        close: '`',
        mode: gfmMode,
        parseDelimiters: true
      },
      // only if we did not match a code element or block,
      // then try do parse using the tex mode
      {
        open: '$$',
        close: '$$',
        mode: texMode,
        delimStyle: 'delimit'
      },
      {
        // `$math mode$` is only matched if both opening
        // and closing $ are in the same line
        open: /\$(?=.*\$)/,
        close: '$',
        mode: texMode,
        delimStyle: 'delimit'
      },
      {
        open: '\\(',
        close: '\\)',
        mode: texMode,
        delimStyle: 'delimit'
      },
      {
        open: '\\[',
        close: '\\]',
        mode: texMode,
        delimStyle: 'delimit'
      }
      // .. more multiplexed styles can follow here
    );
  },
  'gfm'
);

CodeMirror.defineMIME('text/x-ipythongfm', 'ipythongfm');
CodeMirror.modeInfo.push({
  ext: [],
  mime: 'text/x-ipythongfm',
  mode: 'ipythongfm',
  name: 'ipythongfm'
});
