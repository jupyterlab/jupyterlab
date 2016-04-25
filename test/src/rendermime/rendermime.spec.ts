// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import expect = require('expect.js');

import {
  Widget
} from 'phosphor-widget';

import {
  ConsoleTextRenderer, LatexRenderer, PDFRenderer, JavascriptRenderer,
  SVGRenderer, MarkdownRenderer, TextRenderer, HTMLRenderer, ImageRenderer
} from '../../../lib/renderers';

import {
  IRenderer, MimeMap, RenderMime
} from '../../../lib/rendermime';


const TRANSFORMERS = [
  new JavascriptRenderer(),
  new MarkdownRenderer(),
  new HTMLRenderer(),
  new ImageRenderer(),
  new SVGRenderer(),
  new LatexRenderer(),
  new ConsoleTextRenderer(),
  new TextRenderer()
];


function defaultRenderMime(): RenderMime<Widget> {
  let renderers: MimeMap<IRenderer<Widget>> = {};
  let order: string[] = [];
  for (let t of TRANSFORMERS) {
    for (let m of t.mimetypes) {
      renderers[m] = t;
      order.push(m);
    }
  }
  return new RenderMime<Widget>(renderers, order);
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

      it('should render a mimebundle', () => {
        let r = defaultRenderMime();
        let w = r.render({ 'text/plain': 'foo' });
        expect(w instanceof Widget).to.be(true);
      });

      it('should return `undefined` for an unregistered mime type', () => {
        let r = defaultRenderMime();
        expect(r.render({ 'text/fizz': 'buzz' })).to.be(void 0);
      });

      it('should render with the mimetype of highest precidence', () => {
        let bundle: MimeMap<string> = {
          'text/plain': 'foo',
          'text/html': '<h1>foo</h1>'
        }
        let r = defaultRenderMime();
        let w = r.render(bundle);
        let el = w.node.firstChild as HTMLElement;
        expect(el.localName).to.be('h1');
      });

    });

    describe('#preferredMimetype()', () => {

      it('should find the preferred mimetype in a bundle', () => {
        let bundle: MimeMap<string> = {
          'text/plain': 'foo',
          'text/html': '<h1>foo</h1>'
        }
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
        expect(c.getRenderer('text/html')).to.be(r.getRenderer('text/html'));
        let t = new TextRenderer();
        c.addRenderer('text/foo', t);
        expect(c.getRenderer('text/foo')).to.be(t);
        expect(r.getRenderer('text/foo')).to.be(void 0);
        expect(r).to.not.be(c);
      });

    });

    describe('#getRenderer()', () => {

      it('should get a renderer by mimetype', () => {
        let r = defaultRenderMime();
        let t = r.getRenderer('text/latex');
        expect(t.mimetypes.indexOf('text/latex')).to.not.be(-1);
      });

      it('should return `undefined` for an unregistered type', () => {
        let r = defaultRenderMime();
        expect(r.getRenderer('text/foo')).to.be(void 0);
      });

    });

    describe('#addRenderer()', () => {

      it('should add a renderer by mimetype', () => {
        let r = defaultRenderMime();
        let t = new TextRenderer();
        r.addRenderer('text/foo', t);
        expect(r.getRenderer('text/foo')).to.be(t);
        let index = r.order.indexOf('text/foo');
        expect(index).to.be(r.order.length - 1);
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
        expect(r.getRenderer('text/html')).to.be(void 0);
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
