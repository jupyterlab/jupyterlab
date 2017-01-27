// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  toArray
} from 'phosphor/lib/algorithm/iteration';

import {
  JSONObject
} from 'phosphor/lib/algorithm/json';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
   TextRenderer
} from '../../../lib/renderers';

import {
  RenderMime
} from '../../../lib/rendermime';

import {
  defaultRenderMime, createFileContext
} from '../utils';


const RESOLVER: RenderMime.IResolver = createFileContext();


describe('rendermime/index', () => {

  let r: RenderMime;

  beforeEach(() => {
    r = defaultRenderMime();
  });

  describe('RenderMime', () => {

    describe('#constructor()', () => {

      it('should create a new rendermime instance', () => {
        expect(r instanceof RenderMime).to.be(true);
      });

    });

    describe('#resolver', () => {

      it('should be the resolver used by the rendermime', () => {
        expect(r.resolver).to.be(null);
        r.resolver = RESOLVER;
        expect(r.resolver).to.be(RESOLVER);
      });

    });

    describe('#pathHandler', () => {

      it('should be the path handler used by the rendermime', () => {
        expect(r.pathHandler).to.be(null);
        let handler = {
          handlePath: () => { /* no-op */ }
        };
        r.pathHandler = handler;
        expect(r.pathHandler).to.be(handler);
      });

    });

    describe('#mimeTypes()', () => {

      it('should get an iterator over the ordered list of mimetypes', () => {
        let mimetypes = r.mimetypes();
        expect(toArray(mimetypes).length).to.be.above(0);
      });

    });

    describe('#render()', () => {

      it('should render a mimebundle', () => {
        let w = r.render({ bundle: { 'text/plain': 'foo' } });
        expect(w instanceof Widget).to.be(true);
      });

      it('should return `undefined` for an unregistered mime type', () => {
        let value = r.render({ bundle: { 'text/fizz': 'buzz' } });
        expect(value).to.be(void 0);
      });

      it('should render with the mimetype of highest precidence', () => {
        let bundle: RenderMime.MimeMap<string> = {
          'text/plain': 'foo',
          'text/html': '<h1>foo</h1>'
        };
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
        let w = r.render({ bundle, trusted: false });
        let el = w.node.firstChild as HTMLElement;
        expect(el.localName).to.be('img');
      });

      it('should render the mimetype that is sanitizable', () => {
        let bundle: RenderMime.MimeMap<string> = {
          'text/plain': 'foo',
          'text/html': '<h1>foo</h1>'
        };
        let w = r.render({ bundle, trusted: false });
        let el = w.node.firstChild as HTMLElement;
        expect(el.localName).to.be('h1');
      });

      it('should sanitize html', () => {
        let bundle: RenderMime.MimeMap<string> = {
          'text/html': '<h1>foo <script>window.x=1></scrip></h1>'
        };
        let widget = r.render({ bundle });
        expect(widget.node.innerHTML).to.be('<h1>foo </h1>');
      });

      it('should render json data', () => {
        let bundle: RenderMime.MimeMap<JSONObject> = {
          'application/json': { 'foo': 1 }
        };
        let widget = r.render({ bundle });
        expect(widget.node.textContent).to.be('{\n  "foo": 1\n}');
      });

      it('should accept an injector', () => {
        let called = 0;
        let injector = (mimetype: string, value: string | JSONObject) => {
          if (mimetype === 'text/plain') {
            expect(value as string).to.be('foo');
            called++;
          } else if (mimetype === 'application/json') {
            expect((value as JSONObject)['foo']).to.be(1);
            called++;
          }
        };
        let bundle: RenderMime.MimeMap<string> = {
          'foo/bar': '1'
        };
        r.render({ bundle, injector });
        expect(called).to.be(2);
      });

      it('should send a url resolver', (done) => {
        let bundle: RenderMime.MimeMap<string> = {
          'text/html': '<img src="./foo">foo</img>'
        };
        let called = false;
        r.resolver = {
          resolveUrl: (path: string) => {
            called = true;
            return Promise.resolve(path);
          },
          getDownloadUrl: (path: string) => {
            expect(called).to.be(true);
            done();
            return Promise.resolve(path);
          }
        };
        r.render({ bundle, trusted: true });
      });

      it('should send a path handler', (done) => {
        let bundle: RenderMime.MimeMap<string> = {
          'text/html': '<a href="./foo/bar.txt">foo</a>'
        };
        r.resolver = RESOLVER;
        r.pathHandler = {
          handlePath: (node: HTMLElement, path: string) => {
            expect(path).to.be('foo/bar.txt');
            done();
          }
        };
        r.render({ bundle, trusted: true });
      });

    });

    describe('#preferredMimetype()', () => {

      it('should find the preferred mimetype in a bundle', () => {
        let bundle: RenderMime.MimeMap<string> = {
          'text/plain': 'foo',
          'text/html': '<h1>foo</h1>'
        };
        expect(r.preferredMimetype(bundle)).to.be('text/html');
      });

      it('should return `undefined` if there are no registered mimetypes', () => {
        expect(r.preferredMimetype({ 'text/fizz': 'buzz' })).to.be(void 0);
      });

      it('should select the mimetype that is safe', () => {
        let bundle: RenderMime.MimeMap<string> = {
          'text/plain': 'foo',
          'text/javascript': 'window.x = 1',
          'image/png': 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
        };
        expect(r.preferredMimetype(bundle)).to.be('image/png');
      });

      it('should render the mimetype that is sanitizable', () => {
        let bundle: RenderMime.MimeMap<string> = {
          'text/plain': 'foo',
          'text/html': '<h1>foo</h1>'
        };
        expect(r.preferredMimetype(bundle)).to.be('text/html');
      });
    });

    describe('#clone()', () => {

      it('should clone the rendermime instance with shallow copies of data', () => {
        let c = r.clone();
        expect(toArray(c.mimetypes())).to.eql(toArray(r.mimetypes()));
        let t = new TextRenderer();
        c.addRenderer('text/foo', t);
        expect(r).to.not.be(c);
      });

    });

    describe('#addRenderer()', () => {

      it('should add a renderer by mimetype', () => {
        let t = new TextRenderer();
        r.addRenderer('text/foo', t);
        let index = toArray(r.mimetypes()).indexOf('text/foo');
        expect(index).to.be(0);
      });

      it('should take an optional order index', () => {
        let t = new TextRenderer();
        let len = toArray(r.mimetypes()).length;
        r.addRenderer('text/foo', t, 0);
        let index = toArray(r.mimetypes()).indexOf('text/foo');
        expect(index).to.be(0);
        expect(toArray(r.mimetypes()).length).to.be(len + 1);
      });

    });

    describe('#removeRenderer()', () => {

      it('should remove a renderer by mimetype', () => {
        r.removeRenderer('text/html');
        let bundle: RenderMime.MimeMap<string> = {
          'text/html': '<h1>foo</h1>'
        };
        expect(r.preferredMimetype(bundle)).to.be(void 0);
      });

      it('should be a no-op if the mimetype is not registered', () => {
        r.removeRenderer('text/foo');
      });

    });

    describe('#getRenderer()', () => {

      it('should get a renderer by mimetype', () => {
        expect(r.getRenderer('text/plain')).to.be.a(TextRenderer);
      });

      it('should return undefined for missing mimetype', () => {
        expect(r.getRenderer('hello/world')).to.be(undefined);
      });

    });

    describe('#mimetypes()', () => {

      it('should get the ordered list of mimetypes', () => {
        expect(toArray(r.mimetypes()).indexOf('text/html')).to.not.be(-1);
      });

    });

  });

});
