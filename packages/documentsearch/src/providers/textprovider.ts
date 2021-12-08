// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ITextSearchMatch } from '../tokens';

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
