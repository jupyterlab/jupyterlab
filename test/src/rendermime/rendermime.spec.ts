// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  Widget
} from 'phosphor-widget';

import {
  LatexRenderer, PDFRenderer, JavascriptRenderer,
  SVGRenderer, MarkdownRenderer, TextRenderer, HTMLRenderer, ImageRenderer
} from '../../../lib/renderers';

import {
  RenderMime
} from '../../../lib/rendermime';


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
function defaultRenderMime(): RenderMime<Widget> {
  let renderers: RenderMime.MimeMap<RenderMime.IRenderer<Widget>> = {};
  let order: string[] = [];
  for (let t of TRANSFORMERS) {
    for (let m of t.mimetypes) {
      renderers[m] = t;
      order.push(m);
    }
  }
  return new RenderMime<Widget>({ renderers, order });
}


describe('jupyter-ui', () => {

  describe('RenderMime', () => {

    describe('#constructor()', () => {

      it('should accept a mapping and a default order', () => {
        let r = defaultRenderMime();
        expect(r instanceof RenderMime).to.be(true);
      });

    });

    describe('#render()', () => {

      it('should render a mimebundle', (done) => {
        let r = defaultRenderMime();
        r.render({ 'text/plain': 'foo' }).then(w => {
          expect(w instanceof Widget).to.be(true);
        }).then(done, done);
      });

      it('should return `undefined` for an unregistered mime type', (done) => {
        let r = defaultRenderMime();
        r.render({ 'text/fizz': 'buzz' }).then(value => {
          expect(value).to.be(void 0);
        }).then(done, done);
      });

      it('should render with the mimetype of highest precidence', (done) => {
        let bundle: RenderMime.MimeMap<string> = {
          'text/plain': 'foo',
          'text/html': '<h1>foo</h1>'
        };
        let r = defaultRenderMime();
        r.render(bundle).then(w => {
          let el = w.node.firstChild as HTMLElement;
          expect(el.localName).to.be('h1');
        }).then(done, done);
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
