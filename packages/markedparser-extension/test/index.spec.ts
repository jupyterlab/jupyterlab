// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { IEditorLanguageRegistry } from '@jupyterlab/codemirror';

import { createMarkdownParser } from '../src';

describe('@jupyterlab/markedparser-extension', () => {
  describe('getBlockTokens()', () => {
    it('returns top-level block tokens with source line numbers', async () => {
      const parser = createMarkdownParser({} as IEditorLanguageRegistry);
      const source = [
        '# Title',
        '',
        'Paragraph',
        '',
        '![alt](image.png)',
        '',
        '| A | B |',
        '| - | - |',
        '| 1 | 2 |',
        '',
        '- One',
        '  - Nested',
        '',
        '- Two',
        '',
        '~~~ts',
        'const x = 1;',
        '~~~',
        '',
        '<div>Raw</div>',
        ''
      ].join('\n');

      const tokens = await parser.getBlockTokens(source);

      expect(tokens.map(token => [token.type, token.line])).toEqual([
        ['heading', 0],
        ['paragraph', 2],
        ['space', 2],
        ['paragraph', 4],
        ['space', 4],
        ['table', 6],
        ['list', 10],
        ['space', 13],
        ['code', 15],
        ['space', 17],
        ['html', 19]
      ]);
      expect(tokens[0].raw).toBe('# Title\n\n');
      expect(tokens[5].raw).toContain('| 1 | 2 |');
    });
  });
});
