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
  latexRendererFactory, svgRendererFactory,
  markdownRendererFactory, textRendererFactory, htmlRendererFactory,
  imageRendererFactory
} from '@jupyterlab/rendermime';

import {
  MimeModel, IRenderMime
} from '@jupyterlab/rendermime';


function createModel(mimeType: string, source: JSONValue, trusted = false): IRenderMime.IMimeModel {
  let data: JSONObject = {};
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
        let mimeTypes = ['text/plain', 'application/vnd.jupyter.stdout',
               'application/vnd.jupyter.stderr'];
        expect(textRendererFactory.mimeTypes).to.eql(mimeTypes);
      });

    });

    describe('#safe', () => {

      it('should be safe', () => {
        expect(textRendererFactory.safe).to.be(true);
      });

    });

    describe('#createRenderer()', () => {

      it('should output the correct HTML', () => {
        let f = textRendererFactory;
        let mimeType = 'text/plain';
        let model = createModel(mimeType, 'x = 2 ** a');
        let w = f.createRenderer({ mimeType, ...defaultOptions });
        return w.renderModel(model).then(() => {
          expect(w.node.innerHTML).to.be('<pre>x = 2 ** a</pre>');
        });
      });

      it('should output the correct HTML with ansi colors', () => {
        let f = textRendererFactory;
        let source = 'There is no text but \x1b[01;41;32mtext\x1b[00m.\nWoo.';
        let mimeType = 'application/vnd.jupyter.console-text';
        let model = createModel(mimeType, source);
        let w = f.createRenderer({ mimeType, ...defaultOptions });
        return w.renderModel(model).then(() => {
          expect(w.node.innerHTML).to.be('<pre>There is no text but <span style="font-weight:bold" class="ansi-green-fg ansi-red-bg">text</span>.\nWoo.</pre>');
        });
      });

      it('should escape inline html', () => {
        let f = textRendererFactory;
        let source = 'There is no text <script>window.x=1</script> but \x1b[01;41;32mtext\x1b[00m.\nWoo.';
        let mimeType = 'application/vnd.jupyter.console-text';
        let model = createModel(mimeType, source);
        let w = f.createRenderer({ mimeType, ...defaultOptions });
        return w.renderModel(model).then(() => {
          expect(w.node.innerHTML).to.be('<pre>There is no text &lt;script&gt;window.x=1&lt;/script&gt; but <span style="font-weight:bold" class="ansi-green-fg ansi-red-bg">text</span>.\nWoo.</pre>');
        });
      });

    });

  });

  describe('latexRendererFactory', () => {

    describe('#mimeTypes', () => {

      it('should have the text/latex mimeType', () => {
        expect(latexRendererFactory.mimeTypes).to.eql(['text/latex']);
      });

    });

    describe('#safe', () => {

      it('should be safe', () => {
        expect(latexRendererFactory.safe).to.be(true);
      });

    });

    describe('#createRenderer()', () => {

      it('should set the textContent of the widget', () => {
        let source = '\sum\limits_{i=0}^{\infty} \frac{1}{n^2}';
        let f = latexRendererFactory;
        let mimeType = 'text/latex';
        let model = createModel(mimeType, source);
        let w = f.createRenderer({ mimeType, ...defaultOptions });
        return w.renderModel(model).then(() => {
          expect(w.node.textContent).to.be(source);
        });
      });

    });

  });

  describe('svgRendererFactory', () => {

    describe('#mimeTypes', () => {

      it('should have the image/svg+xml mimeType', () => {
        expect(svgRendererFactory.mimeTypes).to.eql(['image/svg+xml']);
      });

    });

    describe('#safe', () => {

      it('should not be safe', () => {
        expect(svgRendererFactory.safe).to.be(false);
      });

    });

    describe('#createRenderer()', () => {

      it('should create an img element with the svg inline', () => {
        const source = '<svg></svg>';
        let f = svgRendererFactory;
        let mimeType = 'image/svg+xml';
        let model = createModel(mimeType, source, true);
        let w = f.createRenderer({ mimeType, ...defaultOptions });
        return w.renderModel(model).then(() => {
          let imgEl = w.node.getElementsByTagName('img')[0];
          expect(imgEl).to.be.ok();
          expect(imgEl.src).to.contain(source);
        });
      });

    });

  });

  describe('markdownRendererFactory', () => {

    describe('#mimeTypes', () => {

      it('should have the text/markdown mimeType', function() {
        expect(markdownRendererFactory.mimeTypes).to.eql(['text/markdown']);
      });

    });

    describe('#safe', () => {

      it('should be safe', () => {
        expect(markdownRendererFactory.safe).to.be(true);
      });

    });

    describe('#createRenderer()', () => {

      it('should set the inner html', () => {
        let f = markdownRendererFactory;
        let source = '<p>hello</p>';
        let mimeType = 'text/markdown';
        let model = createModel(mimeType, source);
        let w = f.createRenderer({ mimeType, ...defaultOptions });
        return w.renderModel(model).then(() => {
          expect(w.node.innerHTML).to.be(source);
        });
      });

      it('should add header anchors', () => {
        let source = require('../../../examples/filebrowser/sample.md') as string;
        let f = markdownRendererFactory;
        let mimeType = 'text/markdown';
        let model = createModel(mimeType, source);
        let w = f.createRenderer({ mimeType, ...defaultOptions });
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
        let f = markdownRendererFactory;
        let source = '<p>hello</p><script>alert("foo")</script>';
        let mimeType = 'text/markdown';
        let model = createModel(mimeType, source);
        let w = f.createRenderer({ mimeType, ...defaultOptions });
        return w.renderModel(model).then(() => {
          expect(w.node.innerHTML).to.not.contain('script');
        });
      });

    });

  });

  describe('htmlRendererFactory', () => {

    describe('#mimeTypes', () => {

      it('should have the text/html mimeType', () => {
        expect(htmlRendererFactory.mimeTypes).to.eql(['text/html']);
      });

    });

    describe('#safe', () => {

      it('should be safe', () => {
        expect(htmlRendererFactory.safe).to.be(true);
      });

    });

    describe('#createRenderer()', () => {

      it('should set the inner HTML', () => {
        let f = htmlRendererFactory;
        const source = '<h1>This is great</h1>';
        let mimeType = 'text/html';
        let model = createModel(mimeType, source);
        let w = f.createRenderer({ mimeType, ...defaultOptions });
        return w.renderModel(model).then(() => {
          expect(w.node.innerHTML).to.be('<h1>This is great</h1>');
        });
      });

      // TODO we are disabling script execution for now.
      // it('should execute a script tag when attached', () => {
      //   const source = '<script>window.y=3;</script>';
      //   let f = htmlRendererFactory;
      //   let mimeType = 'text/html';
      //   let model = createModel(mimeType, source, true);
      //   let w = f.createRenderer({ mimeType, ...defaultOptions });
      //   return w.renderModel(model).then(() => {
      //     expect((window as any).y).to.be(void 0);
      //     Widget.attach(w, document.body);
      //     expect((window as any).y).to.be(3);
      //     w.dispose();
      //   });
      // });

      it('should sanitize when untrusted', () => {
        const source = '<pre><script>window.y=3;</script></pre>';
        let f = htmlRendererFactory;
        let mimeType = 'text/html';
        let model = createModel(mimeType, source);
        let w = f.createRenderer({ mimeType, ...defaultOptions });
        return w.renderModel(model).then(() => {
          expect(w.node.innerHTML).to.be('<pre></pre>');
        });
      });

    });

    it('should sanitize html', () => {
      let model = createModel('text/html', '<h1>foo <script>window.x=1></scrip></h1>');
      let f = htmlRendererFactory;
      let mimeType = 'text/html';
      let w = f.createRenderer({ mimeType, ...defaultOptions });
      return w.renderModel(model).then(() => {
        expect(w.node.innerHTML).to.be('<h1>foo </h1>');
      });
    });

  });

  describe('imageRendererFactory', () => {

    describe('#mimeTypes', () => {

      it('should support multiple mimeTypes', () => {
        expect(imageRendererFactory.mimeTypes).to.eql(['image/bmp', 'image/png', 'image/jpeg', 'image/gif']);
      });

    });

    describe('#safe', () => {

      it('should be safe', () => {
        expect(imageRendererFactory.safe).to.be(true);
      });

    });

    describe('#createRenderer()', () => {

      it('should create an <img> with the right mimeType', () => {
        let source = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        let f = imageRendererFactory;
        let mimeType = 'image/png';
        let model = createModel(mimeType, source);
        let w = f.createRenderer({ mimeType, ...defaultOptions  });

        return w.renderModel(model).then(() => {
          let el = w.node.firstChild as HTMLImageElement;
          expect(el.src).to.be('data:image/png;base64,' + source);
          expect(el.localName).to.be('img');
          expect(el.innerHTML).to.be('');

          source = 'R0lGODlhAQABAIAAAP///wAAACwAAAAAAQABAAACAkQBADs=';
          mimeType = 'image/gif';
          model = createModel(mimeType, source);
          w = f.createRenderer({ mimeType, ...defaultOptions });
          return w.renderModel(model);
        }).then(() => {
          let el = w.node.firstChild as HTMLImageElement;
          expect(el.src).to.be('data:image/gif;base64,' + source);
          expect(el.localName).to.be('img');
          expect(el.innerHTML).to.be('');
        });
      });

    });

  });

});
