// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ITextSearchMatch } from '@jupyterlab/documentsearch';
import { removeMath } from './latex';

const MARKDOWN_IMAGE_LINKS = /\!\[.*?\]\(.+?\)/g;
const MARKDOWN_URL_LINKS = /\[(.*?)\]\(.+?\)/g;

/**
 * Search provider for plain/text
 */
export const TextSearchEngine = {
  search(query: RegExp, data: string): Promise<ITextSearchMatch[]> {
    // If data is not a string, try to JSON serialize the data.
    if (typeof data !== 'string') {
      try {
        data = JSON.stringify(data);
      } catch (reason) {
        console.warn(
          'Unable to search with TextSearchEngine non-JSON serializable object.',
          reason,
          data
        );
        return Promise.resolve([]);
      }
    }

    if (!query.global) {
      query = new RegExp(query.source, query.flags + 'g');
    }

    const matches = new Array<ITextSearchMatch>();

    let lineIdx = 0;
    for (const line of data.split('\n')) {
      // Reset query index
      query.lastIndex = 0;
      let match: RegExpExecArray | null = null;
      while ((match = query.exec(line)) !== null) {
        matches.push({
          text: match[0],
          line: lineIdx,
          position: match.index,
          fragment: line,
          index: 0
        });
      }
      lineIdx++;
    }

    return Promise.resolve(matches);
  }
};

/**
 * Search provider for markdown string
 *
 * It uses TextSearchEngine after filtering some unrendered fragments
 * like links
 */
export const MarkdownSearchEngine = {
  search(query: RegExp, data: string): Promise<ITextSearchMatch[]> {
    const { text, math } = removeMath(data);
    // Replace all the math group placeholders in the text
    // with white space strings preserving \n to remove it from search.
    data = text.replace(/@@(\d+)@@/g, (match: string, n: number) =>
      // This preserves \n and \r
      math[n].replace(/.*/g, hit => ' '.repeat(hit.length))
    );

    // Replace link with white spaces to not search within them.
    data = data
      // Replace first image link so we don't catch them in the second search for URL
      .replace(MARKDOWN_IMAGE_LINKS, hit => ' '.repeat(hit.length))
      .replace(
        MARKDOWN_URL_LINKS,
        (hit: string, displayedText: string) =>
          // The 2 comes from [ ] already replaced
          ` ${displayedText} ${' '.repeat(
            hit.length - displayedText.length - 2
          )}`
      );

    return TextSearchEngine.search(query, data);
  }
};
