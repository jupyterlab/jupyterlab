// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { MarkdownSearchEngine } from '@jupyterlab/rendermime';

describe('@jupyterlab/rendermime', () => {
  describe('MarkdownSearchEngine', () => {
    describe('search', () => {
      it.each([
        ['hello, \\begin{align} the \\end{align}, **the** world', 0, 40],
        ['hello the world', 0, 6],
        ['hello [the](https://example.com "the nice link") world', 0, 7],
        ['hello [_](https://example.com "the nice link") the world', 0, 47],
        [
          'hello ![the](https://example.com/world.jpg "the nice image") the world',
          0,
          61
        ],
        [
          'hello [![the](https://example.com/world.jpg "the nice image")](https://example.com/linked-image) the world',
          0,
          97
        ],
        ['hello \\\\(\n     the    /alpha\n        \\\\) the world', 2, 12]
      ])('escape maths and links in "%s"', async (test, line, position) => {
        const matches = await MarkdownSearchEngine.search(/the/, test);
        expect(matches.length).toEqual(1);
        expect(matches[0].line).toEqual(line);
        expect(matches[0].position).toEqual(position);
      });
    });
  });
});
