// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { TableOfContentsUtils } from '@jupyterlab/toc';
import { Sanitizer } from '@jupyterlab/apputils';
import { createMarkdownParser } from '@jupyterlab/markedparser-extension';
import type { IMarkdownParser } from '@jupyterlab/rendermime';
import type { IEditorLanguageRegistry } from '@jupyterlab/codemirror';
import { EditorLanguageRegistry } from '@jupyterlab/codemirror';

describe('TableOfContentsUtils', () => {
  describe('Markdown', () => {
    describe('#getHeadingId', () => {
      const languages: IEditorLanguageRegistry = new EditorLanguageRegistry();
      const parser: IMarkdownParser = createMarkdownParser(languages);
      const sanitizer = new Sanitizer();
      it.each<[string, string]>([
        ['# Title', 'Title'],
        [`# test'"></title><img>test {#'"><img>}`, `test'\">test-{#'\">}`]
      ])('should derive ID from markdown', async (markdown, expectedId) => {
        const headingId = await TableOfContentsUtils.Markdown.getHeadingId(
          parser,
          markdown,
          1,
          sanitizer
        );
        expect(headingId).toEqual(expectedId);
      });
    });
    describe('#getHeadings', () => {
      const languages: IEditorLanguageRegistry = new EditorLanguageRegistry();
      const parser: IMarkdownParser = createMarkdownParser(languages);
      it.each<[string, TableOfContentsUtils.Markdown.IMarkdownHeading[]]>([
        [
          '# Title',
          [
            {
              text: 'Title',
              level: 1,
              line: 0,
              raw: '# Title',
              prefix: '1. ',
              skip: false
            }
          ]
        ],
        [
          '## Title',
          [
            {
              text: 'Title',
              level: 2,
              line: 0,
              raw: '## Title',
              prefix: '0.1. ',
              skip: false
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
              prefix: '0.0.1. ',
              skip: false
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
              prefix: '0.0.0.1. ',
              skip: false
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
              prefix: '0.0.0.0.1. ',
              skip: false
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
              prefix: '0.0.0.0.0.1. ',
              skip: false
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
              prefix: '1. ',
              skip: false
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
              prefix: '0.1. ',
              skip: false
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
              line: 0,
              raw: '<h2>Title</h2>',
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
              line: 0,
              raw: '<h3>Title</h3>',
              prefix: '0.0.1. ',
              skip: false
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
              line: 0,
              raw: '<h5>Title</h5>',
              prefix: '0.0.0.0.1. ',
              skip: false
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
              prefix: '0.0.0.0.0.1. ',
              skip: false
            }
          ]
        ],
        [
          '<span><h1>Nested Title</h1></span>',
          [
            {
              text: 'Nested Title',
              level: 1,
              line: 0,
              raw: '<span><h1>Nested Title</h1></span>',
              prefix: '1. ',
              skip: false
            }
          ]
        ],
        ['\nTitle\n\n==', []],
        ['\nTitle\n\n--', []],
        ['```\n# Title\n```', []],
        ['```\nTitle\n--\n```', []],
        ['```\n<h1>Title</h1>\n```', []],
        ['~~~\n# Title\n~~~', []],
        ['~~~\nTitle\n--\n~~~', []],
        ['~~~\n<h1>Title</h1>\n~~~', []],
        ['\n---', []],
        [
          '---\n<h1>Title</h1>\n---',
          [
            {
              level: 1,
              line: 1,
              prefix: '1. ',
              raw: '<h1>Title</h1>\n---',
              skip: false,
              text: 'Title'
            }
          ]
        ],
        [
          '---\n# Title\n---',
          [
            {
              level: 1,
              line: 1,
              prefix: '1. ',
              raw: '# Title',
              skip: false,
              text: 'Title'
            }
          ]
        ],
        [
          `---
<h1>Ignored</h1>
---
# Title`,
          [
            {
              text: 'Ignored',
              level: 1,
              line: 1,
              raw: '<h1>Ignored</h1>\n---\n# Title',
              prefix: '1. ',
              skip: false
            }
          ]
        ],
        [
          `---
front: matter
---

# Header

> this has whitespace _after_`,
          [
            {
              level: 2,
              line: 1,
              prefix: '0.1. ',
              raw: 'front: matter\n---',
              skip: false,
              text: 'front: matter'
            },
            {
              text: 'Header',
              level: 1,
              line: 4,
              raw: '# Header',
              prefix: '1. ',
              skip: false
            }
          ]
        ],
        [
          `---
front: matter
---
# Header

---
# Header between horizontal rules
---

# Header after horizontal rules`,
          [
            {
              level: 2,
              line: 1,
              prefix: '0.1. ',
              raw: 'front: matter\n---',
              skip: false,
              text: 'front: matter'
            },
            {
              text: 'Header',
              level: 1,
              line: 3,
              raw: '# Header',
              prefix: '1. ',
              skip: false
            },
            {
              text: 'Header between horizontal rules',
              level: 1,
              line: 6,
              raw: '# Header between horizontal rules',
              prefix: '2. ',
              skip: false
            },
            {
              text: 'Header after horizontal rules',
              level: 1,
              line: 9,
              raw: '# Header after horizontal rules',
              prefix: '3. ',
              skip: false
            }
          ]
        ],
        [
          `---
# Header`,
          [
            {
              text: 'Header',
              level: 1,
              line: 1,
              raw: '# Header',
              prefix: '1. ',
              skip: false
            }
          ]
        ],
        [
          "## <span style='background :darkviolet' ><span style='color:White'> Initialization",
          [
            {
              text: 'Initialization',
              level: 2,
              line: 0,
              raw: "## <span style='background :darkviolet' ><span style='color:White'> Initialization",
              prefix: '0.1. ',
              skip: false
            }
          ]
        ],
        [
          '# <div>Title</div> 1',
          [
            {
              text: 'Title 1',
              level: 1,
              line: 0,
              raw: '# <div>Title</div> 1',
              prefix: '1. ',
              skip: false
            }
          ]
        ],
        [
          '<h1>Title</h1>\n--',
          [
            {
              text: 'Title',
              level: 1,
              line: 0,
              raw: '<h1>Title</h1>\n--',
              prefix: '1. ',
              skip: false
            }
          ]
        ]
      ])('should extract headings from %s', async (src, headers) => {
        const headings = TableOfContentsUtils.filterHeadings(
          await TableOfContentsUtils.Markdown.parseHeadings(src, parser),
          {
            maximalDepth: 6,
            numberHeaders: true
          }
        );
        expect(headings).toHaveLength(headers.length);

        for (let i = 0; i < headers.length; i++) {
          console.log(headings.length);
          console.log(headers.length);
          expect(headings[i]).toEqual(headers[i]);
        }
      });
    });

    it.each<[string, TableOfContentsUtils.Markdown.IMarkdownHeading[]]>([
      [
        '# Title',
        [
          {
            text: 'Title',
            level: 1,
            line: 0,
            raw: '# Title',
            prefix: '1. ',
            skip: false
          }
        ]
      ],
      ['````\n```# Title\n```\n````', []],
      ['````\n~~~~# Title\n~~~\n````', []],
      ['~~~~\n```# Title\n```\n~~~~~', []],
      ['<!--Foo-->', []],
      ['<!--\nMarkdown comments\n-->', []],
      ['<!--\nNested comments\n```\nBackticks\n``-->', []],
      [
        '````\n```# Title-1\n```\n````\n# Title-2\n````\n`````',
        [
          {
            text: 'Title-2',
            level: 1,
            line: 4,
            raw: '# Title-2',
            prefix: '1. ',
            skip: false
          }
        ]
      ]
    ])(
      'should verify comments in nested codeblocks in %s',
      async (src, headers) => {
        const languages: IEditorLanguageRegistry = new EditorLanguageRegistry();
        const parser: IMarkdownParser = createMarkdownParser(languages);
        const headings = TableOfContentsUtils.filterHeadings(
          await TableOfContentsUtils.Markdown.parseHeadings(src, parser),
          {
            maximalDepth: 6,
            numberHeaders: true
          }
        );
        expect(headings).toHaveLength(headers.length);
        for (let i = 0; i < headers.length; i++) {
          expect(headings[i]).toEqual(headers[i]);
        }
      }
    );

    it.each<[string]>([
      ['### Title <a class="tocSkip"></a>'],
      ['### Title <a title="noisy title" class="jp-toc-ignore"></a>'],
      ['Title <a class="tocSkip"></a>\n=='],
      ['Title <a class="jp-toc-ignore" title="noisy title"></a>\n=='],
      ['Title <a class="tocSkip"></a>\n--'],
      ['Title <a class="jp-toc-ignore"></a>\n--'],
      ['<h4 class="a tocSkip">Title</h4>'],
      ['<h4 class="jp-toc-ignore b">Title</h4>']
    ])('should skip the heading from %s', async src => {
      const languages: IEditorLanguageRegistry = new EditorLanguageRegistry();
      const parser: IMarkdownParser = createMarkdownParser(languages);
      const headings = await TableOfContentsUtils.Markdown.parseHeadings(
        src,
        parser
      );
      expect(headings).toHaveLength(1);
      expect(headings[0].skip).toEqual(true);
    });

    it.each<[string, TableOfContentsUtils.Markdown.IMarkdownHeading[]]>([
      [
        '## Title [with](https://jupyter.org "title") link',
        [
          {
            level: 2,
            text: 'Title with link',
            line: 0,
            raw: '## Title [with](https://jupyter.org "title") link',
            skip: false
          }
        ]
      ],
      [
        '<h1>Title <a href="https://jupyter.org" title="title">with</a> link</h1>',
        [
          {
            level: 1,
            text: 'Title with link',
            line: 0,
            raw: '<h1>Title <a href="https://jupyter.org" title="title">with</a> link</h1>',
            skip: false
          }
        ]
      ]
    ])('should clean the title', async (src, headers) => {
      const languages: IEditorLanguageRegistry = new EditorLanguageRegistry();
      const parser: IMarkdownParser = createMarkdownParser(languages);
      const headings = await TableOfContentsUtils.Markdown.parseHeadings(
        src,
        parser
      );

      expect(headings).toHaveLength(headers.length);
      for (let i = 0; i < headers.length; i++) {
        expect(headings[i]).toEqual(headers[i]);
      }
    });

    it.each<[number]>([[1], [2], [3], [4], [5], [6]])(
      'should limit the level to %d',
      async maximalDepth => {
        const src = `# h1
## h2
### h3
#### h4
##### h5
###### h6`;
        const languages: IEditorLanguageRegistry = new EditorLanguageRegistry();
        const parser: IMarkdownParser = createMarkdownParser(languages);
        const headings = TableOfContentsUtils.filterHeadings(
          await TableOfContentsUtils.Markdown.parseHeadings(src, parser),
          { maximalDepth }
        );
        expect(headings).toHaveLength(maximalDepth);
        expect(headings[headings.length - 1].level).toEqual(maximalDepth);
      }
    );

    it.each<[boolean]>([[true], [false]])(
      `should have prefix or not`,
      async numberHeaders => {
        const languages: IEditorLanguageRegistry = new EditorLanguageRegistry();
        const parser: IMarkdownParser = createMarkdownParser(languages);
        const src = '### h3';

        const headings = TableOfContentsUtils.filterHeadings(
          await TableOfContentsUtils.Markdown.parseHeadings(src, parser),
          { numberHeaders }
        );
        expect(headings).toHaveLength(1);
        expect(headings[0].prefix).toEqual(numberHeaders ? '0.0.1. ' : '');
      }
    );

    it.each<[boolean]>([[true], [false]])(
      `should number h1 or not`,
      async numberingH1 => {
        const languages: IEditorLanguageRegistry = new EditorLanguageRegistry();
        const parser: IMarkdownParser = createMarkdownParser(languages);
        const src = '# h1';

        const headings = TableOfContentsUtils.filterHeadings(
          await TableOfContentsUtils.Markdown.parseHeadings(src, parser),
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
      async numberingH1 => {
        const languages: IEditorLanguageRegistry = new EditorLanguageRegistry();
        const parser: IMarkdownParser = createMarkdownParser(languages);
        const src = `# h1
## h2`;

        const headings = TableOfContentsUtils.filterHeadings(
          await TableOfContentsUtils.Markdown.parseHeadings(src, parser),
          {
            numberingH1,
            numberHeaders: true,
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
