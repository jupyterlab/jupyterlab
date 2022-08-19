// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IMarkdownParser, renderMarkdown } from '@jupyterlab/rendermime';
import { TableOfContents } from '../tokens';
import { getPrefix } from './common';

/**
 * Markdown heading
 */
export interface IMarkdownHeading extends TableOfContents.IHeading {
  /**
   * Heading line
   */
  line: number;
  /**
   * Raw string containing the heading
   */
  raw: string;
}

/**
 * Build the heading html id.
 *
 * @param raw Raw markdown heading
 * @param level Heading level
 */
export async function getHeadingId(
  parser: IMarkdownParser,
  raw: string,
  level: number
): Promise<string | null> {
  try {
    const innerHTML = await parser.render(raw);

    if (!innerHTML) {
      return null;
    }

    const container = document.createElement('div');
    container.innerHTML = innerHTML;
    const header = container.querySelector(`h${level}`);
    if (!header) {
      return null;
    }

    return renderMarkdown.createHeaderId(header);
  } catch (reason) {
    console.error('Failed to parse a heading.', reason);
  }

  return null;
}

/**
 * Parses the provided string and returns a list of headings.
 *
 * @param text - Input text
 * @param options - Parser configuration
 * @param initialLevels - Initial levels to use for computing the prefix
 * @returns List of headings
 */
export function getHeadings(
  text: string,
  options?: Partial<TableOfContents.IConfig>,
  initialLevels: number[] = []
): IMarkdownHeading[] {
  const config = {
    ...TableOfContents.defaultConfig,
    ...options
  } as TableOfContents.IConfig;

  // Split the text into lines:
  const lines = text.split('\n');

  // Iterate over the lines to get the header level and text for each line:
  const levels = initialLevels;
  let previousLevel = levels.length;
  let headings = new Array<IMarkdownHeading>();
  let isCodeBlock;
  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    let line = lines[lineIdx];

    if (line === '') {
      // Bail early
      continue;
    }

    // Don't check for Markdown headings if in a code block:
    if (line.startsWith('```')) {
      isCodeBlock = !isCodeBlock;
    }
    if (isCodeBlock) {
      continue;
    }

    const heading = parseHeading(line, lines[lineIdx + 1]); // append the next line to capture alternative style Markdown headings

    if (heading) {
      let level = heading.level;

      if (level > 0 && level <= config.maximalDepth) {
        const prefix = getPrefix(level, previousLevel, levels, config);
        previousLevel = level;

        headings.push({
          text: heading.text,
          prefix,
          level,
          line: lineIdx,
          raw: heading.raw
        });
      }
    }
  }
  return headings;
}

const MARKDOWN_MIME_TYPE = [
  'text/x-ipythongfm',
  'text/x-markdown',
  'text/x-gfm',
  'text/markdown'
];

/**
 * Returns whether a MIME type corresponds to a Markdown flavor.
 *
 * @param mime - MIME type string
 * @returns boolean indicating whether a provided MIME type corresponds to a Markdown flavor
 *
 * @example
 * const bool = isMarkdown('text/markdown');
 * // returns true
 *
 * @example
 * const bool = isMarkdown('text/plain');
 * // returns false
 */
export function isMarkdown(mime: string): boolean {
  return MARKDOWN_MIME_TYPE.includes(mime);
}

/**
 * Interface describing a parsed heading result.
 *
 * @private
 */
interface IHeader {
  /**
   * Heading text.
   */
  text: string;

  /**
   * Heading level.
   */
  level: number;

  /**
   * Raw string containing the heading
   */
  raw: string;
}

/**
 * Parses a heading, if one exists, from a provided string.
 *
 * ## Notes
 *
 * -   Heading examples:
 *
 *     -   Markdown heading:
 *
 *         ```
 *         # Foo
 *         ```
 *
 *     -   Markdown heading (alternative style):
 *
 *         ```
 *         Foo
 *         ===
 *         ```
 *
 *         ```
 *         Foo
 *         ---
 *         ```
 *
 *     -   HTML heading:
 *
 *         ```
 *         <h3>Foo</h3>
 *         ```
 *
 * @private
 * @param line - Line to parse
 * @param nextLine - The line after the one to parse
 * @returns heading info
 *
 * @example
 * const out = parseHeading('### Foo\n');
 * // returns {'text': 'Foo', 'level': 3}
 *
 * @example
 * const out = parseHeading('Foo\n===\n');
 * // returns {'text': 'Foo', 'level': 1}
 *
 * @example
 * const out = parseHeading('<h4>Foo</h4>\n');
 * // returns {'text': 'Foo', 'level': 4}
 *
 * @example
 * const out = parseHeading('Foo');
 * // returns null
 */
function parseHeading(line: string, nextLine?: string): IHeader | null {
  // Case: Markdown heading
  let match = line.match(/^([#]{1,6}) (.*)/);
  if (match) {
    if (!skipHeading.test(match[0])) {
      return {
        text: cleanTitle(match[2]),
        level: match[1].length,
        raw: line
      };
    }
  }
  // Case: Markdown heading (alternative style)
  if (nextLine) {
    match = nextLine.match(/^ {0,3}([=]{2,}|[-]{2,})\s*$/);
    if (match) {
      if (!skipHeading.test(line)) {
        return {
          text: cleanTitle(line),
          level: match[1][0] === '=' ? 1 : 2,
          raw: [line, nextLine].join('\n')
        };
      }
    }
  }
  // Case: HTML heading (WARNING: this is not particularly robust, as HTML headings can span multiple lines)
  match = line.match(/<h([1-6]).*>(.*)<\/h\1>/i);
  if (match) {
    if (!skipHeading.test(match[0])) {
      return {
        text: match[2],
        level: parseInt(match[1], 10),
        raw: line
      };
    }
  }

  return null;
}

function cleanTitle(heading: string): string {
  // take special care to parse Markdown links into raw text
  return heading.replace(/\[(.+)\]\(.+\)/g, '$1');
}

/**
 * Ignore title with html tag with a class name equal to `jp-toc-ignore` or `tocSkip`
 */
const skipHeading =
  /<\w+\s(.*?\s)?class="(.*?\s)?(jp-toc-ignore|tocSkip)(\s.*?)?"(\s.*?)?>/;
