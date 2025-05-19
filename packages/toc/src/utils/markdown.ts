// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Sanitizer } from '@jupyterlab/apputils';
import { IMarkdownParser, renderMarkdown } from '@jupyterlab/rendermime';
import { IRenderMime } from '@jupyterlab/rendermime-interfaces';
import { TableOfContents } from '../tokens';

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
 * @param sanitizer HTML sanitizer
 */
export async function getHeadingId(
  markdownParser: IMarkdownParser,
  raw: string,
  level: number,
  sanitizer?: IRenderMime.ISanitizer
): Promise<string | null> {
  try {
    const host = document.createElement('div');

    await renderMarkdown({
      markdownParser,
      host,
      source: raw,
      trusted: false,
      sanitizer: sanitizer ?? new Sanitizer(),
      shouldTypeset: false,
      resolver: null,
      linkHandler: null,
      latexTypesetter: null
    });

    const header = host.querySelector(`h${level}`);
    if (!header) {
      return null;
    }

    return header.id;
  } catch (reason) {
    console.error('Failed to parse a heading.', reason);
  }

  return null;
}

async function getRenderedMarkdown(
  parser: IMarkdownParser,
  markdownText: string
) {
  const renderedHtml = parser.render(markdownText);
  return renderedHtml;
}

export async function getHeadings(
  parser: IMarkdownParser | null,
  text: string
): Promise<IMarkdownHeading[]> {
  let renderedHtml = '';
  if (parser) {
    renderedHtml = await getRenderedMarkdown(parser, text);
  }

  const headings = new Array<IMarkdownHeading>();
  const domParser = new DOMParser();
  const doc = domParser.parseFromString(renderedHtml, 'text/html');

  // Query all heading elements (h1-h6)
  const headingElements = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');

  let line: number = 1;
  headingElements.forEach(headingEl => {
    const level = parseInt(headingEl.tagName.substring(1), 10);
    const text = headingEl.textContent?.trim() || '';
    // const id = headingEl.id;

    headings.push({
      text: text,
      line: line++, //To compute line properly
      level: level,
      // raw: headingEl.innerHTML,
      raw: text,
      skip: skipHeading.test(text)
    });
  });

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
 * Ignore title with html tag with a class name equal to `jp-toc-ignore` or `tocSkip`
 */
const skipHeading =
  /<\w+\s(.*?\s)?class="(.*?\s)?(jp-toc-ignore|tocSkip)(\s.*?)?"(\s.*?)?>/;
