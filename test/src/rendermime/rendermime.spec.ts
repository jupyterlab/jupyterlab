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
  MimeModel, IRenderMime, RenderedText, RenderMime
} from '@jupyterlab/rendermime';

import {
  defaultRenderMime, createFileContext
} from '../utils';


const RESOLVER: IRenderMime.IResolver = createFileContext();


function createModel(data: JSONObject): IRenderMime.IMimeModel {
  return new MimeModel({ data });
}

const fooFactory: IRenderMime.IRendererFactory  = {
  mimeTypes: ['text/foo'],
  safe: true,
  createRenderer: options => new RenderedText(options)
};


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
        let clone = r.clone({ resolver: RESOLVER });
        expect(clone.resolver).to.be(RESOLVER);
      });

    });

    describe('#linkHandler', () => {

      it('should be the link handler used by the rendermime', () => {
        expect(r.linkHandler).to.be(null);
        let handler = {
          handleLink: () => { /* no-op */ }
        };
        let clone = r.clone({ linkHandler: handler });
        expect(clone.linkHandler).to.be(handler);
      });

    });

    describe('#createRenderer()', () => {

      it('should create a mime renderer', () => {
        let w = r.createRenderer('text/plain');
        expect(w instanceof Widget).to.be(true);
      });

      it('should raise an error for an unregistered mime type', () => {
        expect(() => { r.createRenderer('text/fizz'); }).to.throwError();
      });

      it('should render json data', () => {
        let model = createModel({
          'application/json': { 'foo': 1 }
        });
        let w = r.createRenderer('application/json');
        return w.renderModel(model).then(() => {
          expect(w.node.textContent).to.be('{\n  "foo": 1\n}');
        });
      });

      it('should send a url resolver', (done) => {
        let model = createModel({
          'text/html': '<img src="./foo">foo</img>'
        });
        let called = false;
        r = r.clone({
          resolver: {
            resolveUrl: (path: string) => {
              called = true;
              return Promise.resolve(path);
            },
            getDownloadUrl: (path: string) => {
              expect(called).to.be(true);
              done();
              return Promise.resolve(path);
            }
          }
        });
        let w = r.createRenderer('text/html');
        w.renderModel(model);
      });

      it('should send a link handler', (done) => {
        let model = createModel({
          'text/html': '<a href="./foo/bar.txt">foo</a>'
        });
        r = r.clone({
          resolver: RESOLVER,
          linkHandler:  {
            handleLink: (node: HTMLElement, url: string) => {
              expect(url).to.be('foo/bar.txt');
              done();
            }
          }
        });
        let w = r.createRenderer('text/html');
        w.renderModel(model);
      });
    });

    describe('#preferredMimeType()', () => {

      it('should find the preferred mimeType in a bundle', () => {
        let model = createModel({
          'text/plain': 'foo',
          'text/html': '<h1>foo</h1>'
        });
        expect(r.preferredMimeType(model.data, false)).to.be('text/html');
      });

      it('should return `undefined` if there are no registered mimeTypes', () => {
        let model = createModel({ 'text/fizz': 'buzz' });
        expect(r.preferredMimeType(model.data, false)).to.be(void 0);
      });

      it('should select the mimeType that is safe', () => {
        let model = createModel({
          'text/plain': 'foo',
          'text/javascript': 'window.x = 1',
          'image/png': 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
        });
        expect(r.preferredMimeType(model.data, true)).to.be('image/png');
      });

      it('should render the mimeType that is sanitizable', () => {
        let model = createModel({
          'text/plain': 'foo',
          'text/html': '<h1>foo</h1>'
        });
        expect(r.preferredMimeType(model.data, true)).to.be('text/html');
      });
    });

    describe('#clone()', () => {

      it('should clone the rendermime instance with shallow copies of data', () => {
        let c = r.clone();
        expect(toArray(c.mimeTypes)).to.eql(r.mimeTypes);
        c.addFactory(fooFactory);
        expect(r).to.not.be(c);
      });

    });

    describe('#addFactory()', () => {

      it('should add a factory', () => {
        r.addFactory(fooFactory);
        let index = r.mimeTypes.indexOf('text/foo');
        expect(index).to.be(r.mimeTypes.length - 1);
      });

      it('should take an optional rank', () => {
        let len = r.mimeTypes.length;
        r.addFactory(fooFactory, 0);
        let index = r.mimeTypes.indexOf('text/foo');
        expect(index).to.be(0);
        expect(r.mimeTypes.length).to.be(len + 1);
      });

    });

    describe('#removeFactory()', () => {

      it('should remove a factory by mimeType', () => {
        r.removeFactory('text/html');
        let model = createModel({ 'text/html': '<h1>foo</h1>' });
        expect(r.preferredMimeType(model.data, true)).to.be(void 0);
      });

      it('should be a no-op if the mimeType is not registered', () => {
        r.removeFactory('text/foo');
      });

    });

    describe('#getFactory()', () => {

      it('should get a factory by mimeType', () => {
        let f = r.getFactory('text/plain');
        expect(f.mimeTypes).to.contain('text/plain');
      });

      it('should return undefined for missing mimeType', () => {
        expect(r.getFactory('hello/world')).to.be(undefined);
      });

    });

    describe('#mimeTypes', () => {

      it('should get the ordered list of mimeTypes', () => {
        expect(r.mimeTypes.indexOf('text/html')).to.not.be(-1);
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
