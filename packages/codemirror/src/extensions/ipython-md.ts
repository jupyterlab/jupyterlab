// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { parseMixed, Parser } from '@lezer/common';
import { tags } from '@lezer/highlight';
import {
  DelimiterType,
  InlineContext,
  MarkdownConfig,
  NodeSpec
} from '@lezer/markdown';

// Mathematical expression delimiters
const INLINE_MATH_DOLLAR = 'InlineMathDollar';
const INLINE_MATH_BRACKET = 'InlineMathBracket';
const BLOCK_MATH_DOLLAR = 'BlockMathDollar';
const BLOCK_MATH_BRACKET = 'BlockMathBracket';

/**
 * Length of the delimiter for a math expression
 */
const DELIMITER_LENGTH: Record<string, number> = {
  [INLINE_MATH_DOLLAR]: 1,
  [INLINE_MATH_BRACKET]: 3,
  [BLOCK_MATH_DOLLAR]: 2,
  [BLOCK_MATH_BRACKET]: 3
};

/**
 * Delimiters for math expressions
 */
// Delimiters must be defined as constant because they are used in object match tests
const DELIMITERS = Object.keys(DELIMITER_LENGTH).reduce<
  Record<string, DelimiterType>
>((agg, name) => {
  agg[name] = { mark: `${name}Mark`, resolve: name };
  return agg;
}, {});

/**
 * Define an IPython mathematical expression parser for Markdown.
 *
 * @param latexParser CodeMirror {@link Parser} for LaTeX mathematical expression
 * @returns Markdown extension
 */
export function parseMathIPython(latexParser?: Parser): MarkdownConfig {
  const defineNodes = new Array<NodeSpec>();
  Object.keys(DELIMITER_LENGTH).forEach(name => {
    defineNodes.push(
      {
        name,
        style: tags.emphasis
      },
      { name: `${name}Mark`, style: tags.processingInstruction }
    );
  });
  return {
    defineNodes,
    parseInline: [
      {
        name: BLOCK_MATH_DOLLAR,
        parse(cx: InlineContext, next: number, pos: number): number {
          if (next != 36 /* '$' */ || cx.char(pos + 1) != 36) {
            return -1;
          }

          return cx.addDelimiter(
            DELIMITERS[BLOCK_MATH_DOLLAR],
            pos,
            pos + DELIMITER_LENGTH[BLOCK_MATH_DOLLAR],
            true,
            true
          );
        }
      },
      {
        name: INLINE_MATH_DOLLAR,
        parse(cx: InlineContext, next: number, pos: number): number {
          if (next != 36 /* '$' */ || cx.char(pos + 1) == 36) {
            return -1;
          }

          return cx.addDelimiter(
            DELIMITERS[INLINE_MATH_DOLLAR],
            pos,
            pos + DELIMITER_LENGTH[INLINE_MATH_DOLLAR],
            true,
            true
          );
        }
      },
      // Inline expression wrapped in \\( ... \\)
      {
        name: INLINE_MATH_BRACKET,
        before: 'Escape', // Search for this delimiter before the escape character
        parse(cx: InlineContext, next: number, pos: number): number {
          if (
            next != 92 /* '\' */ ||
            cx.char(pos + 1) != 92 ||
            ![40 /* '(' */, 41 /* ')' */].includes(cx.char(pos + 2))
          ) {
            return -1;
          }

          return cx.addDelimiter(
            DELIMITERS[INLINE_MATH_BRACKET],
            pos,
            pos + DELIMITER_LENGTH[INLINE_MATH_BRACKET],
            cx.char(pos + 2) == 40,
            cx.char(pos + 2) == 41
          );
        }
      },
      // Block expression wrapped in \\[ ... \\]
      {
        name: BLOCK_MATH_BRACKET,
        before: 'Escape', // Search for this delimiter before the escape character
        parse(cx: InlineContext, next: number, pos: number): number {
          if (
            next != 92 /* '\' */ ||
            cx.char(pos + 1) != 92 ||
            ![91 /* '[' */, 93 /* ']' */].includes(cx.char(pos + 2))
          ) {
            return -1;
          }

          return cx.addDelimiter(
            DELIMITERS[BLOCK_MATH_BRACKET],
            pos,
            pos + DELIMITER_LENGTH[BLOCK_MATH_BRACKET],
            cx.char(pos + 2) == 91,
            cx.char(pos + 2) == 93
          );
        }
      }
    ],
    wrap: latexParser
      ? parseMixed((node, input) => {
          // Test if the node type is one of the math expression
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
