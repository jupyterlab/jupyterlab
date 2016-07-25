// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  LatexRenderer, PDFRenderer, JavascriptRenderer,
  SVGRenderer, MarkdownRenderer, TextRenderer, HTMLRenderer, ImageRenderer
} from '../../../lib/renderers';


describe('renderers', () => {

  describe('TextRenderer', () => {

    it('should have the text/plain and jupyter/console-text mimetype', () => {
      let mimetypes = ['text/plain', 'application/vnd.jupyter.console-text'];
      let t = new TextRenderer();
      expect(t.mimetypes).to.eql(mimetypes);
    });

    it('should output the correct HTML', () => {
      let consoleText = 'x = 2 ** a';
      let t = new TextRenderer();
      let w = t.render('application/vnd.jupyter.console-text', consoleText);
      let el = w.node;
      expect(el.innerHTML).to.be('<pre>x = 2 ** a</pre>');
      expect(el.textContent).to.be(consoleText);
    });

    it('should output the correct HTML with ansi colors', () => {
      let text = 'There is no text but \x1b[01;41;32mtext\x1b[00m.\nWoo.';
      let plainText = 'There is no text but text.\nWoo.';
      let innerHTML = '<pre>There is no text but <span style="color:rgb(0, 255, 0);background-color:rgb(187, 0, 0)">text</span>.\nWoo.</pre>';
      let t = new TextRenderer();
      text = t.transform('application/vnd.jupyter.console-text', text);
      let w = t.render('application/vnd.jupyter.console-text', text);
      let el = w.node;
      expect(el.innerHTML).to.be(innerHTML);
      expect(el.textContent).to.be(plainText);
    });

  });


  describe('LatexRenderer', () => {

    it('should have the text/latex mimetype', () => {
      let t = new LatexRenderer();
      expect(t.mimetypes).to.eql(['text/latex']);
    });

    it('should output the correct MathJax script', () => {
      let mathJaxScript = '<script type="math/tex">\sum\limits_{i=0}^{\infty} \frac{1}{n^2}</script>';
      let t = new LatexRenderer();
      let w = t.render('text/latex', mathJaxScript);
      expect(w.node.innerHTML).to.be(mathJaxScript);
    });

  });

  describe('PDFRenderer', () => {

    it('should have the application/pdf mimetype', () => {
      let t = new PDFRenderer();
      expect(t.mimetypes).to.eql(['application/pdf']);
    });

    it('should output the correct HTML', () => {
      let base64PDF = "I don't have a b64'd PDF";
      let t = new PDFRenderer();
      let w = t.render('application/pdf', base64PDF);
      expect(w.node.innerHTML.indexOf('data:application/pdf')).to.not.be(-1);
    });

  });

  describe('JavascriptRenderer', () => {

    it('should have the text/javascript mimetype', () => {
      let mimetypes = ['text/javascript', 'application/javascript'];
      let t = new JavascriptRenderer();
      expect(t.mimetypes).to.eql(mimetypes);
    });

    it('should create a script tag', () => {
      let t = new JavascriptRenderer();
      let w = t.render('text/javascript', 'window.x = 1');
      let el = w.node.firstChild as HTMLElement;
      expect(el.localName).to.be('script');
      expect(el.textContent).to.be('window.x = 1');

      // Ensure script has not been run yet
      expect((window as any).x).to.be(void 0);
      // Put it on the DOM
      w.attach(document.body);
      // Should be evaluated now
      expect((window as any).x).to.be(1);
      w.dispose();
    });

  });


  describe('SVGRenderer', () => {

    it('should have the image/svg+xml mimetype', () => {
      let t = new SVGRenderer();
      expect(t.mimetypes).to.eql(['image/svg+xml']);
    });

    it('should create an svg tag', () => {
      const svg = `
          <?xml version="1.0" standalone="no"?>
          <!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN"
          SYSTEM "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
          <svg></svg>
      `;
      let t = new SVGRenderer();
      let w = t.render('image/svg+xml', svg);
    });

  });

  describe('MarkdownRenderer', () => {

    it('should have the text/markdown mimetype', function() {
      let t = new MarkdownRenderer();
      expect(t.mimetypes).to.eql(['text/markdown']);
    });

    it('should create nice markup', (done) => {
      let md = require('../../../examples/filebrowser/sample.md');
      let t = new MarkdownRenderer();
      t.transform('text/markdown', md as string).then(text => {
        expect(text).to.be(`<h1 id="title-first-level">Title first level</h1>\n<h2 id="title-second-level">Title second Level</h2>\n<h3 id="title-third-level">Title third level</h3>\n<h4 id="h4">h4</h4>\n<h5 id="h5">h5</h5>\n<h6 id="h6">h6</h6>\n<h1 id="h1">h1</h1>\n<h2 id="h2">h2</h2>\n<h3 id="h3">h3</h3>\n<h4 id="h4">h4</h4>\n<h5 id="h6">h6</h5>\n<p>This is just a sample paragraph<br>You can look at different level of nested unorderd list ljbakjn arsvlasc asc asc awsc asc ascd ascd ascd asdc asc</p>\n<ul>\n<li>level 1<ul>\n<li>level 2</li>\n<li>level 2</li>\n<li>level 2<ul>\n<li>level 3</li>\n<li>level 3<ul>\n<li>level 4<ul>\n<li>level 5<ul>\n<li>level 6</li>\n</ul>\n</li>\n</ul>\n</li>\n</ul>\n</li>\n</ul>\n</li>\n<li>level 2</li>\n</ul>\n</li>\n<li>level 1</li>\n<li>level 1</li>\n<li>level 1<br>Ordered list</li>\n<li>level 1<ol>\n<li>level 1</li>\n<li>level 1<ol>\n<li>level 1</li>\n<li>level 1</li>\n<li>level 1<ol>\n<li>level 1</li>\n<li>level 1<ol>\n<li>level 1</li>\n<li>level 1</li>\n<li>level 1</li>\n</ol>\n</li>\n</ol>\n</li>\n</ol>\n</li>\n</ol>\n</li>\n<li>level 1</li>\n<li>level 1<br>some Horizontal line</li>\n</ul>\n<hr>\n<h2 id="and-another-one">and another one</h2>\n<p>Colons can be used to align columns.</p>\n<table>\n<thead>\n<tr>\n<th>Tables</th>\n<th style="text-align:center">Are</th>\n<th style="text-align:right">Cool</th>\n</tr>\n</thead>\n<tbody>\n<tr>\n<td>col 3 is</td>\n<td style="text-align:center">right-aligned</td>\n<td style="text-align:right">1600</td>\n</tr>\n<tr>\n<td>col 2 is</td>\n<td style="text-align:center">centered</td>\n<td style="text-align:right">12</td>\n</tr>\n<tr>\n<td>zebra stripes</td>\n<td style="text-align:center">are neat</td>\n<td style="text-align:right">1</td>\n</tr>\n</tbody>\n</table>\n<p>There must be at least 3 dashes separating each header cell.<br>The outer pipes (|) are optional, and you don&#39;t need to make the<br>raw Markdown line up prettily. You can also use inline Markdown.</p>\n`);
      }).then(done, done);
    });

  });

  describe('HTMLRenderer', () => {

    it('should have the text/html mimetype', () => {
      let t = new HTMLRenderer();
      expect(t.mimetypes).to.eql(['text/html']);
    });

    it('should create a div with all the passed in elements', () => {
      let t = new HTMLRenderer();
      const htmlText = '<h1>This is great</h1>';
      let w = t.render('text/html', htmlText);
      let el = w.node.firstChild as HTMLElement;
      expect(el.innerHTML).to.be('This is great');
    });

    it('should execute a script tag when attached', () => {
      const htmlText = '<script>window.y=3;</script>';
      let t = new HTMLRenderer();
      let w = t.render('text/html', htmlText);
      expect((window as any).y).to.be(void 0);
      w.attach(document.body);
      expect((window as any).y).to.be(3);
      w.dispose();
    });

  });

  describe('ImageRenderer', () => {

    it('should support multiple mimetypes', () => {
      let t = new ImageRenderer();
      expect(t.mimetypes).to.eql(['image/png', 'image/jpeg', 'image/gif']);
    });

    it('should create an <img> with the right mimetype', () => {
      const imageData = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      let t = new ImageRenderer();
      let w = t.render('image/png', imageData);
      let el = w.node.firstChild as HTMLImageElement;
      expect(el.src).to.be('data:image/png;base64,' + imageData);
      expect(el.localName).to.be('img');
      expect(el.innerHTML).to.be('');

      const imageData2 = 'R0lGODlhAQABAIAAAP///wAAACwAAAAAAQABAAACAkQBADs=';
      w = t.render('image/gif', imageData2);
      el = w.node.firstChild as HTMLImageElement;
      expect(el.src).to.be('data:image/gif;base64,' + imageData2);
      expect(el.localName).to.be('img');
      expect(el.innerHTML).to.be('');
    });

  });

});
