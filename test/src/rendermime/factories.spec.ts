// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  JSONObject, JSONValue
} from '@phosphor/coreutils';

import {
  Widget
} from '@phosphor/widgets';

import {
  defaultSanitizer
} from '@jupyterlab/apputils';

import {
  LatexRendererFactory, PDFRendererFactory, JavaScriptRendererFactory,
  SVGRendererFactory, MarkdownRendererFactory, TextRendererFactory, HTMLRendererFactory, ImageRendererFactory
} from '@jupyterlab/rendermime';

import {
  MimeModel, IRenderMime
} from '@jupyterlab/rendermime';


function runCanCreateRenderer(renderer: IRenderMime.IRendererFactory, trusted: boolean): boolean {
  let canCreateRenderer = true;

  for (let mimeType of renderer.mimeTypes) {
    let options = { mimeType, sanitizer, trusted };
    if (!renderer.canCreateRenderer(options)) {
      canCreateRenderer = false;
    }
  }
  let options = { trusted, mimeType: 'fizz/buzz', sanitizer };
  expect(renderer.canCreateRenderer(options)).to.be(false);
  return canCreateRenderer;
}


function createModel(mimeType: string, source: JSONValue): IRenderMime.IMimeModel {
  let data: JSONObject = {};
  data[mimeType] = source;
  return new MimeModel({ data });
}

const sanitizer = defaultSanitizer;


