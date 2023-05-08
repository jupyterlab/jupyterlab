// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { parseMixed, Parser } from '@lezer/common';
import { tags } from '@lezer/highlight';
import { DelimiterType, InlineContext, MarkdownConfig } from '@lezer/markdown';

const DELIMITER_LENGTH: Record<string, number> = {
  InlineMath: 1,
  InlineMathBracket: 3,
  InlineMath2: 2,
  BlockMathBracket: 3
};

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
export function parseMathIPython(latexParser: Parser): MarkdownConfig {
  return {
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

          return cx.addDelimiter(
            INLINE_MATH_DELIMITER,
            pos,
            pos + 1,
            true,
            true
          );
        }
      }
    ],
    wrap: latexParser
      ? parseMixed((node, input) => {
          const delimiterLength = DELIMITER_LENGTH[node.type.name];
          if (delimiterLength) {
            return {
              parser: latexParser,
              // Remove delimiter from LaTeX parser otherwise it won't be highlighted
              overlay: [
                {
                  from: node.from + delimiterLength,
                  to: node.to - delimiterLength
                }
              ]
            };
          }

          return null;
        })
      : undefined
  };
}
