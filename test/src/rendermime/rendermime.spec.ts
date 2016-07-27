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
        r.render(bundle, true).then(w => {
          let el = w.node.firstChild as HTMLElement;
          expect(el.localName).to.be('h1');
        }).then(done, done);
      });

      it('should render the mimetype that is safe', (done) => {
        let bundle: RenderMime.MimeMap<string> = {
          'text/plain': 'foo',
          'text/javascript': 'window.x = 1',
          'image/png': 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
        };
        let r = defaultRenderMime();
        r.render(bundle, false).then(w => {
          let el = w.node.firstChild as HTMLElement;
          expect(el.localName).to.be('img');
        }).then(done, done);
      });

      it('should render the mimetype that is sanitizable', (done) => {
        let bundle: RenderMime.MimeMap<string> = {
          'text/plain': 'foo',
          'text/html': '<h1>foo</h1>'
        };
        let r = defaultRenderMime();
        r.render(bundle, false).then(w => {
          let el = w.node.firstChild as HTMLElement;
          expect(el.localName).to.be('h1');
        }).then(done, done);
      });

      it('should sanitize markdown', (done) => {
        let md = require('../../../examples/filebrowser/sample.md');
        let r = defaultRenderMime();
        r.render({ 'text/markdown': md as string }).then(widget => {
          expect(widget.node.innerHTML).to.be(`<h1>Title first level</h1>\n<h2>Title second Level</h2>\n<h3>Title third level</h3>\n<h4>h4</h4>\n<h5>h5</h5>\n<h6>h6</h6>\n<h1>h1</h1>\n<h2>h2</h2>\n<h3>h3</h3>\n<h4>h4</h4>\n<h5>h6</h5>\n<p>This is just a sample paragraph<br>You can look at different level of nested unorderd list ljbakjn arsvlasc asc asc awsc asc ascd ascd ascd asdc asc</p>\n<ul>\n<li>level 1<ul>\n<li>level 2</li>\n<li>level 2</li>\n<li>level 2<ul>\n<li>level 3</li>\n<li>level 3<ul>\n<li>level 4<ul>\n<li>level 5<ul>\n<li>level 6</li>\n</ul>\n</li>\n</ul>\n</li>\n</ul>\n</li>\n</ul>\n</li>\n<li>level 2</li>\n</ul>\n</li>\n<li>level 1</li>\n<li>level 1</li>\n<li>level 1<br>Ordered list</li>\n<li>level 1<ol>\n<li>level 1</li>\n<li>level 1<ol>\n<li>level 1</li>\n<li>level 1</li>\n<li>level 1<ol>\n<li>level 1</li>\n<li>level 1<ol>\n<li>level 1</li>\n<li>level 1</li>\n<li>level 1</li>\n</ol>\n</li>\n</ol>\n</li>\n</ol>\n</li>\n</ol>\n</li>\n<li>level 1</li>\n<li>level 1<br>some Horizontal line</li>\n</ul>\n<hr>\n<h2>and another one</h2>\n<p>Colons can be used to align columns.</p>\n<table>\n<thead>\n<tr>\n<th>Tables</th>\n<th>Are</th>\n<th>Cool</th>\n</tr>\n</thead>\n<tbody>\n<tr>\n<td>col 3 is</td>\n<td>right-aligned</td>\n<td>1600</td>\n</tr>\n<tr>\n<td>col 2 is</td>\n<td>centered</td>\n<td>12</td>\n</tr>\n<tr>\n<td>zebra stripes</td>\n<td>are neat</td>\n<td>1</td>\n</tr>\n</tbody>\n</table>\n<p>There must be at least 3 dashes separating each header cell.<br>The outer pipes (|) are optional, and you don\'t need to make the<br>raw Markdown line up prettily. You can also use inline Markdown.</p>\n`);
        }).then(done, done);
      });

      it('should sanitize html', (done) => {
        let bundle: RenderMime.MimeMap<string> = {
          'text/html': '<h1>foo <script>window.x=1></scrip></h1>'
        };
        let r = defaultRenderMime();
        r.render(bundle).then(widget => {
          expect(widget.node.innerHTML).to.be('<h1>foo </h1>');
        }).then(done, done);
      });

      it('should sanitize svg', (done) => {
        let bundle: RenderMime.MimeMap<string> = {
          'image/svg+xml': '<svg><script>windox.x=1</script></svg>'
        };
        let r = defaultRenderMime();
        r.render(bundle).then(widget => {
          expect(widget.node.innerHTML.indexOf('svg')).to.not.be(-1);
          expect(widget.node.innerHTML.indexOf('script')).to.be(-1);
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

      it('should select the mimetype that is safe', () => {
        let bundle: RenderMime.MimeMap<string> = {
          'text/plain': 'foo',
          'text/javascript': 'window.x = 1',
          'image/png': 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
        };
        let r = defaultRenderMime();
        expect(r.preferredMimetype(bundle, false)).to.be('image/png');
      });

      it('should render the mimetype that is sanitizable', () => {
        let bundle: RenderMime.MimeMap<string> = {
          'text/plain': 'foo',
          'text/html': '<h1>foo</h1>'
        };
        let r = defaultRenderMime();
        expect(r.preferredMimetype(bundle, false)).to.be('text/html');
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
