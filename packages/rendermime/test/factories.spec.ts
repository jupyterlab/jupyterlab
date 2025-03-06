// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Sanitizer } from '@jupyterlab/apputils';
import {
  errorRendererFactory,
  htmlRendererFactory,
  imageRendererFactory,
  IMarkdownParser,
  IRenderMime,
  latexRendererFactory,
  markdownRendererFactory,
  MimeModel,
  svgRendererFactory,
  textRendererFactory
} from '@jupyterlab/rendermime';
import { JSONObject, JSONValue } from '@lumino/coreutils';
import { Widget } from '@lumino/widgets';

function createModel(
  mimeType: string,
  source: JSONValue,
  trusted = false
): IRenderMime.IMimeModel {
  const data: JSONObject = {};
  data[mimeType] = source;
  return new MimeModel({ data, trusted });
}

function encodeChars(txt: string): string {
  return txt.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const sanitizer = new Sanitizer();
const defaultOptions: any = {
  sanitizer,
  linkHandler: null,
  resolver: null
};

describe('rendermime/factories', () => {
  describe('textRendererFactory', () => {
    describe('#mimeTypes', () => {
      it('should have text related mimeTypes', () => {
        const mimeTypes = ['text/plain', 'application/vnd.jupyter.stdout'];
        expect(textRendererFactory.mimeTypes).toEqual(mimeTypes);
      });
    });

    describe('#safe', () => {
      it('should be safe', () => {
        expect(textRendererFactory.safe).toBe(true);
      });
    });

    describe('#createRenderer()', () => {
      it('should output the correct HTML', async () => {
        const f = textRendererFactory;
        const mimeType = 'text/plain';
        const model = createModel(mimeType, 'x = 2 ** a');
        const w = f.createRenderer({ mimeType, ...defaultOptions });
        await w.renderModel(model);
        expect(w.node.innerHTML).toBe('<pre>x = 2 ** a</pre>');
      });

      it('should be re-renderable', async () => {
        const f = textRendererFactory;
        const mimeType = 'text/plain';
        const model = createModel(mimeType, 'x = 2 ** a');
        const w = f.createRenderer({ mimeType, ...defaultOptions });
        await w.renderModel(model);
        await w.renderModel(model);
        expect(w.node.innerHTML).toBe('<pre>x = 2 ** a</pre>');
      });

      it.each([
        [
          'There is no text but \x1b[01;41;32mtext\x1b[00m.\nWoo.',
          '<pre>There is no text but <span class="ansi-green-intense-fg ansi-red-bg ansi-bold">text</span>.\nWoo.</pre>'
        ],
        [
          '\x1b[48;2;185;0;129mwww.example.\x1b[0m\x1b[48;2;113;0;119mcom\x1b[0m',
          '<pre><a href="https://www.example.com" rel="noopener" target="_blank"><span style="background-color:rgb(185,0,129)">www.example.</span><span style="background-color:rgb(113,0,119)">com</span></a></pre>'
        ],
        [
          'Prefix \x1b[48;2;185;0;129m spacer www.example.\x1b[0m\x1b[48;2;113;0;119mcom\x1b[0m',
          '<pre>Prefix <span style="background-color:rgb(185,0,129)"> spacer </span><a href="https://www.example.com" rel="noopener" target="_blank"><span style="background-color:rgb(185,0,129)">www.example.</span><span style="background-color:rgb(113,0,119)">com</span></a></pre>'
        ],
        [
          'Prefix www.example.\x1b[0m\x1b[48;2;113;0;119mcom postfix\x1b[0m',
          '<pre>Prefix <a href="https://www.example.com" rel="noopener" target="_blank">www.example.<span style="background-color:rgb(113,0,119)">com</span></a><span style="background-color:rgb(113,0,119)"> postfix</span></pre>'
        ]
      ])(
        'should output the correct HTML with ansi colors',
        async (source, expected) => {
          const f = textRendererFactory;
          const mimeType = 'application/vnd.jupyter.console-text';
          const model = createModel(mimeType, source);
          const w = f.createRenderer({ mimeType, ...defaultOptions });
          await w.renderModel(model);
          expect(w.node.innerHTML).toBe(expected);
        }
      );

      it('should escape inline html', async () => {
        const f = textRendererFactory;
        const source =
          'There is no text <script>window.x=1</script> but \x1b[01;41;32mtext\x1b[00m.\nWoo.';
        const mimeType = 'application/vnd.jupyter.console-text';
        const model = createModel(mimeType, source);
        const w = f.createRenderer({ mimeType, ...defaultOptions });
        await w.renderModel(model);
        expect(w.node.innerHTML).toBe(
          '<pre>There is no text &lt;script&gt;window.x=1&lt;/script&gt; but <span class="ansi-green-intense-fg ansi-red-bg ansi-bold">text</span>.\nWoo.</pre>'
        );
      });

      it('should autolink single URL', async () => {
        const f = textRendererFactory;
        const urls = [
          ['https://example.com', '', ''],
          ['https://example.com#', '', ''],
          ['https://example.com/', '', ''],
          ['www.example.com/', '', ''],
          ['http://www.quotes.com/foo/', '"', '"'],
          ['http://www.quotes.com/foo/', "'", "'"],
          ['http://www.brackets.com/foo', '(', ')'],
          ['http://www.brackets.com/foo', '{', '}'],
          ['http://www.brackets.com/foo', '[', ']'],
          ['http://www.brackets.com/foo', '<', '>'],
          ['https://ends.with/&gt', '', ''],
          ['http://www.brackets.com/inv', ')', '('],
          ['http://www.brackets.com/inv', '}', '{'],
          ['http://www.brackets.com/inv', ']', '['],
          ['http://www.brackets.com/inv', '>', '<'],
          ['https://ends.with/&lt', '', ''],
          ['http://www.punctuation.com', '', ','],
          ['http://www.punctuation.com', '', ':'],
          ['http://www.punctuation.com', '', ';'],
          ['http://www.punctuation.com', '', '.'],
          ['http://www.punctuation.com', '', '!'],
          ['http://www.punctuation.com', '', '?'],
          ['https://example.com#anchor', '', ''],
          ['http://localhost:9090/app', '', ''],
          ['http://localhost:9090/app/', '', ''],
          ['http://127.0.0.1/test?query=string', '', ''],
          ['http://127.0.0.1/test?query=string&param=42', '', '']
        ];
        await Promise.all(
          urls.map(async u => {
            const [url, before, after] = u;
            const source = `Text with the URL ${before}${url}${after} inside.`;
            const mimeType = 'text/plain';
            const model = createModel(mimeType, source);
            const w = f.createRenderer({ mimeType, ...defaultOptions });
            const [urlEncoded, beforeEncoded, afterEncoded] = [
              url,
              before,
              after
            ].map(encodeChars);
            const prefixedUrl = urlEncoded.startsWith('www.')
              ? 'https://' + urlEncoded
              : urlEncoded;
            await w.renderModel(model);
            expect(w.node.innerHTML).toBe(
              `<pre>Text with the URL ${beforeEncoded}<a href="${prefixedUrl}" rel="noopener" target="_blank">${urlEncoded}</a>${afterEncoded} inside.</pre>`
            );
          })
        );
      });

      it('should not skip autolink', async () => {
        const source = 'www.example.com';
        const expected =
          '<pre><a href="https://www.example.com" rel="noopener" target="_blank">www.example.com</a></pre>';
        const f = textRendererFactory;
        const mimeType = 'text/plain';
        const model = createModel(mimeType, source);
        sanitizer.setAutolink(true);
        const w = f.createRenderer({ mimeType, ...defaultOptions });
        await w.renderModel(model);
        expect(w.node.innerHTML).toBe(expected);
      });

      it('should skip autolink', async () => {
        const source = 'www.example.com';
        const expected = '<pre>www.example.com</pre>';
        const f = textRendererFactory;
        const mimeType = 'text/plain';
        const model = createModel(mimeType, source);
        sanitizer.setAutolink(false);
        const w = f.createRenderer({ mimeType, ...defaultOptions });
        await w.renderModel(model);
        expect(w.node.innerHTML).toBe(expected);
        sanitizer.setAutolink(true);
      });

      it('should autolink multiple URLs', async () => {
        const source = 'www.example.com\nwww.python.org';
        const expected =
          '<pre><a href="https://www.example.com" rel="noopener" target="_blank">www.example.com</a>\n<a href="https://www.python.org" rel="noopener" target="_blank">www.python.org</a></pre>';
        const f = textRendererFactory;
        const mimeType = 'text/plain';
        const model = createModel(mimeType, source);
        const w = f.createRenderer({ mimeType, ...defaultOptions });
        await w.renderModel(model);
        expect(w.node.innerHTML).toBe(expected);
      });
    });
  });

  describe('latexRendererFactory', () => {
    describe('#mimeTypes', () => {
      it('should have the text/latex mimeType', () => {
        expect(latexRendererFactory.mimeTypes).toEqual(['text/latex']);
      });
    });

    describe('#safe', () => {
      it('should be safe', () => {
        expect(latexRendererFactory.safe).toBe(true);
      });
    });

    describe('#createRenderer()', () => {
      it('should set the textContent of the widget', async () => {
        const source = 'sumlimits_{i=0}^{infty} \frac{1}{n^2}';
        const f = latexRendererFactory;
        const mimeType = 'text/latex';
        const model = createModel(mimeType, source);
        const w = f.createRenderer({ mimeType, ...defaultOptions });
        await w.renderModel(model);
        expect(w.node.textContent).toBe(source);
      });

      it('should be re-renderable', async () => {
        const source = 'sumlimits_{i=0}^{infty} \frac{1}{n^2}';
        const f = latexRendererFactory;
        const mimeType = 'text/latex';
        const model = createModel(mimeType, source);
        const w = f.createRenderer({ mimeType, ...defaultOptions });
        await w.renderModel(model);
        await w.renderModel(model);
        expect(w.node.textContent).toBe(source);
      });
    });
  });

  describe('svgRendererFactory', () => {
    describe('#mimeTypes', () => {
      it('should have the image/svg+xml mimeType', () => {
        expect(svgRendererFactory.mimeTypes).toEqual(['image/svg+xml']);
      });
    });

    describe('#safe', () => {
      it('should not be safe', () => {
        expect(svgRendererFactory.safe).toBe(false);
      });
    });

    describe('#createRenderer()', () => {
      it('should create an img element with the uri encoded svg inline', async () => {
        const source = '<svg></svg>';
        const displaySource = '<svg xmlns="http://www.w3.org/2000/svg"></svg>';
        const f = svgRendererFactory;
        const mimeType = 'image/svg+xml';
        const model = createModel(mimeType, source, true);
        const w = f.createRenderer({ mimeType, ...defaultOptions });
        await w.renderModel(model);
        const imgEl = w.node.getElementsByTagName('img')[0];
        expect(imgEl).toBeTruthy();
        expect(imgEl.src).toContain(encodeURIComponent(displaySource));
      });
    });
  });

  describe('markdownRendererFactory', () => {
    describe('#mimeTypes', () => {
      it('should have the text/markdown mimeType', function () {
        expect(markdownRendererFactory.mimeTypes).toEqual(['text/markdown']);
      });
    });

    describe('#safe', () => {
      it('should be safe', () => {
        expect(markdownRendererFactory.safe).toBe(true);
      });
    });

    describe('#createRenderer()', () => {
      let markdownParser: IMarkdownParser;

      beforeAll(() => {
        markdownParser = {
          render: (content: string): Promise<string> => Promise.resolve(content)
        };
      });

      it('should set the inner html with no parser', async () => {
        const f = markdownRendererFactory;
        const source = '<p>hello</p>';
        const mimeType = 'text/markdown';
        const model = createModel(mimeType, source);
        const w = f.createRenderer({ mimeType, ...defaultOptions });
        await w.renderModel(model);
        expect(w.node.innerHTML).toBe(`<pre>${source}</pre>`);
      });

      it('should set the inner html with md parser', async () => {
        const f = markdownRendererFactory;
        const source = '<p>hello</p>';
        const mimeType = 'text/markdown';
        const model = createModel(mimeType, source);
        const w = f.createRenderer({
          mimeType,
          ...defaultOptions,
          markdownParser
        });
        await w.renderModel(model);
        expect(w.node.innerHTML).toBe(source);
      });

      it('should be re-renderable', async () => {
        const f = markdownRendererFactory;
        const source = '<p>hello</p>';
        const mimeType = 'text/markdown';
        const model = createModel(mimeType, source);
        const w = f.createRenderer({
          mimeType,
          ...defaultOptions,
          markdownParser
        });
        await w.renderModel(model);
        await w.renderModel(model);
        expect(w.node.innerHTML).toBe(`${source}`);
      });

      it('should add header anchors', async () => {
        const f = markdownRendererFactory;
        const mimeType = 'text/markdown';
        const sampleData = '### Title third level';

        const model = createModel(mimeType, sampleData);
        const w = f.createRenderer({
          mimeType,
          ...defaultOptions,
          markdownParser: { render: content => '<h3>Title third level</h3>' }
        });
        await w.renderModel(model);
        Widget.attach(w, document.body);

        const node = document.getElementById('Title-third-level')!;
        expect(node.localName).toBe('h3');
        const anchor = node.firstChild!.nextSibling as HTMLAnchorElement;
        expect(anchor.href).toContain('#Title-third-level');
        expect(anchor.target).toBe('_self');
        expect(anchor.className).toContain('jp-InternalAnchorLink');
        expect(anchor.textContent).toBe('¶');
        Widget.detach(w);
      });

      it('should sanitize the html', async () => {
        const f = markdownRendererFactory;
        const source = '<p>hello</p><script>alert("foo")</script>';
        const mimeType = 'text/markdown';
        const model = createModel(mimeType, source);
        const w = f.createRenderer({ mimeType, ...defaultOptions });
        await w.renderModel(model);
        expect(w.node.innerHTML).toEqual(
          expect.not.arrayContaining(['script'])
        );
      });
    });
  });

  describe('htmlRendererFactory', () => {
    describe('#mimeTypes', () => {
      it('should have the text/html mimeType', () => {
        expect(htmlRendererFactory.mimeTypes).toEqual(['text/html']);
      });
    });

    describe('#safe', () => {
      it('should be safe', () => {
        expect(htmlRendererFactory.safe).toBe(true);
      });
    });

    describe('#createRenderer()', () => {
      it('should set the inner HTML', async () => {
        const f = htmlRendererFactory;
        const source = '<h1>This is great</h1>';
        const mimeType = 'text/html';
        const model = createModel(mimeType, source);
        const w = f.createRenderer({ mimeType, ...defaultOptions });
        await w.renderModel(model);
        expect(w.node.innerHTML).toBe('<h1>This is great</h1>');
      });

      it('should be re-renderable', async () => {
        const f = htmlRendererFactory;
        const source = '<h1>This is great</h1>';
        const mimeType = 'text/html';
        const model = createModel(mimeType, source);
        const w = f.createRenderer({ mimeType, ...defaultOptions });
        await w.renderModel(model);
        await w.renderModel(model);
        expect(w.node.innerHTML).toBe('<h1>This is great</h1>');
      });

      // TODO we are disabling script execution for now.
      it.skip('should execute a script tag when attached', () => {
        const source = '<script>window.y=3;</script>';
        const f = htmlRendererFactory;
        const mimeType = 'text/html';
        const model = createModel(mimeType, source, true);
        const w = f.createRenderer({ mimeType, ...defaultOptions });
        return w.renderModel(model).then(() => {
          expect((window as any).y).toBeUndefined();
          Widget.attach(w, document.body);
          expect((window as any).y).toBe(3);
          w.dispose();
        });
      });

      it('should sanitize when untrusted', async () => {
        const source = '<pre><script>window.y=3;</script></pre>';
        const f = htmlRendererFactory;
        const mimeType = 'text/html';
        const model = createModel(mimeType, source);
        const w = f.createRenderer({ mimeType, ...defaultOptions });
        await w.renderModel(model);
        expect(w.node.innerHTML).toBe('<pre></pre>');
      });
    });

    it('should sanitize html', async () => {
      const model = createModel(
        'text/html',
        '<h1>foo <script>window.x=1></script></h1>'
      );
      const f = htmlRendererFactory;
      const mimeType = 'text/html';
      const w = f.createRenderer({ mimeType, ...defaultOptions });
      await w.renderModel(model);
      expect(w.node.innerHTML).toBe('<h1>foo </h1>');
    });
  });

  describe('imageRendererFactory', () => {
    describe('#mimeTypes', () => {
      it('should support multiple mimeTypes', () => {
        expect(imageRendererFactory.mimeTypes).toEqual([
          'image/bmp',
          'image/png',
          'image/jpeg',
          'image/gif',
          'image/webp'
        ]);
      });
    });

    describe('#safe', () => {
      it('should be safe', () => {
        expect(imageRendererFactory.safe).toBe(true);
      });
    });

    describe('#createRenderer()', () => {
      it('should create an <img> with the right mimeType', async () => {
        let source = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        const f = imageRendererFactory;
        let mimeType = 'image/png';
        let model = createModel(mimeType, source);
        let w = f.createRenderer({ mimeType, ...defaultOptions });

        await w.renderModel(model);
        let el = w.node.firstChild as HTMLImageElement;
        expect(el.src).toBe('data:image/png;base64,' + source);
        expect(el.localName).toBe('img');
        expect(el.innerHTML).toBe('');

        source = 'R0lGODlhAQABAIAAAP///wAAACwAAAAAAQABAAACAkQBADs=';
        mimeType = 'image/gif';
        model = createModel(mimeType, source);
        w = f.createRenderer({ mimeType, ...defaultOptions });
        await w.renderModel(model);
        el = w.node.firstChild as HTMLImageElement;
        expect(el.src).toBe('data:image/gif;base64,' + source);
        expect(el.localName).toBe('img');
        expect(el.innerHTML).toBe('');
      });
    });
  });

  describe('errorRendererFactory', () => {
    describe('#mimeTypes', () => {
      it('should support application/vnd.jupyter.stderr mime types', () => {
        expect(errorRendererFactory.mimeTypes).toEqual([
          'application/vnd.jupyter.stderr'
        ]);
      });
    });

    const knownPaths = [
      '/usr/local/lib/message.py',
      '/tmp/ipykernel_361344/2220647380.py',
      '~/jupyterlab/a_file.py',
      '~/jupyterlab/b_file.py',
      '/home/user/jupyterlab/a_file.py'
    ];
    const options = {
      ...defaultOptions,
      resolver: {
        resolvePath: (url: string) => {
          if (knownPaths.includes(url)) {
            return Promise.resolve({
              path: url,
              scope: 'server'
            });
          }
          return Promise.resolve(null);
        },
        isLocal: (url: string) => {
          return knownPaths.includes(url);
        },
        exists: () => {
          return false;
        }
      },
      linkHandler: {
        handlePath: (...args: any[]) => {
          // no-op
          return null;
        }
      }
    };

    describe('#createRenderer()', () => {
      // Mock creation of DOM nodes to distinguish cached
      /// (cloned) nodes from nodes created from scratch.
      beforeEach(() => {
        const originalCloneNode = Node.prototype.cloneNode;

        Node.prototype.cloneNode = function (...args: any) {
          const clonedNode = originalCloneNode.apply(this, args);

          // Annotate as a node created by cloning.
          clonedNode.wasCloned = true;

          return clonedNode;
        };
      });

      afterEach(() => {
        jest.restoreAllMocks();
      });

      it('should output the correct HTML', async () => {
        const f = errorRendererFactory;
        const mimeType = 'application/vnd.jupyter.stderr';
        const model = createModel(mimeType, 'x = 2 ** a');
        const w = f.createRenderer({ mimeType, ...options });
        await w.renderModel(model);
        expect(w.node.innerHTML).toBe('<pre>x = 2 ** a</pre>');
      });

      it('should be re-renderable', async () => {
        const f = errorRendererFactory;
        const mimeType = 'application/vnd.jupyter.stderr';
        const model = createModel(mimeType, 'x = 2 ** a');
        const w = f.createRenderer({ mimeType, ...options });
        await w.renderModel(model);
        await w.renderModel(model);
        expect(w.node.innerHTML).toBe('<pre>x = 2 ** a</pre>');
      });

      it('should escape inline html', async () => {
        const f = errorRendererFactory;
        const source =
          'There is no text <script>window.x=1</script> but \x1b[01;41;32mtext\x1b[00m.\nWoo.';
        const mimeType = 'application/vnd.jupyter.stderr';
        const model = createModel(mimeType, source);
        const w = f.createRenderer({ mimeType, ...options });
        await w.renderModel(model);
        expect(w.node.innerHTML).toBe(
          '<pre>There is no text &lt;script&gt;window.x=1&lt;/script&gt; but <span class="ansi-green-intense-fg ansi-red-bg ansi-bold">text</span>.\nWoo.</pre>'
        );
      });

      it.each([
        // Note: timeouts are set to 3.5 times more the local performance to allow for slower runs on CI
        //
        // Local benchmarks:
        // - without linkify cache: 12.5s
        // - with cache: 1.1s
        [
          'when new content arrives line by line',
          '\n' + 'X'.repeat(5000),
          1100 * 3.5
        ],
        // Local benchmarks:
        // - without cache: 3.8s
        // - with cache: 0.8s
        [
          'when new content is added to the same line',
          'test.com ' + 'X'.repeat(2500) + ' www.',
          800 * 3.5
        ]
      ])('should be fast %s', async (_, newContent, timeout) => {
        let source = '';
        const mimeType = 'application/vnd.jupyter.stderr';

        const model = createModel(mimeType, source);
        const w = errorRendererFactory.createRenderer({ mimeType, ...options });

        const start = performance.now();
        for (let i = 0; i < 25; i++) {
          source += newContent;
          model.setData({
            data: {
              [mimeType]: source
            }
          });
          await w.renderModel(model);
        }
        const end = performance.now();

        expect(end - start).toBeLessThan(timeout);
      });

      it('should use a fast path when no ANSI codes are present', async () => {
        const mimeType = 'application/vnd.jupyter.stderr';

        const ansiEscape = '\x1b[01;41;32mtext\x1b[00m';
        const notAnsiEscape = '\x1a[01;41;32mtext\x1a[00m';

        // We cannot just compare times here because:
        // a) tests are run in jsdom thus "native" sanitizer is not much faster
        // b) `Private.ansiSpan` has much higher cost when ANSI escapes are present

        const testSource = '<script>window.x = 1</script>';
        const spy = jest.spyOn(sanitizer, 'sanitize');

        // Initialize slow path scenario
        let model = createModel(mimeType, testSource + ansiEscape);
        let w = errorRendererFactory.createRenderer({ mimeType, ...options });
        expect(spy).toHaveBeenCalledTimes(0);

        // Test slow path
        await w.renderModel(model);
        // Sanitizer.sanitize should have been called
        expect(spy).toHaveBeenCalledTimes(1);

        const escapedSlow = w.node.querySelector('pre')!.innerHTML;

        // Initialize fast path scenario.
        model = createModel(mimeType, testSource + notAnsiEscape);
        w = errorRendererFactory.createRenderer({ mimeType, ...options });

        // Test fast path
        await w.renderModel(model);
        // Sanitizer.sanitize should not have been called
        expect(spy).toHaveBeenCalledTimes(1);

        const escapedFast = w.node.querySelector('pre')!.innerHTML;

        // Disregarding the suffix the escaped code should be the same.
        expect(escapedFast.slice(0, testSource.length)).toEqual(
          escapedSlow.slice(0, testSource.length)
        );
      });

      it.each([
        ['arrives in a new line', 'www.example.com', '\n a new line of text'],
        ['arrives after a new line', 'www.example.com\n', 'a new line of text'],
        ['arrives after a text node', 'www.example.com next line', ' of text'],
        ['arrives after a text node', 'www.example.com\nnext line', ' of text']
      ])(
        'should use cached links if new content %s',
        async (_, oldSource, addition) => {
          const mimeType = 'application/vnd.jupyter.stderr';
          let source = oldSource;
          const model = createModel(mimeType, source);
          const w = errorRendererFactory.createRenderer({
            mimeType,
            ...defaultOptions
          });
          // Perform an initial render to populate the cache.
          await w.renderModel(model);
          const before = w.node.innerHTML;
          const cachedLink = w.node.querySelector('a');
          expect(cachedLink).toBe(w.node.childNodes[0].childNodes[0]);

          // Update the source.
          source += addition;
          model.setData({
            data: {
              [mimeType]: source
            }
          });

          // Perform a second render which should use the cache.
          await w.renderModel(model);
          const after = w.node.innerHTML;
          const linkAfter = w.node.querySelector('a');

          // The contents of the node should be updated with the new line.
          expect(before).not.toEqual(after);
          expect(after).toContain('line of text');

          expect(cachedLink).not.toBe(null);
          expect(cachedLink).not.toHaveProperty('wasCloned');

          // If cached links were reused those would be cloned
          expect(linkAfter).not.toBe(null);
          expect(linkAfter).toEqual(cachedLink);
          expect(linkAfter).toHaveProperty('wasCloned', true);
        }
      );

      it('should not use cached links if the new content appends to the link', async () => {
        const mimeType = 'application/vnd.jupyter.stderr';
        let source = 'www.example.co';
        const model = createModel(mimeType, source);
        const w = errorRendererFactory.createRenderer({
          mimeType,
          ...defaultOptions
        });
        // Perform an initial render to populate the cache.
        await w.renderModel(model);
        const before = w.node.innerHTML;
        const cachedLink = w.node.querySelector('a');

        // Update the source.
        source += 'm';
        model.setData({
          data: {
            [mimeType]: source
          }
        });

        // Perform a second render.
        await w.renderModel(model);
        const after = w.node.innerHTML;
        const linkAfter = w.node.querySelector('a');

        // The contents of the node should be updated with the new line.
        expect(before).not.toEqual(after);

        expect(cachedLink).not.toBe(null);
        expect(cachedLink!.textContent).toEqual('www.example.co');
        expect(cachedLink).not.toHaveProperty('wasCloned');

        // If cached links were reused those would be cloned
        expect(linkAfter).not.toBe(null);
        expect(linkAfter!.textContent).toEqual('www.example.com');
        expect(linkAfter).not.toHaveProperty('wasCloned');
      });

      it('should use partial cache if a link is created by addition of a new fragment', async () => {
        const mimeType = 'application/vnd.jupyter.stderr';
        let source = 'aaa www.one.com bbb www.';
        const model = createModel(mimeType, source);
        const w = errorRendererFactory.createRenderer({
          mimeType,
          ...defaultOptions
        });
        // Perform an initial render to populate the cache.
        await w.renderModel(model);
        const cachedTextNode = w.node.childNodes[0].childNodes[0];
        const linksBefore = w.node.querySelectorAll('a');
        expect(linksBefore).toHaveLength(1);

        // Update the source.
        source += 'two.com';
        model.setData({
          data: {
            [mimeType]: source
          }
        });

        // Perform a second render.
        await w.renderModel(model);
        const textNodeAfter = w.node.childNodes[0].childNodes[0];
        const linksAfter = w.node.querySelectorAll('a');

        // It should not use the second text node (`bbb www.`) from cache and instead
        // it should fragment properly linkify the second link
        expect(linksAfter).toHaveLength(2);

        expect(cachedTextNode).toBeInstanceOf(Text);
        expect(cachedTextNode).not.toHaveProperty('wasCloned');

        // If cached nodes were reused those would be cloned
        expect(textNodeAfter).toEqual(cachedTextNode);
        expect(textNodeAfter).toHaveProperty('wasCloned', true);
      });

      it('should autolink a single known file path', async () => {
        const f = errorRendererFactory;
        const urls = [
          ['/usr/local/lib/message.py', '', ''],
          ['/usr/local/lib/message.py', '"', '"'],
          ['/tmp/ipykernel_361344/2220647380.py', '', '']
        ];
        await Promise.all(
          urls.map(async u => {
            const [url, before, after] = u;
            const source = `Text with the URL ${before}${url}${after} inside.`;
            const mimeType = 'application/vnd.jupyter.stderr';
            const model = createModel(mimeType, source);
            const w = f.createRenderer({ mimeType, ...options });
            const [urlEncoded, beforeEncoded, afterEncoded] = [
              url,
              before,
              after
            ].map(encodeChars);
            const prefixedUrl = urlEncoded.startsWith('www.')
              ? 'https://' + urlEncoded
              : urlEncoded;
            await w.renderModel(model);
            expect(w.node.innerHTML).toBe(
              `<pre>Text with the URL ${beforeEncoded}<a href="${prefixedUrl}">${urlEncoded}</a>${afterEncoded} inside.</pre>`
            );
          })
        );
      });

      it('should autolink multiple links', async () => {
        const f = errorRendererFactory;
        const source =
          'prefix ~/jupyterlab/a_file.py:1 suffix\nprefix ~/jupyterlab/b_file.py:1 suffix';
        const mimeType = 'application/vnd.jupyter.stderr';
        const model = createModel(mimeType, source);
        const w = f.createRenderer({ mimeType, ...options });
        await w.renderModel(model);
        expect(w.node.innerHTML).toBe(
          '<pre>prefix <a href="~/jupyterlab/a_file.py#line=0">~/jupyterlab/a_file.py:1</a> suffix\nprefix <a href="~/jupyterlab/b_file.py#line=0">~/jupyterlab/b_file.py:1</a> suffix</pre>'
        );
      });

      it('should autolink to a specific line (Python style)', async () => {
        const f = errorRendererFactory;
        const source =
          'File "/home/user/jupyterlab/a_file.py", line 1, in <module>';
        const mimeType = 'application/vnd.jupyter.stderr';
        const model = createModel(mimeType, source);
        const w = f.createRenderer({ mimeType, ...options });
        await w.renderModel(model);
        expect(w.node.innerHTML).toBe(
          '<pre>File "<a href="/home/user/jupyterlab/a_file.py#line=0">/home/user/jupyterlab/a_file.py", line 1</a>, in &lt;module&gt;</pre>'
        );
      });

      it('should autolink to a specific line (IPython style)', async () => {
        const f = errorRendererFactory;
        const source = 'File ~/jupyterlab/a_file.py:1';
        const mimeType = 'application/vnd.jupyter.stderr';
        const model = createModel(mimeType, source);
        const w = f.createRenderer({ mimeType, ...options });
        await w.renderModel(model);
        expect(w.node.innerHTML).toBe(
          '<pre>File <a href="~/jupyterlab/a_file.py#line=0">~/jupyterlab/a_file.py:1</a></pre>'
        );
      });

      it('should autolink URLs', async () => {
        const source = 'www.example.com';
        const expected =
          '<pre><a href="https://www.example.com" rel="noopener" target="_blank">www.example.com</a></pre>';
        const f = errorRendererFactory;
        const mimeType = 'application/vnd.jupyter.stderr';
        const model = createModel(mimeType, source);
        const w = f.createRenderer({ mimeType, ...defaultOptions });
        await w.renderModel(model);
        expect(w.node.innerHTML).toBe(expected);
      });

      it('should autolink mixed content with URLs and files', async () => {
        const f = errorRendererFactory;
        const source = 'URL www.example.com File ~/jupyterlab/a_file.py:1';
        const mimeType = 'application/vnd.jupyter.stderr';
        const model = createModel(mimeType, source);
        const w = f.createRenderer({ mimeType, ...options });
        await w.renderModel(model);
        expect(w.node.innerHTML).toBe(
          '<pre>URL <a href="https://www.example.com" rel="noopener" target="_blank">www.example.com</a> File <a href="~/jupyterlab/a_file.py#line=0">~/jupyterlab/a_file.py:1</a></pre>'
        );
      });
    });
  });
});
