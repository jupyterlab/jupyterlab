// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ToCUtils } from '@jupyterlab/toc';

describe('ToCUtils', () => {
  describe('Markdown', () => {
    describe('#getHeadings', () => {
      it.each<[string, Partial<ToCUtils.Markdown.IMarkdownHeading>[]]>([
        [
          '# Title',
          [{ text: 'Title', level: 1, line: 0, raw: '# Title', prefix: '1. ' }]
        ],
        [
          '## Title',
          [
            {
              text: 'Title',
              level: 2,
              line: 0,
              raw: '## Title',
              prefix: '0.1. '
            }
          ]
        ],
        [
          '### Title',
          [
            {
              text: 'Title',
              level: 3,
              line: 0,
              raw: '### Title',
              prefix: '0.0.1. '
            }
          ]
        ],
        [
          '#### Title',
          [
            {
              text: 'Title',
              level: 4,
              line: 0,
              raw: '#### Title',
              prefix: '0.0.0.1. '
            }
          ]
        ],
        [
          '##### Title',
          [
            {
              text: 'Title',
              level: 5,
              line: 0,
              raw: '##### Title',
              prefix: '0.0.0.0.1. '
            }
          ]
        ],
        [
          '###### Title',
          [
            {
              text: 'Title',
              level: 6,
              line: 0,
              raw: '###### Title',
              prefix: '0.0.0.0.0.1. '
            }
          ]
        ],
        [
          'Title\n==',
          [
            {
              text: 'Title',
              level: 1,
              line: 0,
              raw: 'Title\n==',
              prefix: '1. '
            }
          ]
        ],
        [
          'Title\n--',
          [
            {
              text: 'Title',
              level: 2,
              line: 0,
              raw: 'Title\n--',
              prefix: '0.1. '
            }
          ]
        ],
        [
          '<h1>Title</h1>',
          [
            {
              text: 'Title',
              level: 1,
              line: 0,
              raw: '<h1>Title</h1>',
              prefix: '1. '
            }
          ]
        ],
        [
          '<h2>Title</h2>',
          [
            {
              text: 'Title',
              level: 2,
              line: 0,
              raw: '<h2>Title</h2>',
              prefix: '0.1. '
            }
          ]
        ],
        [
          '<h3>Title</h3>',
          [
            {
              text: 'Title',
              level: 3,
              line: 0,
              raw: '<h3>Title</h3>',
              prefix: '0.0.1. '
            }
          ]
        ],
        [
          '<h4>Title</h4>',
          [
            {
              text: 'Title',
              level: 4,
              line: 0,
              raw: '<h4>Title</h4>',
              prefix: '0.0.0.1. '
            }
          ]
        ],
        [
          '<h5>Title</h5>',
          [
            {
              text: 'Title',
              level: 5,
              line: 0,
              raw: '<h5>Title</h5>',
              prefix: '0.0.0.0.1. '
            }
          ]
        ],
        [
          '<h6>Title</h6>',
          [
            {
              text: 'Title',
              level: 6,
              line: 0,
              raw: '<h6>Title</h6>',
              prefix: '0.0.0.0.0.1. '
            }
          ]
        ],
        ['\nTitle\n\n==', []],
        ['\nTitle\n\n--', []],
        ['```\n# Title\n```', []],
        ['```\nTitle\n--\n```', []],
        ['```\n<h1>Title</h1>\n```', []]
      ])('should extract headings from %s', (src, headers) => {
        const headings = ToCUtils.Markdown.getHeadings(src, {
          maximalDepth: 6
        });
        expect(headings).toHaveLength(headers.length);

        for (let i = 0; i < headers.length; i++) {
          expect(headings[i]).toEqual(headers[i]);
        }
      });
    });

    it.each<[string]>([
      ['### Title <a class="tocSkip"></a>'],
      ['### Title <a title="noisy title" class="jp-toc-ignore"></a>'],
      ['Title <a class="tocSkip"></a>\n=='],
      ['Title <a class="jp-toc-ignore" title="noisy title"></a>\n=='],
      ['Title <a class="tocSkip"></a>\n--'],
      ['Title <a class="jp-toc-ignore"></a>\n--'],
      ['<h4 class="a tocSkip">Title</h4>'],
      ['<h4 class="jp-toc-ignore b">Title</h4>']
    ])('should skip the heading from %s', src => {
      const headings = ToCUtils.Markdown.getHeadings(src);
      expect(headings).toHaveLength(0);
    });

    it('should clean the title', () => {
      const src = '## Title [with](https://jupyter.org "title") link';
      const headings = ToCUtils.Markdown.getHeadings(src);
      expect(headings).toHaveLength(1);
      expect(headings[0]).toEqual({
        level: 2,
        text: 'Title with link',
        line: 0,
        raw: src,
        prefix: '0.1. '
      });
    });

    it.each<[number]>([[1], [2], [3], [4], [5], [6]])(
      'should limit the level to %d',
      maximalDepth => {
        const src = `# h1
## h2
### h3
#### h4
##### h5
###### h6`;

        const headings = ToCUtils.Markdown.getHeadings(src, { maximalDepth });
        expect(headings).toHaveLength(maximalDepth);
        expect(headings[headings.length - 1].level).toEqual(maximalDepth);
      }
    );

    it.each<[boolean]>([[true], [false]])(
      `should should have prefix or not`,
      numberHeaders => {
        const src = '### h3';

        const headings = ToCUtils.Markdown.getHeadings(src, {
          numberHeaders
        });
        expect(headings).toHaveLength(1);
        expect(headings[0].prefix).toEqual(numberHeaders ? '0.0.1. ' : '');
      }
    );

    it.each<[boolean]>([[true], [false]])(
      `should should number h1 or not`,
      numberingH1 => {
        const src = '# h1';

        const headings = ToCUtils.Markdown.getHeadings(src, {
          numberingH1
        });
        expect(headings).toHaveLength(1);
        expect(headings[0].prefix).toEqual(numberingH1 ? '1. ' : '');
      }
    );

    it.each<[boolean]>([[true], [false]])(
      `should should respect base number`,
      numberingH1 => {
        const src = `# h1
## h2`;

        const headings = ToCUtils.Markdown.getHeadings(src, {
          numberingH1,
          baseNumbering: 3
        });
        expect(headings).toHaveLength(2);
        expect(headings[0].prefix).toEqual(numberingH1 ? '3. ' : '');
        expect(headings[1].prefix).toEqual(numberingH1 ? '3.1. ' : '3. ');
      }
    );
  });
});
