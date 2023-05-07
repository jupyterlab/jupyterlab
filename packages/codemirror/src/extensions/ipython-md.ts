// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { tags } from '@lezer/highlight';
import { DelimiterType, InlineContext, MarkdownConfig } from '@lezer/markdown';

// TODO: add support for LaTeX
// This should be coded as an extension for https://github.com/lezer-parser/markdown
// see https://github.com/lezer-parser/markdown/blob/main/src/extension.ts for examples
// Then this extension can be passed to the markdown function above:
//
// load: () => {
//   return import('@codemirror/lang-markdown').then(m => m.markdown({extensions: latex}));
// }

/*import CodeMirror from 'codemirror';
import 'codemirror/addon/mode/multiplex';
import 'codemirror/mode/gfm/gfm';
import 'codemirror/mode/stex/stex';
*/
/**
 * Define an IPython GFM (GitHub Flavored Markdown) mode.
 *
 * Is just a slightly altered GFM Mode with support for LaTeX.
 * LaTeX support was supported by Codemirror GFM as of
 *   https://github.com/codemirror/CodeMirror/pull/567
 *  But was later removed in
 *   https://github.com/codemirror/CodeMirror/commit/d9c9f1b1ffe984aee41307f3e927f80d1f23590c
 */
/*CodeMirror.defineMode(
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
});*/

const INLINE_MATH_NODE = 'InlineMath';

const INLINE_MATH_DELIMITER: DelimiterType = {
  resolve: INLINE_MATH_NODE,
  mark: `${INLINE_MATH_NODE}Mark`
};

const INLINE_MATH2_NODE = 'InlineMath2';

const INLINE_MATH2_DELIMITER: DelimiterType = {
  resolve: INLINE_MATH2_NODE,
  mark: `${INLINE_MATH2_NODE}Mark`
};

/**
 * Define an IPython mathematical expression parser for Markdown.
 */
export const MathIPython: MarkdownConfig = {
  defineNodes: [
    {
      name: INLINE_MATH_NODE,
      style: tags.quote
    },
    { name: `${INLINE_MATH_NODE}Mark`, style: tags.processingInstruction },
    {
      name: INLINE_MATH2_NODE,
      style: tags.quote
    },
    { name: `${INLINE_MATH2_NODE}Mark`, style: tags.processingInstruction }
  ],
  parseInline: [
    {
      name: INLINE_MATH2_NODE,
      parse(cx: InlineContext, next: number, pos: number): number {
        if (next != 36 /* '$' */ || cx.char(pos + 1) != 36) {
          return -1;
        }

        return cx.addDelimiter(
          INLINE_MATH2_DELIMITER,
          pos,
          pos + 2,
          true,
          true
        );
      }
    },
    {
      name: INLINE_MATH_NODE,
      parse(cx: InlineContext, next: number, pos: number): number {
        if (next != 36 /* '$' */ || cx.char(pos + 1) == 36) {
          return -1;
        }

        return cx.addDelimiter(INLINE_MATH_DELIMITER, pos, pos + 1, true, true);
      }
    }
  ]
};
