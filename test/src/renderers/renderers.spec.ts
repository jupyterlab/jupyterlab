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
  defaultSanitizer
} from '../../../lib/sanitizer';


const EXPECTED_MD = `<h1>Title first level</h1>\n<h2>Title second Level</h2>\n<h3>Title third level</h3>\n<h4>h4</h4>\n<h5>h5</h5>\n<h6>h6</h6>\n<h1>h1</h1>\n<h2>h2</h2>\n<h3>h3</h3>\n<h4>h4</h4>\n<h5>h6</h5>\n<p>This is just a sample paragraph<br>You can look at different level of nested unorderd list ljbakjn arsvlasc asc asc awsc asc ascd ascd ascd asdc asc</p>\n<ul>\n<li>level 1<ul>\n<li>level 2</li>\n<li>level 2</li>\n<li>level 2<ul>\n<li>level 3</li>\n<li>level 3<ul>\n<li>level 4<ul>\n<li>level 5<ul>\n<li>level 6</li>\n</ul>\n</li>\n</ul>\n</li>\n</ul>\n</li>\n</ul>\n</li>\n<li>level 2</li>\n</ul>\n</li>\n<li>level 1</li>\n<li>level 1</li>\n<li>level 1<br>Ordered list</li>\n<li>level 1<ol>\n<li>level 1</li>\n<li>level 1<ol>\n<li>level 1</li>\n<li>level 1</li>\n<li>level 1<ol>\n<li>level 1</li>\n<li>level 1<ol>\n<li>level 1</li>\n<li>level 1</li>\n<li>level 1</li>\n</ol>\n</li>\n</ol>\n</li>\n</ol>\n</li>\n</ol>\n</li>\n<li>level 1</li>\n<li>level 1<br>some Horizontal line</li>\n</ul>\n<hr>\n<h2>and another one</h2>\n<p>Colons can be used to align columns.</p>\n<table>\n<thead>\n<tr>\n<th>Tables</th>\n<th>Are</th>\n<th>Cool</th>\n</tr>\n</thead>\n<tbody>\n<tr>\n<td>col 3 is</td>\n<td>right-aligned</td>\n<td>1600</td>\n</tr>\n<tr>\n<td>col 2 is</td>\n<td>centered</td>\n<td>12</td>\n</tr>\n<tr>\n<td>zebra stripes</td>\n<td>are neat</td>\n<td>1</td>\n</tr>\n</tbody>\n</table>\n<p>There must be at least 3 dashes separating each header cell.<br>The outer pipes (|) are optional, and you don\'t need to make the<br>raw Markdown line up prettily. You can also use inline Markdown.</p>\n`;


