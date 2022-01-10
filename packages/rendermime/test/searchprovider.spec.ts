// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  HTMLStringSearchEngine,
  MarkdownSearchEngine
} from '@jupyterlab/rendermime';

describe('@jupyterlab/rendermime', () => {
  describe('MarkdownSearchEngine', () => {
    describe('search', () => {
      it.each([
        ['hello, \\begin{align} the \\end{align}, **the** world', 40],
        ['hello the world', 6],
        ['hello [the](https://example.com "the nice link") world', 7],
        ['hello [_](https://example.com "the nice link") the world', 47],
        [
          'hello ![the](https://example.com/world.jpg "the nice image") the world',
          61
        ],
        [
          'hello [![the](https://example.com/world.jpg "the nice image")](https://example.com/linked-image) the world',
          97
        ],
        ['hello \\\\(\n     the    /alpha\n        \\\\) the world', 41]
      ])('escape maths and links in "%s"', async (test, position) => {
        const matches = await MarkdownSearchEngine.search(/the/, test);
        expect(matches.length).toEqual(1);
        expect(matches[0].position).toEqual(position);
      });
    });
  });

  describe('HTMLStringSearchEngine', () => {
    describe('search', () => {
      it.each([
        ['hello the world', 6],
        [
          'hello <a href="https://example.com" title="the nice link">the</a> world',
          58
        ],
        [
          'hello <a href="https://example.com" title="the nice link">_</a> the world',
          64
        ],
        [
          'hello <img src="https://example.com/world.jpg" alt="the nice link"> the world',
          68
        ],
        [
          'hello <a href="https://example.com/linked-image" title="the nice link"><img src="https://example.com/world.jpg" alt="the nice link"></a> the world',
          137
        ],
        ['hello <span class="the-class">the</span> world', 30]
      ])('escape HTML tags in "%s"', async (test, position) => {
        const matches = await HTMLStringSearchEngine.search(/the/, test);
        expect(matches.length).toEqual(1);
        expect(matches[0].position).toEqual(position);
      });
    });
  });
});
