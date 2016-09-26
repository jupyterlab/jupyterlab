// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  LatexRenderer, PDFRenderer, JavascriptRenderer,
  SVGRenderer, MarkdownRenderer, TextRenderer, HTMLRenderer, ImageRenderer
} from '../../../lib/renderers';

import {
  RenderMime
} from '../../../lib/rendermime';

import {
  defaultSanitizer
} from '../../../lib/sanitizer';


const TRANSFORMERS = [
  new JavascriptRenderer(),
  new MarkdownRenderer(),
  new HTMLRenderer(),
  new PDFRenderer(),
  new ImageRenderer(),
  new SVGRenderer(),
  new LatexRenderer(),
  new TextRenderer()
];


export
function defaultRenderMime(): RenderMime {
  let renderers: RenderMime.MimeMap<RenderMime.IRenderer> = {};
  let order: string[] = [];
  for (let t of TRANSFORMERS) {
    for (let m of t.mimetypes) {
      renderers[m] = t;
      order.push(m);
    }
  }
  let sanitizer = defaultSanitizer;
  return new RenderMime({ renderers, order, sanitizer });
}


describe('rendermime/index', () => {

  describe('RenderMime', () => {

    describe('#constructor()', () => {

      it('should accept a mapping and a default order', () => {
        let r = defaultRenderMime();
        expect(r instanceof RenderMime).to.be(true);
      });

    });

    describe('#render()', () => {

      it('should render a mimebundle', () => {
        let r = defaultRenderMime();
        let w = r.render({ bundle: { 'text/plain': 'foo' } });
        expect(w instanceof Widget).to.be(true);
      });

      it('should return `undefined` for an unregistered mime type', () => {
        let r = defaultRenderMime();
        let value = r.render({ bundle: { 'text/fizz': 'buzz' } });
        expect(value).to.be(void 0);
      });

      it('should render with the mimetype of highest precidence', () => {
        let bundle: RenderMime.MimeMap<string> = {
          'text/plain': 'foo',
          'text/html': '<h1>foo</h1>'
        };
        let r = defaultRenderMime();
        let w = r.render({ bundle, trusted: true });
        let el = w.node.firstChild as HTMLElement;
        expect(el.localName).to.be('h1');
      });

      it('should render the mimetype that is safe', () => {
        let bundle: RenderMime.MimeMap<string> = {
          'text/plain': 'foo',
          'text/javascript': 'window.x = 1',
          'image/png': 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
        };
        let r = defaultRenderMime();
        let w = r.render({ bundle, trusted: false });
        let el = w.node.firstChild as HTMLElement;
        expect(el.localName).to.be('img');
      });

      it('should render the mimetype that is sanitizable', () => {
        let bundle: RenderMime.MimeMap<string> = {
          'text/plain': 'foo',
          'text/html': '<h1>foo</h1>'
        };
        let r = defaultRenderMime();
        let w = r.render({ bundle, trusted: false });
        let el = w.node.firstChild as HTMLElement;
        expect(el.localName).to.be('h1');
      });

      it('should sanitize html', () => {
        let bundle: RenderMime.MimeMap<string> = {
          'text/html': '<h1>foo <script>window.x=1></scrip></h1>'
        };
        let r = defaultRenderMime();
        let widget = r.render({ bundle });
        expect(widget.node.innerHTML).to.be('<h1>foo </h1>');
      });

      it('should sanitize svg', () => {
        let bundle: RenderMime.MimeMap<string> = {
          'image/svg+xml': '<svg><script>windox.x=1</script></svg>'
        };
        let r = defaultRenderMime();
        let widget = r.render({ bundle });
        expect(widget.node.innerHTML.indexOf('svg')).to.not.be(-1);
        expect(widget.node.innerHTML.indexOf('script')).to.be(-1);
      });

    });

    describe('#preferredMimetype()', () => {

      it('should find the preferred mimetype in a bundle', () => {
        let bundle: RenderMime.MimeMap<string> = {
          'text/plain': 'foo',
          'text/html': '<h1>foo</h1>'
        };
        let r = defaultRenderMime();
        expect(r.preferredMimetype(bundle)).to.be('text/html');
      });

      it('should return `undefined` if there are no registered mimetypes', () => {
        let r = defaultRenderMime();
        expect(r.preferredMimetype({ 'text/fizz': 'buzz' })).to.be(void 0);
      });

      it('should select the mimetype that is safe', () => {
        let bundle: RenderMime.MimeMap<string> = {
          'text/plain': 'foo',
          'text/javascript': 'window.x = 1',
          'image/png': 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
        };
        let r = defaultRenderMime();
        expect(r.preferredMimetype(bundle)).to.be('image/png');
      });

      it('should render the mimetype that is sanitizable', () => {
        let bundle: RenderMime.MimeMap<string> = {
          'text/plain': 'foo',
          'text/html': '<h1>foo</h1>'
        };
        let r = defaultRenderMime();
        expect(r.preferredMimetype(bundle)).to.be('text/html');
      });
    });

    describe('#clone()', () => {

      it('should clone the rendermime instance with shallow copies of data', () => {
        let r = defaultRenderMime();
        let c = r.clone();
        expect(c.order).to.eql(r.order);
        let t = new TextRenderer();
        c.addRenderer('text/foo', t);
        expect(r).to.not.be(c);
      });

    });

    describe('#addRenderer()', () => {

      it('should add a renderer by mimetype', () => {
        let r = defaultRenderMime();
        let t = new TextRenderer();
        r.addRenderer('text/foo', t);
        let index = r.order.indexOf('text/foo');
        expect(index).to.be(0);
      });

      it('should take an optional order index', () => {
        let r = defaultRenderMime();
        let t = new TextRenderer();
        let len = r.order.length;
        r.addRenderer('text/foo', t, 0);
        let index = r.order.indexOf('text/foo');
        expect(index).to.be(0);
        expect(r.order.length).to.be(len + 1);
      });

    });

    describe('#removeRenderer()', () => {

      it('should remove a renderer by mimetype', () => {
        let r = defaultRenderMime();
        r.removeRenderer('text/html');
        let bundle: RenderMime.MimeMap<string> = {
          'text/html': '<h1>foo</h1>'
        };
        expect(r.preferredMimetype(bundle)).to.be(void 0);
      });

      it('should be a no-op if the mimetype is not registered', () => {
        let r = defaultRenderMime();
        r.removeRenderer('text/foo');
      });

    });

    describe('#order', () => {

      it('should get the ordered list of mimetypes', () => {
        let r = defaultRenderMime();
        expect(r.order.indexOf('text/html')).to.not.be(-1);
      });

      it('should set the ordered list of mimetypes', () => {
        let r = defaultRenderMime();
        let order = r.order.reverse();
        r.order = order;
        expect(r.order).to.eql(order);
      });

    });

  });

});
