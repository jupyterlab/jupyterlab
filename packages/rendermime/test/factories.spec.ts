// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import 'jest';

const sampleData = require('../../../examples/filebrowser/sample.md');

import { JSONObject, JSONValue } from '@lumino/coreutils';

import { Widget } from '@lumino/widgets';

import { defaultSanitizer } from '@jupyterlab/apputils';

import {
  latexRendererFactory,
  svgRendererFactory,
  markdownRendererFactory,
  textRendererFactory,
  htmlRendererFactory,
  imageRendererFactory
} from '../src';

import { MimeModel, IRenderMime } from '../src';

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
  return txt
    .replace('&', '&amp;')
    .replace('<', '&lt;')
    .replace('>', '&gt;');
}

const sanitizer = defaultSanitizer;
const defaultOptions: any = {
  sanitizer,
  linkHandler: null,
  resolver: null
};

describe('rendermime/factories', () => {
  describe('textRendererFactory', () => {
    describe('#mimeTypes', () => {
      it('should have text related mimeTypes', () => {
        const mimeTypes = [
          'text/plain',
          'application/vnd.jupyter.stdout',
          'application/vnd.jupyter.stderr'
        ];
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

      it('should output the correct HTML with ansi colors', async () => {
        const f = textRendererFactory;
        const source = 'There is no text but \x1b[01;41;32mtext\x1b[00m.\nWoo.';
        const mimeType = 'application/vnd.jupyter.console-text';
        const model = createModel(mimeType, source);
        const w = f.createRenderer({ mimeType, ...defaultOptions });
        await w.renderModel(model);
        expect(w.node.innerHTML).toBe(
          '<pre>There is no text but <span class="ansi-green-intense-fg ansi-red-bg ansi-bold">text</span>.\nWoo.</pre>'
        );
      });

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

      it('should autolink URLs', async () => {
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
            await w.renderModel(model);
            expect(w.node.innerHTML).toBe(
              `<pre>Text with the URL ${beforeEncoded}<a href="${urlEncoded}" rel="noopener" target="_blank">${urlEncoded}</a>${afterEncoded} inside.</pre>`
            );
          })
        );
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
      it('should have the text/markdown mimeType', function() {
        expect(markdownRendererFactory.mimeTypes).toEqual(['text/markdown']);
      });
    });

    describe('#safe', () => {
      it('should be safe', () => {
        expect(markdownRendererFactory.safe).toBe(true);
      });
    });

    describe('#createRenderer()', () => {
      it('should set the inner html', async () => {
        const f = markdownRendererFactory;
        const source = '<p>hello</p>';
        const mimeType = 'text/markdown';
        const model = createModel(mimeType, source);
        const w = f.createRenderer({ mimeType, ...defaultOptions });
        await w.renderModel(model);
        expect(w.node.innerHTML).toBe(source);
      });

      it('it should be re-renderable', async () => {
        const f = markdownRendererFactory;
        const source = '<p>hello</p>';
        const mimeType = 'text/markdown';
        const model = createModel(mimeType, source);
        const w = f.createRenderer({ mimeType, ...defaultOptions });
        await w.renderModel(model);
        await w.renderModel(model);
        expect(w.node.innerHTML).toBe(source);
      });

      it('should add header anchors', async () => {
        const f = markdownRendererFactory;
        const mimeType = 'text/markdown';
        const model = createModel(mimeType, sampleData);
        const w = f.createRenderer({ mimeType, ...defaultOptions });
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
        '<h1>foo <script>window.x=1></scrip></h1>'
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
          'image/gif'
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
});
