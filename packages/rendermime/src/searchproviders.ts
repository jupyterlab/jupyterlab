// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ISearchMatch, TextSearchEngine } from '@jupyterlab/documentsearch';
import { removeMath } from './latex';

const MARKDOWN_IMAGE_LINKS = /\!\[.*?\]\(.+?\)/g;
const MARKDOWN_URL_LINKS = /\[(.*?)\]\(.+?\)/g;

/**
 * Search provider for markdown string
 *
 * It uses TextSearchEngine after filtering some unrendered fragments
 * like links and math insets.
 */
export const MarkdownSearchEngine = {
  search(query: RegExp, data: string): Promise<ISearchMatch[]> {
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

// TODO HTMLStringSearchEngine => search HTML after whiting tags to search only text node
