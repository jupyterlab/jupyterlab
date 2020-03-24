// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

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
} from '@jupyterlab/rendermime';

import { MimeModel, IRenderMime } from '@jupyterlab/rendermime';

function createModel(
  mimeType: string,
  source: JSONValue,
  trusted = false
): IRenderMime.IMimeModel {
  const data: JSONObject = {};
  data[mimeType] = source;
  return new MimeModel({ data, trusted });
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
        expect(textRendererFactory.mimeTypes).to.deep.equal(mimeTypes);
      });
    });

    describe('#safe', () => {
      it('should be safe', () => {
        expect(textRendererFactory.safe).to.equal(true);
      });
    });

    describe('#createRenderer()', () => {
      it('should output the correct HTML', async () => {
        const f = textRendererFactory;
        const mimeType = 'text/plain';
        const model = createModel(mimeType, 'x = 2 ** a');
        const w = f.createRenderer({ mimeType, ...defaultOptions });
        await w.renderModel(model);
        expect(w.node.innerHTML).to.equal('<pre>x = 2 ** a</pre>');
      });

      it('should be re-renderable', async () => {
        const f = textRendererFactory;
        const mimeType = 'text/plain';
        const model = createModel(mimeType, 'x = 2 ** a');
        const w = f.createRenderer({ mimeType, ...defaultOptions });
        await w.renderModel(model);
        await w.renderModel(model);
        expect(w.node.innerHTML).to.equal('<pre>x = 2 ** a</pre>');
      });

      it('should output the correct HTML with ansi colors', async () => {
        const f = textRendererFactory;
        const source = 'There is no text but \x1b[01;41;32mtext\x1b[00m.\nWoo.';
        const mimeType = 'application/vnd.jupyter.console-text';
        const model = createModel(mimeType, source);
        const w = f.createRenderer({ mimeType, ...defaultOptions });
        await w.renderModel(model);
        expect(w.node.innerHTML).to.equal(
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
        expect(w.node.innerHTML).to.equal(
          '<pre>There is no text &lt;script&gt;window.x=1&lt;/script&gt; but <span class="ansi-green-intense-fg ansi-red-bg ansi-bold">text</span>.\nWoo.</pre>'
        );
      });

      it('should autolink URLs', async () => {
        const f = textRendererFactory;
        const urls = [
          'https://example.com#anchor',
          'http://localhost:9090/app',
          'http://127.0.0.1/test?query=string'
        ];
        await Promise.all(
          urls.map(async url => {
            const source = `Here is some text with an URL such as ${url} inside.`;
            const mimeType = 'text/plain';
            const model = createModel(mimeType, source);
            const w = f.createRenderer({ mimeType, ...defaultOptions });
            await w.renderModel(model);
            expect(w.node.innerHTML).to.equal(
              `<pre>Here is some text with an URL such as <a href="${url}" rel="noopener" target="_blank">${url}</a> inside.</pre>`
            );
          })
        );
      });
    });
  });

  describe('latexRendererFactory', () => {
    describe('#mimeTypes', () => {
      it('should have the text/latex mimeType', () => {
        expect(latexRendererFactory.mimeTypes).to.deep.equal(['text/latex']);
      });
    });

    describe('#safe', () => {
      it('should be safe', () => {
        expect(latexRendererFactory.safe).to.equal(true);
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
        expect(w.node.textContent).to.equal(source);
      });

      it('should be re-renderable', async () => {
        const source = 'sumlimits_{i=0}^{infty} \frac{1}{n^2}';
        const f = latexRendererFactory;
        const mimeType = 'text/latex';
        const model = createModel(mimeType, source);
        const w = f.createRenderer({ mimeType, ...defaultOptions });
        await w.renderModel(model);
        await w.renderModel(model);
        expect(w.node.textContent).to.equal(source);
      });
    });
  });

  describe('svgRendererFactory', () => {
    describe('#mimeTypes', () => {
      it('should have the image/svg+xml mimeType', () => {
        expect(svgRendererFactory.mimeTypes).to.deep.equal(['image/svg+xml']);
      });
    });

    describe('#safe', () => {
      it('should not be safe', () => {
        expect(svgRendererFactory.safe).to.equal(false);
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
        expect(imgEl).to.be.ok;
        expect(imgEl.src).to.contain(encodeURIComponent(displaySource));
      });
    });
  });

  describe('markdownRendererFactory', () => {
    describe('#mimeTypes', () => {
      it('should have the text/markdown mimeType', function() {
        expect(markdownRendererFactory.mimeTypes).to.deep.equal([
          'text/markdown'
        ]);
      });
    });

    describe('#safe', () => {
      it('should be safe', () => {
        expect(markdownRendererFactory.safe).to.equal(true);
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
        expect(w.node.innerHTML).to.equal(source);
      });

      it('it should be re-renderable', async () => {
        const f = markdownRendererFactory;
        const source = '<p>hello</p>';
        const mimeType = 'text/markdown';
        const model = createModel(mimeType, source);
        const w = f.createRenderer({ mimeType, ...defaultOptions });
        await w.renderModel(model);
        await w.renderModel(model);
        expect(w.node.innerHTML).to.equal(source);
      });

      it('should add header anchors', async () => {
        const source = require('../../../examples/filebrowser/sample.md')
          .default as string;
        const f = markdownRendererFactory;
        const mimeType = 'text/markdown';
        const model = createModel(mimeType, source);
        const w = f.createRenderer({ mimeType, ...defaultOptions });
        await w.renderModel(model);
        Widget.attach(w, document.body);
        const node = document.getElementById('Title-third-level')!;
        expect(node.localName).to.equal('h3');
        const anchor = node.firstChild!.nextSibling as HTMLAnchorElement;
        expect(anchor.href).to.contain('#Title-third-level');
        expect(anchor.target).to.equal('_self');
        expect(anchor.className).to.contain('jp-InternalAnchorLink');
        expect(anchor.textContent).to.equal('¶');
        Widget.detach(w);
      });

      it('should sanitize the html', async () => {
        const f = markdownRendererFactory;
        const source = '<p>hello</p><script>alert("foo")</script>';
        const mimeType = 'text/markdown';
        const model = createModel(mimeType, source);
        const w = f.createRenderer({ mimeType, ...defaultOptions });
        await w.renderModel(model);
        expect(w.node.innerHTML).to.not.contain('script');
      });
    });
  });

  describe('htmlRendererFactory', () => {
    describe('#mimeTypes', () => {
      it('should have the text/html mimeType', () => {
        expect(htmlRendererFactory.mimeTypes).to.deep.equal(['text/html']);
      });
    });

    describe('#safe', () => {
      it('should be safe', () => {
        expect(htmlRendererFactory.safe).to.equal(true);
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
        expect(w.node.innerHTML).to.equal('<h1>This is great</h1>');
      });

      it('should be re-renderable', async () => {
        const f = htmlRendererFactory;
        const source = '<h1>This is great</h1>';
        const mimeType = 'text/html';
        const model = createModel(mimeType, source);
        const w = f.createRenderer({ mimeType, ...defaultOptions });
        await w.renderModel(model);
        await w.renderModel(model);
        expect(w.node.innerHTML).to.equal('<h1>This is great</h1>');
      });

      // TODO we are disabling script execution for now.
      it.skip('should execute a script tag when attached', () => {
        const source = '<script>window.y=3;</script>';
        const f = htmlRendererFactory;
        const mimeType = 'text/html';
        const model = createModel(mimeType, source, true);
        const w = f.createRenderer({ mimeType, ...defaultOptions });
        return w.renderModel(model).then(() => {
          expect((window as any).y).to.be.undefined;
          Widget.attach(w, document.body);
          expect((window as any).y).to.equal(3);
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
        expect(w.node.innerHTML).to.equal('<pre></pre>');
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
      expect(w.node.innerHTML).to.equal('<h1>foo </h1>');
    });
  });

  describe('imageRendererFactory', () => {
    describe('#mimeTypes', () => {
      it('should support multiple mimeTypes', () => {
        expect(imageRendererFactory.mimeTypes).to.deep.equal([
          'image/bmp',
          'image/png',
          'image/jpeg',
          'image/gif'
        ]);
      });
    });

    describe('#safe', () => {
      it('should be safe', () => {
        expect(imageRendererFactory.safe).to.equal(true);
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
        expect(el.src).to.equal('data:image/png;base64,' + source);
        expect(el.localName).to.equal('img');
        expect(el.innerHTML).to.equal('');

        source = 'R0lGODlhAQABAIAAAP///wAAACwAAAAAAQABAAACAkQBADs=';
        mimeType = 'image/gif';
        model = createModel(mimeType, source);
        w = f.createRenderer({ mimeType, ...defaultOptions });
        await w.renderModel(model);
        el = w.node.firstChild as HTMLImageElement;
        expect(el.src).to.equal('data:image/gif;base64,' + source);
        expect(el.localName).to.equal('img');
        expect(el.innerHTML).to.equal('');
      });
    });
  });
});
