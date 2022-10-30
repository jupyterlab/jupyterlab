// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { TableOfContentsUtils } from '@jupyterlab/toc';

describe('TableOfContentsUtils', () => {
  describe('#getHTMLHeadings', () => {
    it.each<[string, TableOfContentsUtils.IHTMLHeading[]]>([
      [
        '<h1>Title</h1>',
        [
          {
            text: 'Title',
            level: 1,
            id: null,
            prefix: '1. ',
            skip: false
          }
        ]
      ],
      [
        '<h2>Title</h2>',
        [
          {
            text: 'Title',
            level: 2,
            id: null,
            prefix: '0.1. ',
            skip: false
          }
        ]
      ],
      [
        '<h3>Title</h3>',
        [
          {
            text: 'Title',
            level: 3,
            id: null,
            prefix: '0.0.1. ',
            skip: false
          }
        ]
      ],
      [
        '<h4 id="header-4-id">Title</h4>',
        [
          {
            text: 'Title',
            level: 4,
            id: 'header-4-id',
            prefix: '0.0.0.1. ',
            skip: false
          }
        ]
      ],
      [
        '<h5>Title</h5>',
        [
          {
            text: 'Title',
            level: 5,
            id: null,
            prefix: '0.0.0.0.1. ',
            skip: false
          }
        ]
      ],
      [
        '<h6 id="another-h6-id">Title</h6>',
        [
          {
            text: 'Title',
            level: 6,
            id: 'another-h6-id',
            prefix: '0.0.0.0.0.1. ',
            skip: false
          }
        ]
      ],
      ['<h2 class="a jp-toc-ignore" title="noisy title">Title</h2>', []],
      ['<h2 id="another-h6-id" class="tocSkip b">Title</h2>', []]
    ])('should extract headings from %s', (src, headers) => {
      const headings = TableOfContentsUtils.filterHeadings(
        TableOfContentsUtils.getHTMLHeadings(src),
        {
          maximalDepth: 6,
          numberHeaders: true
        }
      );
      expect(headings).toHaveLength(headers.length);

      for (let i = 0; i < headers.length; i++) {
        expect(headings[i]).toEqual(headers[i]);
      }
    });

    it.each<[number]>([[1], [2], [3], [4], [5], [6]])(
      'should limit the level to %d',
      maximalDepth => {
        const src = `<h1>Title</h1>
<h2>Title</h2>
<h3>Title</h3>
<h4>Title</h4>
<h5>Title</h5>
<h6>Title</h6>`;

        const headings = TableOfContentsUtils.filterHeadings(
          TableOfContentsUtils.getHTMLHeadings(src),
          {
            maximalDepth
          }
        );
        expect(headings).toHaveLength(maximalDepth);
        expect(headings[headings.length - 1].level).toEqual(maximalDepth);
      }
    );

    it.each<[boolean]>([[true], [false]])(
      `should have prefix or not`,
      numberHeaders => {
        const src = '<h3>Title</h3>';

        const headings = TableOfContentsUtils.filterHeadings(
          TableOfContentsUtils.getHTMLHeadings(src),
          {
            numberHeaders
          }
        );
        expect(headings).toHaveLength(1);
        expect(headings[0].prefix).toEqual(numberHeaders ? '0.0.1. ' : '');
      }
    );

    it.each<[boolean]>([[true], [false]])(
      `should number h1 or not`,
      numberingH1 => {
        const src = '<h1>Title</h1>';

        const headings = TableOfContentsUtils.filterHeadings(
          TableOfContentsUtils.getHTMLHeadings(src),
          {
            numberingH1,
            numberHeaders: true
          }
        );
        expect(headings).toHaveLength(1);
        expect(headings[0].prefix).toEqual(numberingH1 ? '1. ' : '');
      }
    );

    it.each<[boolean]>([[true], [false]])(
      `should respect base number`,
      numberingH1 => {
        const src = `<h1>Title</h1>
<h2>Title</h2>`;

        const headings = TableOfContentsUtils.filterHeadings(
          TableOfContentsUtils.getHTMLHeadings(src),
          {
            numberHeaders: true,
            numberingH1,
            baseNumbering: 3
          }
        );
        expect(headings).toHaveLength(2);
        expect(headings[0].prefix).toEqual(numberingH1 ? '3. ' : '');
        expect(headings[1].prefix).toEqual(numberingH1 ? '3.1. ' : '3. ');
      }
    );
  });
});