describe('renderers', () => {

  describe('TextRenderer', () => {

    describe('#mimetypes', () => {

      it('should have the text/plain and jupyter/console-text mimetype', () => {
        let mimetypes = ['text/plain', 'application/vnd.jupyter.console-text'];
        let t = new TextRenderer();
        expect(t.mimetypes).to.eql(mimetypes);
      });

    });

    describe('#sanitizable()', () => {

      it('should be `false`', () => {
        let t = new TextRenderer();
        expect(t.sanitizable('text/plain')).to.be(false);
        expect(t.sanitizable('application/vnd.jupyter.console-text')).to.be(false);
      });

    });

    describe('#isSafe()', () => {

      it('should be `true`', () => {
        let t = new TextRenderer();
        expect(t.isSafe('text/plain')).to.be(true);
        expect(t.isSafe('application/vnd.jupyter.console-text')).to.be(true);
      });

    });

    describe('#render()', () => {

      it('should output the correct HTML', () => {
        let t = new TextRenderer();
        let widget = t.render({ mimetype: 'text/plain', source: 'x = 2 ** a' });
        expect(widget.node.innerHTML).to.be('<pre>x = 2 ** a</pre>');
      });

      it('should output the correct HTML with ansi colors', () => {
        let t = new TextRenderer();
        let source = 'There is no text but \x1b[01;41;32mtext\x1b[00m.\nWoo.';
        let widget = t.render({
          mimetype: 'application/vnd.jupyter.console-text', source
        });
        expect(widget.node.innerHTML).to.be('<pre>There is no text but <span style="color:rgb(0, 255, 0);background-color:rgb(187, 0, 0)">text</span>.\nWoo.</pre>');
      });

      it('should escape inline html', () => {
        let t = new TextRenderer();
        let source = 'There is no text <script>window.x=1</script> but \x1b[01;41;32mtext\x1b[00m.\nWoo.';
        let widget = t.render({
          mimetype: 'application/vnd.jupyter.console-text', source
        });
        expect(widget.node.innerHTML).to.be('<pre>There is no text &lt;script&gt;window.x=1&lt;/script&gt; but <span style="color:rgb(0, 255, 0);background-color:rgb(187, 0, 0)">text</span>.\nWoo.</pre>');
      });

    });

  });

  describe('LatexRenderer', () => {

    describe('#mimetypes', () => {

      it('should have the text/latex mimetype', () => {
        let t = new LatexRenderer();
        expect(t.mimetypes).to.eql(['text/latex']);
      });

    });

    describe('#sanitizable()', () => {

      it('should be `false`', () => {
        let t = new LatexRenderer();
        expect(t.sanitizable('text/latex')).to.be(false);
      });

    });

    describe('#isSafe()', () => {

      it('should be `true`', () => {
        let t = new LatexRenderer();
        expect(t.isSafe('text/latex')).to.be(true);
      });

    });

    describe('#render()', () => {

      it('should set the textContent of the widget', () => {
        let source = '\sum\limits_{i=0}^{\infty} \frac{1}{n^2}';
        let t = new LatexRenderer();
        let widget = t.render({ mimetype: 'text/latex', source });
        expect(widget.node.textContent).to.be(source);
      });

    });

  });

  describe('PDFRenderer', () => {

    describe('#mimetypes', () => {

      it('should have the application/pdf mimetype', () => {
        let t = new PDFRenderer();
        expect(t.mimetypes).to.eql(['application/pdf']);
      });

    });

    describe('#sanitizable()', () => {

      it('should be `false`', () => {
        let t = new PDFRenderer();
        expect(t.sanitizable('application/pdf')).to.be(false);
      });

    });

    describe('#isSafe()', () => {

      it('should be `false`', () => {
        let t = new PDFRenderer();
        expect(t.isSafe('application/pdf')).to.be(false);
      });

    });

    describe('#render()', () => {

      it('should render the correct HTML', () => {
        let source = "I don't have a b64'd PDF";
        let t = new PDFRenderer();
        let w = t.render({ mimetype: 'application/pdf', source });
        expect(w.node.innerHTML.indexOf('data:application/pdf')).to.not.be(-1);
      });

    });

  });

  describe('JavascriptRenderer', () => {

    describe('#mimetypes', () => {

      it('should have the text/javascript mimetype', () => {
        let mimetypes = ['text/javascript', 'application/javascript'];
        let t = new JavascriptRenderer();
        expect(t.mimetypes).to.eql(mimetypes);
      });

    });

    describe('#sanitizable()', () => {

      it('should be `false`', () => {
        let t = new JavascriptRenderer();
        expect(t.sanitizable('text/javascript')).to.be(false);
      });

    });

    describe('#isSafe()', () => {

      it('should be `false`', () => {
        let t = new JavascriptRenderer();
        expect(t.isSafe('text/javascript')).to.be(false);
      });

    });

    describe('#render()', () => {

      it('should create a script tag', () => {
        let t = new JavascriptRenderer();
        let source = 'window.x = 1';
        let w = t.render({ mimetype: 'text/javascript', source });
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

    describe('#mimetypes', () => {

      it('should have the image/svg+xml mimetype', () => {
        let t = new SVGRenderer();
        expect(t.mimetypes).to.eql(['image/svg+xml']);
      });

    });

    describe('#sanitizable()', () => {

      it('should be `true`', () => {
        let t = new SVGRenderer();
        expect(t.sanitizable('image/svg+xml')).to.be(true);
      });

    });

    describe('#isSafe()', () => {

      it('should be `false`', () => {
        let t = new SVGRenderer();
        expect(t.isSafe('image/svg+xml')).to.be(false);
      });

    });

    describe('#render()', () => {

      it('should create an svg tag', () => {
        const source = '<svg></svg>';
        let t = new SVGRenderer();
        let w = t.render({ mimetype: 'image/svg+xml', source });
        let svgEl = w.node.getElementsByTagName('svg')[0];
        expect(svgEl).to.be.ok();
      });

      it('should sanitize when a sanitizer is given', () => {
        const source = '<svg><script>window.x = 1</script></svg>';
        let t = new SVGRenderer();
        let w = t.render({
          mimetype: 'image/svg+xml', source, sanitizer: defaultSanitizer
        });
        expect(w.node.innerHTML).to.be('<svg></svg>');
      });

    });

  });

  describe('MarkdownRenderer', () => {

    describe('#mimetypes', () => {

      it('should have the text/markdown mimetype', function() {
        let t = new MarkdownRenderer();
        expect(t.mimetypes).to.eql(['text/markdown']);
      });

    });

    describe('#sanitizable()', () => {

      it('should be `true`', () => {
        let t = new MarkdownRenderer();
        expect(t.sanitizable('text/markdown')).to.be(true);
      });

    });

    describe('#isSafe()', () => {

      it('should be `false`', () => {
        let t = new MarkdownRenderer();
        expect(t.isSafe('text/markdown')).to.be(false);
      });

    });

    describe('#render()', () => {

      it('should set the inner html', (done) => {
        let t = new MarkdownRenderer();
        let source = '<p>hello</p>';
        let widget = t.render({ mimetype: 'text/markdown', source });
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

      it('should sanitize if a sanitizer is given', (done) => {
        let source = require('../../../examples/filebrowser/sample.md') as string;
        let r = new MarkdownRenderer();
        let widget = r.render({
          mimetype: 'text/markdown', source, sanitizer: defaultSanitizer
        });
        let loop = () => {
          if ((widget as any)._rendered) {
            expect(widget.node.innerHTML).to.be(EXPECTED_MD);
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

    describe('#mimetypes', () => {

      it('should have the text/html mimetype', () => {
        let t = new HTMLRenderer();
        expect(t.mimetypes).to.eql(['text/html']);
      });

    });

    describe('#sanitizable()', () => {

      it('should be `true`', () => {
        let t = new HTMLRenderer();
        expect(t.sanitizable('text/html')).to.be(true);
      });

    });

    describe('#isSafe()', () => {

      it('should be `false`', () => {
        let t = new HTMLRenderer();
        expect(t.isSafe('text/html')).to.be(false);
      });

    });

    describe('#render()', () => {

      it('should set the inner HTML', () => {
        let t = new HTMLRenderer();
        const source = '<h1>This is great</h1>';
        let w = t.render({ mimetype: 'text/html', source });
        expect(w.node.innerHTML).to.be('<h1>This is great</h1>');
      });

      it('should execute a script tag when attached', () => {
        const source = '<script>window.y=3;</script>';
        let t = new HTMLRenderer();
        let w = t.render({ mimetype: 'text/html', source });
        expect((window as any).y).to.be(void 0);
        Widget.attach(w, document.body);
        expect((window as any).y).to.be(3);
        w.dispose();
      });

      it('should sanitize when a sanitizer is given', () => {
        const source = '<pre><script>window.y=3;</script></pre>';
        let t = new HTMLRenderer();
        let w = t.render({
          mimetype: 'text/html', source, sanitizer: defaultSanitizer
        });
        expect(w.node.innerHTML).to.be('<pre></pre>');
      });

    });

  });

  describe('ImageRenderer', () => {

    describe('#mimetypes', () => {

      it('should support multiple mimetypes', () => {
        let t = new ImageRenderer();
        expect(t.mimetypes).to.eql(['image/png', 'image/jpeg', 'image/gif']);
      });

    });

    describe('#sanitizable()', () => {

      it('should be `false`', () => {
        let t = new ImageRenderer();
        expect(t.sanitizable('image/png')).to.be(false);
      });

    });

    describe('#isSafe()', () => {

      it('should be `true`', () => {
        let t = new ImageRenderer();
        expect(t.isSafe('image/png')).to.be(true);
      });

    });

    describe('#render()', () => {

      it('should create an <img> with the right mimetype', () => {
        let source = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        let t = new ImageRenderer();
        let w = t.render({ mimetype: 'image/png', source });
        let el = w.node.firstChild as HTMLImageElement;
        expect(el.src).to.be('data:image/png;base64,' + source);
        expect(el.localName).to.be('img');
        expect(el.innerHTML).to.be('');

        source = 'R0lGODlhAQABAIAAAP///wAAACwAAAAAAQABAAACAkQBADs=';
        w = t.render({ mimetype: 'image/gif', source });
        el = w.node.firstChild as HTMLImageElement;
        expect(el.src).to.be('data:image/gif;base64,' + source);
        expect(el.localName).to.be('img');
        expect(el.innerHTML).to.be('');
      });

    });

  });

});