describe('rendermime/factories', () => {

  describe('TextRendererFactory', () => {

    describe('#mimeTypes', () => {

      it('should have text related mimeTypes', () => {
        let mimeTypes = ['text/plain', 'application/vnd.jupyter.stdout',
               'application/vnd.jupyter.stderr'];
        let f = new TextRendererFactory();
        expect(f.mimeTypes).to.eql(mimeTypes);
      });

    });

    describe('#canCreateRenderer()', () => {

      it('should be able to render trusted and untrusted text data', () => {
        let f = new TextRendererFactory();
        expect(runCanCreateRenderer(f, true)).to.be(true);
        expect(runCanCreateRenderer(f, false)).to.be(true);
      });

    });

    describe('#createRenderer()', () => {

      it('should output the correct HTML', () => {
        let f = new TextRendererFactory();
        let mimeType = 'text/plain';
        let model = createModel(mimeType, 'x = 2 ** a');
        let trusted = true;
        let w = f.createRenderer({ mimeType, sanitizer, trusted });
        return w.renderModel(model).then(() => {
          expect(w.node.innerHTML).to.be('<pre>x = 2 ** a</pre>');
        });
      });

      it('should output the correct HTML with ansi colors', () => {
        let f = new TextRendererFactory();
        let source = 'There is no text but \x1b[01;41;32mtext\x1b[00m.\nWoo.';
        let mimeType = 'application/vnd.jupyter.console-text';
        let model = createModel(mimeType, source);
        let trusted = true;
        let w = f.createRenderer({ mimeType, sanitizer, trusted });
        return w.renderModel(model).then(() => {
          expect(w.node.innerHTML).to.be('<pre>There is no text but <span class="ansi-bright-green-fg ansi-red-bg">text</span>.\nWoo.</pre>');
        });
      });

      it('should escape inline html', () => {
        let f = new TextRendererFactory();
        let source = 'There is no text <script>window.x=1</script> but \x1b[01;41;32mtext\x1b[00m.\nWoo.';
        let mimeType = 'application/vnd.jupyter.console-text';
        let model = createModel(mimeType, source);
        let trusted = true;
        let w = f.createRenderer({ mimeType, sanitizer, trusted });
        return w.renderModel(model).then(() => {
          expect(w.node.innerHTML).to.be('<pre>There is no text &lt;script&gt;window.x=1&lt;/script&gt; but <span class="ansi-bright-green-fg ansi-red-bg">text</span>.\nWoo.</pre>');
        });
      });

    });

  });

  describe('LatexRendererFactory', () => {

    describe('#mimeTypes', () => {

      it('should have the text/latex mimeType', () => {
        let t = new LatexRendererFactory();
        expect(t.mimeTypes).to.eql(['text/latex']);
      });

    });

    describe('#canCreateRenderer()', () => {

      it('should be able to render trusted and untrusted latex data', () => {
        let f = new LatexRendererFactory();
        expect(runCanCreateRenderer(f, true)).to.be(true);
        expect(runCanCreateRenderer(f, false)).to.be(true);
      });

    });

    describe('#createRenderer()', () => {

      it('should set the textContent of the widget', () => {
        let source = '\sum\limits_{i=0}^{\infty} \frac{1}{n^2}';
        let f = new LatexRendererFactory();
        let mimeType = 'text/latex';
        let model = createModel(mimeType, source);
        let trusted = true;
        let w = f.createRenderer({ mimeType, sanitizer, trusted });
        return w.renderModel(model).then(() => {
          expect(w.node.textContent).to.be(source);
        });
      });

    });

  });

  describe('PDFRendererFactory', () => {

    describe('#mimeTypes', () => {

      it('should have the application/pdf mimeType', () => {
        let f = new PDFRendererFactory();
        expect(f.mimeTypes).to.eql(['application/pdf']);
      });

    });

    describe('#canCreateRenderer()', () => {

      it('should be able to render trusted pdf data', () => {
        let f = new PDFRendererFactory();
        expect(runCanCreateRenderer(f, true)).to.be(true);
        expect(runCanCreateRenderer(f, false)).to.be(false);
      });

    });

    describe('#createRenderer()', () => {

      it('should render the correct HTML', () => {
        let source = 'test';
        let f = new PDFRendererFactory();
        let mimeType = 'application/pdf';
        let model = createModel(mimeType, source);
        let trusted = true;
        let w = f.createRenderer({ mimeType, sanitizer, trusted });
        return w.renderModel(model).then(() => {
          let node = w.node.firstChild as HTMLAnchorElement;
          expect(node.localName).to.be('a');
          expect(node.target).to.be('_blank');
          expect(node.href).to.be('data:application/pdf;base64,test');
        });
      });

    });

  });

  describe('JavaScriptRendererFactory', () => {

    describe('#mimeTypes', () => {

      it('should have the text/javascript mimeType', () => {
        let mimeTypes = ['text/javascript', 'application/javascript'];
        let f = new JavaScriptRendererFactory();
        expect(f.mimeTypes).to.eql(mimeTypes);
      });

    });

    describe('#canCreateRenderer()', () => {

      it('should be able to render trusted JavaScript data', () => {
        let f = new JavaScriptRendererFactory();
        expect(runCanCreateRenderer(f, true)).to.be(true);
        expect(runCanCreateRenderer(f, false)).to.be(false);
      });

    });

    describe('#createRenderer()', () => {

      it('should create a script tag', () => {
        let f = new JavaScriptRendererFactory();
        let source = 'window.x = 1';
        let mimeType = 'text/javascript';
        let model = createModel(mimeType, source);
        let trusted = true;
        let w = f.createRenderer({ mimeType, sanitizer, trusted });
        return w.renderModel(model).then(() => {
          let el = w.node.firstChild as HTMLElement;
          expect(el.localName).to.be('script');
          expect(el.textContent).to.be(source);

          // Ensure script has not been run yet
          expect((window as any).x).to.be(void 0);
          // Put it on the DOM
          Widget.attach(w, document.body);
          // Should be evaluated now
          expect((window as any).x).to.be(1);
          w.dispose();
        });
      });

    });

  });

  describe('SVGRendererFactory', () => {

    describe('#mimeTypes', () => {

      it('should have the image/svg+xml mimeType', () => {
        let f = new SVGRendererFactory();
        expect(f.mimeTypes).to.eql(['image/svg+xml']);
      });

    });

    describe('#canCreateRenderer()', () => {

      it('should be able to render trusted SVG data', () => {
        let f = new SVGRendererFactory();
        expect(runCanCreateRenderer(f, true)).to.be(true);
        expect(runCanCreateRenderer(f, false)).to.be(false);
      });

    });

    describe('#createRenderer()', () => {

      it('should create an svg tag', () => {
        const source = '<svg></svg>';
        let f = new SVGRendererFactory();
        let mimeType = 'image/svg+xml';
        let model = createModel(mimeType, source);
        let trusted = true;
        let w = f.createRenderer({ mimeType, sanitizer, trusted });
        return w.renderModel(model).then(() => {
          let svgEl = w.node.getElementsByTagName('svg')[0];
          expect(svgEl).to.be.ok();
        });
      });

    });

  });

  describe('MarkdownRendererFactory', () => {

    describe('#mimeTypes', () => {

      it('should have the text/markdown mimeType', function() {
        let f = new MarkdownRendererFactory();
        expect(f.mimeTypes).to.eql(['text/markdown']);
      });

    });

    describe('#canCreateRenderer()', () => {

      it('should be able to render trusted and untrusted markdown data', () => {
        let f = new MarkdownRendererFactory();
        expect(runCanCreateRenderer(f, true)).to.be(true);
        expect(runCanCreateRenderer(f, false)).to.be(true);
      });

    });

    describe('#createRenderer()', () => {

      it('should set the inner html', () => {
        let f = new MarkdownRendererFactory();
        let source = '<p>hello</p>';
        let mimeType = 'text/markdown';
        let model = createModel(mimeType, source);
        let trusted = true;
        let w = f.createRenderer({ mimeType, sanitizer, trusted });
        return w.renderModel(model).then(() => {
          expect(w.node.innerHTML).to.be(source);
        });
      });

      it('should add header anchors', () => {
        let source = require('../../../examples/filebrowser/sample.md') as string;
        let f = new MarkdownRendererFactory();
        let mimeType = 'text/markdown';
        let model = createModel(mimeType, source);
        let trusted = true;
        let w = f.createRenderer({ mimeType, sanitizer, trusted });
        return w.renderModel(model).then(() => {
          Widget.attach(w, document.body);
          let node = document.getElementById('Title-third-level');
          expect(node.localName).to.be('h3');
          let anchor = node.firstChild.nextSibling as HTMLAnchorElement;
          expect(anchor.href).to.contain('#Title-third-level');
          expect(anchor.target).to.be('_self');
          expect(anchor.className).to.contain('jp-InternalAnchorLink');
          expect(anchor.textContent).to.be('¶');
          Widget.detach(w);
        });
      });

      it('should sanitize the html', () => {
        let f = new MarkdownRendererFactory();
        let source = '<p>hello</p><script>alert("foo")</script>';
        let mimeType = 'text/markdown';
        let model = createModel(mimeType, source);
        let trusted = false;
        let w = f.createRenderer({ mimeType, trusted, sanitizer });
        return w.renderModel(model).then(() => {
          expect(w.node.innerHTML).to.not.contain('script');
        });
      });

    });

  });

  describe('HTMLRendererFactory', () => {

    describe('#mimeTypes', () => {

      it('should have the text/html mimeType', () => {
        let f = new HTMLRendererFactory();
        expect(f.mimeTypes).to.eql(['text/html']);
      });

    });

    describe('#canCreateRenderer()', () => {

      it('should be able to render trusted and untrusted html data', () => {
        let f = new HTMLRendererFactory();
        expect(runCanCreateRenderer(f, true)).to.be(true);
        expect(runCanCreateRenderer(f, false)).to.be(true);
      });

    });

    describe('#createRenderer()', () => {

      it('should set the inner HTML', () => {
        let f = new HTMLRendererFactory();
        const source = '<h1>This is great</h1>';
        let mimeType = 'text/html';
        let model = createModel(mimeType, source);
        let trusted = true;
        let w = f.createRenderer({ mimeType, sanitizer, trusted });
        return w.renderModel(model).then(() => {
          expect(w.node.innerHTML).to.be('<h1>This is great</h1>');
        });
      });

      it('should execute a script tag when attached', () => {
        const source = '<script>window.y=3;</script>';
        let f = new HTMLRendererFactory();
        let mimeType = 'text/html';
        let model = createModel(mimeType, source);
        let trusted = true;
        let w = f.createRenderer({ mimeType, sanitizer, trusted });
        return w.renderModel(model).then(() => {
          expect((window as any).y).to.be(void 0);
          Widget.attach(w, document.body);
          expect((window as any).y).to.be(3);
          w.dispose();
        });
      });

      it('should sanitize when untrusted', () => {
        const source = '<pre><script>window.y=3;</script></pre>';
        let f = new HTMLRendererFactory();
        let mimeType = 'text/html';
        let model = createModel(mimeType, source);
        let trusted = false;
        let w = f.createRenderer({ mimeType, trusted, sanitizer });
        return w.renderModel(model).then(() => {
          expect(w.node.innerHTML).to.be('<pre></pre>');
        });
      });

    });

    it('should sanitize html', () => {
      let model = createModel('text/html', '<h1>foo <script>window.x=1></scrip></h1>');
      let f = new HTMLRendererFactory();
      let trusted = false;
      let mimeType = 'text/html';
      let w = f.createRenderer({ mimeType, sanitizer, trusted });
      return w.renderModel(model).then(() => {
        expect(w.node.innerHTML).to.be('<h1>foo </h1>');
      });
    });

  });

  describe('ImageRendererFactory', () => {

    describe('#mimeTypes', () => {

      it('should support multiple mimeTypes', () => {
        let f = new ImageRendererFactory();
        expect(f.mimeTypes).to.eql(['image/png', 'image/jpeg', 'image/gif']);
      });

    });

    describe('#canCreateRenderer()', () => {

      it('should be able to render trusted and untrusted image data', () => {
        let f = new ImageRendererFactory();
        expect(runCanCreateRenderer(f, true)).to.be(true);
        expect(runCanCreateRenderer(f, false)).to.be(true);
      });

    });

    describe('#createRenderer()', () => {

      it('should create an <img> with the right mimeType', () => {
        let source = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        let f = new ImageRendererFactory();
        let mimeType = 'image/png';
        let model = createModel(mimeType, source);
        let w = f.createRenderer({ mimeType, sanitizer, trusted: true });
        let el = w.node.firstChild as HTMLImageElement;

        return w.renderModel(model).then(() => {
          expect(el.src).to.be('data:image/png;base64,' + source);
          expect(el.localName).to.be('img');
          expect(el.innerHTML).to.be('');

          source = 'R0lGODlhAQABAIAAAP///wAAACwAAAAAAQABAAACAkQBADs=';
          mimeType = 'image/gif';
          model = createModel(mimeType, source);
          let trusted = true;
          w = f.createRenderer({ mimeType, sanitizer, trusted });
          return w.renderModel(model);
        }).then(() => {
          el = w.node.firstChild as HTMLImageElement;
          expect(el.src).to.be('data:image/gif;base64,' + source);
          expect(el.localName).to.be('img');
          expect(el.innerHTML).to.be('');
        });
      });

    });

  });

});
