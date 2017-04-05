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
  LatexRenderer, PDFRenderer, JavaScriptRenderer,
  SVGRenderer, MarkdownRenderer, TextRenderer, HTMLRenderer, ImageRenderer
} from '@jupyterlab/rendermime';

import {
  MimeModel, RenderMime
} from '@jupyterlab/rendermime';


function runCanRunder(renderer: RenderMime.IRenderer, trusted: boolean): boolean {
  let canRender = true;
  let data: JSONObject = Object.create(null);
  for (let mimeType in renderer.mimeTypes) {
    data[mimeType] = 'test';
  }
  data['fizz/buzz'] = 'test';
  let model = new MimeModel({ data, trusted });

  for (let mimeType of renderer.mimeTypes) {
    let options = { model, mimeType, sanitizer };
    if (!renderer.canRender(options)) {
      canRender = false;
    }
  }
  let options = { model, mimeType: 'fizz/buzz', sanitizer };
  expect(renderer.canRender(options)).to.be(false);
  return canRender;
}


function createModel(mimeType: string, source: JSONValue, trusted=false): RenderMime.IMimeModel {
  let data: JSONObject = {};
  data[mimeType] = source;
  return new MimeModel({ data, trusted });
}

const sanitizer = defaultSanitizer;


describe('renderers', () => {

  describe('TextRenderer', () => {

    describe('#mimeTypes', () => {

      it('should have text related mimeTypes', () => {
        let mimeTypes = ['text/plain', 'application/vnd.jupyter.stdout',
               'application/vnd.jupyter.stderr'];
        let t = new TextRenderer();
        expect(t.mimeTypes).to.eql(mimeTypes);
      });

    });

    describe('#canRender()', () => {

      it('should be able to render trusted and untrusted text data', () => {
        let r = new TextRenderer();
        expect(runCanRunder(r, true)).to.be(true);
        expect(runCanRunder(r, false)).to.be(true);
      });

    });

    describe('#render()', () => {

      it('should output the correct HTML', () => {
        let t = new TextRenderer();
        let mimeType = 'text/plain';
        let model = createModel(mimeType, 'x = 2 ** a');
        let widget = t.render({ mimeType, model, sanitizer });
        expect(widget.node.innerHTML).to.be('<pre>x = 2 ** a</pre>');
      });

      it('should output the correct HTML with ansi colors', () => {
        let t = new TextRenderer();
        let source = 'There is no text but \x1b[01;41;32mtext\x1b[00m.\nWoo.';
        let mimeType = 'application/vnd.jupyter.console-text';
        let model = createModel(mimeType, source);
        let widget = t.render({ mimeType, model, sanitizer });
        expect(widget.node.innerHTML).to.be('<pre>There is no text but <span style="color:rgb(0, 255, 0);background-color:rgb(187, 0, 0)">text</span>.\nWoo.</pre>');
      });

      it('should escape inline html', () => {
        let t = new TextRenderer();
        let source = 'There is no text <script>window.x=1</script> but \x1b[01;41;32mtext\x1b[00m.\nWoo.';
        let mimeType = 'application/vnd.jupyter.console-text';
        let model = createModel(mimeType, source);
        let widget = t.render({ mimeType, model, sanitizer });
        expect(widget.node.innerHTML).to.be('<pre>There is no text &lt;script&gt;window.x=1&lt;/script&gt; but <span style="color:rgb(0, 255, 0);background-color:rgb(187, 0, 0)">text</span>.\nWoo.</pre>');
      });

    });

  });

  describe('LatexRenderer', () => {

    describe('#mimeTypes', () => {

      it('should have the text/latex mimeType', () => {
        let t = new LatexRenderer();
        expect(t.mimeTypes).to.eql(['text/latex']);
      });

    });

    describe('#canRender()', () => {

      it('should be able to render trusted and untrusted latex data', () => {
        let r = new LatexRenderer();
        expect(runCanRunder(r, true)).to.be(true);
        expect(runCanRunder(r, false)).to.be(true);
      });

    });

    describe('#render()', () => {

      it('should set the textContent of the widget', () => {
        let source = '\sum\limits_{i=0}^{\infty} \frac{1}{n^2}';
        let t = new LatexRenderer();
        let mimeType = 'text/latex';
        let model = createModel(mimeType, source);
        let widget = t.render({ mimeType, model, sanitizer });
        expect(widget.node.textContent).to.be(source);
      });

    });

  });

  describe('PDFRenderer', () => {

    describe('#mimeTypes', () => {

      it('should have the application/pdf mimeType', () => {
        let t = new PDFRenderer();
        expect(t.mimeTypes).to.eql(['application/pdf']);
      });

    });

    describe('#canRender()', () => {

      it('should be able to render trusted pdf data', () => {
        let r = new PDFRenderer();
        expect(runCanRunder(r, true)).to.be(true);
        expect(runCanRunder(r, false)).to.be(false);
      });

    });

    describe('#render()', () => {

      it('should render the correct HTML', () => {
        let source = 'test';
        let t = new PDFRenderer();
        let mimeType = 'application/pdf';
        let model = createModel(mimeType, source);
        let w = t.render({ mimeType, model, sanitizer });
        let node = w.node.firstChild as HTMLAnchorElement;
        expect(node.localName).to.be('a');
        expect(node.target).to.be('_blank');
        expect(node.href).to.be('data:application/pdf;base64,test');
      });

    });

  });

  describe('JavaScriptRenderer', () => {

    describe('#mimeTypes', () => {

      it('should have the text/javascript mimeType', () => {
        let mimeTypes = ['text/javascript', 'application/javascript'];
        let t = new JavaScriptRenderer();
        expect(t.mimeTypes).to.eql(mimeTypes);
      });

    });

    describe('#canRender()', () => {

      it('should be able to render trusted JavaScript data', () => {
        let r = new JavaScriptRenderer();
        expect(runCanRunder(r, true)).to.be(true);
        expect(runCanRunder(r, false)).to.be(false);
      });

    });

    describe('#render()', () => {

      it('should create a script tag', () => {
        let t = new JavaScriptRenderer();
        let source = 'window.x = 1';
        let mimeType = 'text/javascript';
        let model = createModel(mimeType, source);
        let w = t.render({ mimeType, model, sanitizer });
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

  describe('SVGRenderer', () => {

    describe('#mimeTypes', () => {

      it('should have the image/svg+xml mimeType', () => {
        let t = new SVGRenderer();
        expect(t.mimeTypes).to.eql(['image/svg+xml']);
      });

    });

    describe('#canRender()', () => {

      it('should be able to render trusted SVG data', () => {
        let r = new SVGRenderer();
        expect(runCanRunder(r, true)).to.be(true);
        expect(runCanRunder(r, false)).to.be(false);
      });

    });

    describe('#render()', () => {

      it('should create an svg tag', () => {
        const source = '<svg></svg>';
        let t = new SVGRenderer();
        let mimeType = 'image/svg+xml';
        let model = createModel(mimeType, source);
        let w = t.render({ mimeType, model, sanitizer });
        let svgEl = w.node.getElementsByTagName('svg')[0];
        expect(svgEl).to.be.ok();
      });

    });

  });

  describe('MarkdownRenderer', () => {

    describe('#mimeTypes', () => {

      it('should have the text/markdown mimeType', function() {
        let t = new MarkdownRenderer();
        expect(t.mimeTypes).to.eql(['text/markdown']);
      });

    });

    describe('#canRender()', () => {

      it('should be able to render trusted and untrusted markdown data', () => {
        let r = new MarkdownRenderer();
        expect(runCanRunder(r, true)).to.be(true);
        expect(runCanRunder(r, false)).to.be(true);
      });

    });

    describe('#render()', () => {

      it('should set the inner html', (done) => {
        let r = new MarkdownRenderer();
        let source = '<p>hello</p>';
        let mimeType = 'text/markdown';
        let model = createModel(mimeType, source);
        let widget = r.render({ mimeType, model, sanitizer });
        let loop = () => {
          if ((widget as any)._rendered) {
            expect(widget.node.innerHTML).to.be(source);
            done();
            return;
          }
          setTimeout(loop, 100);
        };
        setTimeout(loop, 100);
      });

      it('should add header anchors', (done) => {
        let source = require('../../../examples/filebrowser/sample.md') as string;
        let r = new MarkdownRenderer();
        let mimeType = 'text/markdown';
        let model = createModel(mimeType, source);
        let widget = r.render({ mimeType, model, sanitizer });
        let loop = () => {
          if ((widget as any)._rendered) {
            Widget.attach(widget, document.body);
            let node = document.getElementById('Title-third-level');
            expect(node.localName).to.be('h3');
            let anchor = node.firstChild.nextSibling as HTMLAnchorElement;
            expect(anchor.href).to.contain('#Title-third-level');
            expect(anchor.target).to.be('_self');
            expect(anchor.className).to.contain('jp-InternalAnchorLink');
            expect(anchor.textContent).to.be('¶');
            Widget.detach(widget);
            done();
            return;
          }
          setTimeout(loop, 100);
        };
        setTimeout(loop, 100);
      });

      it('should sanitize the html', (done) => {
        let r = new MarkdownRenderer();
        let source = '<p>hello</p><script>alert("foo")</script>';
        let mimeType = 'text/markdown';
        let model = createModel(mimeType, source);
        let widget = r.render({ mimeType, model, sanitizer });
        let loop = () => {
          if ((widget as any)._rendered) {
            expect(widget.node.innerHTML).to.not.contain('script');
            done();
            return;
          }
          setTimeout(loop, 100);
        };
        setTimeout(loop, 100);
      });

    });

  });

  describe('HTMLRenderer', () => {

    describe('#mimeTypes', () => {

      it('should have the text/html mimeType', () => {
        let t = new HTMLRenderer();
        expect(t.mimeTypes).to.eql(['text/html']);
      });

    });

    describe('#canRender()', () => {

      it('should be able to render trusted and untrusted html data', () => {
        let r = new HTMLRenderer();
        expect(runCanRunder(r, true)).to.be(true);
        expect(runCanRunder(r, false)).to.be(true);
      });

    });

    describe('#render()', () => {

      it('should set the inner HTML', () => {
        let r = new HTMLRenderer();
        const source = '<h1>This is great</h1>';
        let mimeType = 'text/html';
        let model = createModel(mimeType, source);
        let w = r.render({ mimeType, model, sanitizer });
        expect(w.node.innerHTML).to.be('<h1>This is great</h1>');
      });

      it('should execute a script tag when attached', () => {
        const source = '<script>window.y=3;</script>';
        let r = new HTMLRenderer();
        let mimeType = 'text/html';
        let model = createModel(mimeType, source, true);
        let w = r.render({ mimeType, model, sanitizer });
        expect((window as any).y).to.be(void 0);
        Widget.attach(w, document.body);
        expect((window as any).y).to.be(3);
        w.dispose();
      });

      it('should sanitize when untrusted', () => {
        const source = '<pre><script>window.y=3;</script></pre>';
        let r = new HTMLRenderer();
        let mimeType = 'text/html';
        let model = createModel(mimeType, source);
        let w = r.render({ mimeType, model, sanitizer });
        expect(w.node.innerHTML).to.be('<pre></pre>');
      });

    });

  });

  describe('ImageRenderer', () => {

    describe('#mimeTypes', () => {

      it('should support multiple mimeTypes', () => {
        let t = new ImageRenderer();
        expect(t.mimeTypes).to.eql(['image/png', 'image/jpeg', 'image/gif']);
      });

    });

    describe('#canRender()', () => {

      it('should be able to render trusted and untrusted image data', () => {
        let r = new ImageRenderer();
        expect(runCanRunder(r, true)).to.be(true);
        expect(runCanRunder(r, false)).to.be(true);
      });

    });

    describe('#render()', () => {

      it('should create an <img> with the right mimeType', () => {
        let source = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        let r = new ImageRenderer();
        let mimeType = 'image/png';
        let model = createModel(mimeType, source);
        let w = r.render({ mimeType, model, sanitizer });
        let el = w.node.firstChild as HTMLImageElement;
        expect(el.src).to.be('data:image/png;base64,' + source);
        expect(el.localName).to.be('img');
        expect(el.innerHTML).to.be('');

        source = 'R0lGODlhAQABAIAAAP///wAAACwAAAAAAQABAAACAkQBADs=';
        mimeType = 'image/gif';
        model = createModel(mimeType, source);
        w = r.render({ mimeType, model, sanitizer });
        el = w.node.firstChild as HTMLImageElement;
        expect(el.src).to.be('data:image/gif;base64,' + source);
        expect(el.localName).to.be('img');
        expect(el.innerHTML).to.be('');
      });

    });

  });

});
