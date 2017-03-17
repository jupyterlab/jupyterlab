// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  Contents, ServiceManager, Session
} from '@jupyterlab/services';

import {
  toArray
} from '@phosphor/algorithm';

import {
  JSONObject
} from '@phosphor/coreutils';

import {
  Widget
} from '@phosphor/widgets';

import {
   TextRenderer
} from '@jupyterlab/rendermime';

import {
  MimeModel, RenderMime
} from '@jupyterlab/rendermime';

import {
  defaultRenderMime, createFileContext
} from '../utils';


const RESOLVER: RenderMime.IResolver = createFileContext();


function createModel(data: JSONObject, trusted=false): RenderMime.IMimeModel {
  return new MimeModel({ data, trusted });
}


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

    describe('#linkHandler', () => {

      it('should be the link handler used by the rendermime', () => {
        expect(r.linkHandler).to.be(null);
        let handler = {
          handleLink: () => { /* no-op */ }
        };
        r.linkHandler = handler;
        expect(r.linkHandler).to.be(handler);
      });

    });

    describe('#mimeTypes()', () => {

      it('should get an iterator over the ordered list of mimeTypes', () => {
        let mimeTypes = r.mimeTypes();
        expect(toArray(mimeTypes).length).to.be.above(0);
      });

    });

    describe('#render()', () => {

      it('should render a mimebundle', () => {
        let model = createModel({ 'text/plain': 'foo' });
        let w = r.render(model);
        expect(w instanceof Widget).to.be(true);
      });

      it('should return a placeholder for an unregistered mime type', () => {
        let model = createModel({ 'text/fizz': 'buzz' });
        let value = r.render(model);
        expect(value).to.be.a(Widget);
      });

      it('should render with the mimeType of highest precidence', () => {
        let model = createModel({
          'text/plain': 'foo',
          'text/html': '<h1>foo</h1>'
        }, true);
        let w = r.render(model);
        let el = w.node.firstChild as HTMLElement;
        expect(el.localName).to.be('h1');
      });

      it('should render the mimeType that is safe', () => {
        let model = createModel({
          'text/plain': 'foo',
          'text/javascript': 'window.x = 1',
          'image/png': 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
        });
        let w = r.render(model);
        let el = w.node.firstChild as HTMLElement;
        expect(el.localName).to.be('img');
      });

      it('should render the mimeType that is sanitizable', () => {
        let model = createModel({
          'text/plain': 'foo',
          'text/html': '<h1>foo</h1>'
        });
        let w = r.render(model);
        let el = w.node.firstChild as HTMLElement;
        expect(el.localName).to.be('h1');
      });

      it('should sanitize html', () => {
        let model = createModel({
          'text/html': '<h1>foo <script>window.x=1></scrip></h1>'
        });
        let widget = r.render(model);
        expect(widget.node.innerHTML).to.be('<h1>foo </h1>');
      });

      it('should render json data', () => {
        let model = createModel({
          'application/json': { 'foo': 1 }
        });
        let widget = r.render(model);
        expect(widget.node.textContent).to.be('{\n  "foo": 1\n}');
      });

      it('should handle an injection', () => {
        let called = false;
        let model = createModel({ 'test/injector': 'foo' });
        model.data.changed.connect((sender, args) => {
          expect(args.key).to.be('application/json');
          called = true;
        });
        r.render(model);
        expect(called).to.be(true);
      });

      it('should send a url resolver', (done) => {
        let model = createModel({
          'text/html': '<img src="./foo">foo</img>'
        }, true);
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
        r.render(model);
      });

      it('should send a link handler', (done) => {
        let model = createModel({
          'text/html': '<a href="./foo/bar.txt">foo</a>'
        }, true);
        r.resolver = RESOLVER;
        r.linkHandler = {
          handleLink: (node: HTMLElement, url: string) => {
            expect(url).to.be('foo/bar.txt');
            done();
          }
        };
        r.render(model);
      });

    });

    describe('#preferredMimeType()', () => {

      it('should find the preferred mimeType in a bundle', () => {
        let model = createModel({
          'text/plain': 'foo',
          'text/html': '<h1>foo</h1>'
        });
        expect(r.preferredMimeType(model)).to.be('text/html');
      });

      it('should return `undefined` if there are no registered mimeTypes', () => {
        let model = createModel({ 'text/fizz': 'buzz' });
        expect(r.preferredMimeType(model)).to.be(void 0);
      });

      it('should select the mimeType that is safe', () => {
        let model = createModel({
          'text/plain': 'foo',
          'text/javascript': 'window.x = 1',
          'image/png': 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
        });
        expect(r.preferredMimeType(model)).to.be('image/png');
      });

      it('should render the mimeType that is sanitizable', () => {
        let model = createModel({
          'text/plain': 'foo',
          'text/html': '<h1>foo</h1>'
        });
        expect(r.preferredMimeType(model)).to.be('text/html');
      });
    });

    describe('#clone()', () => {

      it('should clone the rendermime instance with shallow copies of data', () => {
        let c = r.clone();
        expect(toArray(c.mimeTypes())).to.eql(toArray(r.mimeTypes()));
        let renderer = new TextRenderer();
        c.addRenderer({ mimeType: 'text/foo', renderer });
        expect(r).to.not.be(c);
      });

    });

    describe('#addRenderer()', () => {

      it('should add a renderer by mimeType', () => {
        let renderer = new TextRenderer();
        r.addRenderer({ mimeType: 'text/foo', renderer });
        let index = toArray(r.mimeTypes()).indexOf('text/foo');
        expect(index).to.be(0);
      });

      it('should take an optional order index', () => {
        let renderer = new TextRenderer();
        let len = toArray(r.mimeTypes()).length;
        r.addRenderer({ mimeType: 'text/foo', renderer }, 0);
        let index = toArray(r.mimeTypes()).indexOf('text/foo');
        expect(index).to.be(0);
        expect(toArray(r.mimeTypes()).length).to.be(len + 1);
      });

    });

    describe('#removeRenderer()', () => {

      it('should remove a renderer by mimeType', () => {
        r.removeRenderer('text/html');
        let model = createModel({ 'text/html': '<h1>foo</h1>' });
        expect(r.preferredMimeType(model)).to.be(void 0);
      });

      it('should be a no-op if the mimeType is not registered', () => {
        r.removeRenderer('text/foo');
      });

    });

    describe('#getRenderer()', () => {

      it('should get a renderer by mimeType', () => {
        expect(r.getRenderer('text/plain')).to.be.a(TextRenderer);
      });

      it('should return undefined for missing mimeType', () => {
        expect(r.getRenderer('hello/world')).to.be(undefined);
      });

    });

    describe('#mimeTypes()', () => {

      it('should get the ordered list of mimeTypes', () => {
        expect(toArray(r.mimeTypes()).indexOf('text/html')).to.not.be(-1);
      });

    });

    describe('.UrlResolver', () => {
      let resolver: RenderMime.UrlResolver;
      let contents: Contents.IManager;
      let session: Session.ISession;

      before((done) => {
        const manager = new ServiceManager();
        contents = manager.contents;
        manager.ready.then(() => {
          return manager.sessions.startNew({ path: './urlresolver' });
        }).then(s => {
          session = s;
          resolver = new RenderMime.UrlResolver({
            session,
            contents: manager.contents
          });
        }).then(done, done);
      });

      after((done) => {
        session.kernel.ready.then(() => {
          return session.shutdown();
        }).then(done, done);
      });

      context('#constructor', () => {

        it('should create a UrlResolver instance', () => {
          expect(resolver).to.be.a(RenderMime.UrlResolver);
        });

      });

      context('#resolveUrl()', () => {

        it('should resolve a relative url', (done) => {
          resolver.resolveUrl('./foo').then(path => {
            expect(path).to.be('foo');
          }).then(done, done);
        });

        it('should ignore urls that have a protocol', (done) => {
          resolver.resolveUrl('http://foo').then(path => {
            expect(path).to.be('http://foo');
            done();
          }).catch(done);
        });

      });

      context('#getDownloadUrl()', () => {

        it('should resolve an absolute server url to a download url', (done) => {
          let contextPromise = resolver.getDownloadUrl('foo');
          let contentsPromise = contents.getDownloadUrl('foo');
          Promise.all([contextPromise, contentsPromise])
          .then(values => {
            expect(values[0]).to.be(values[1]);
            done();
          }).catch(done);
        });

        it('should ignore urls that have a protocol', (done) => {
          resolver.getDownloadUrl('http://foo').then(path => {
            expect(path).to.be('http://foo');
            done();
          }).catch(done);
        });

      });

    });

  });


});
