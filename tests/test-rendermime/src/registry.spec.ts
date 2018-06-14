// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  uuid
} from '@jupyterlab/coreutils';

import {
  Contents, Drive, ServiceManager, Session
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
  MathJaxTypesetter
} from '@jupyterlab/mathjax2-extension';

import {
  MimeModel, IRenderMime, RenderedText, RenderMimeRegistry
} from '@jupyterlab/rendermime';

import {
  defaultRenderMime, createFileContext
} from '../../utils';


const RESOLVER: IRenderMime.IResolver = createFileContext().urlResolver;


function createModel(data: JSONObject): IRenderMime.IMimeModel {
  return new MimeModel({ data });
}

const fooFactory: IRenderMime.IRendererFactory  = {
  mimeTypes: ['text/foo'],
  safe: true,
  defaultRank: 1000,
  createRenderer: options => new RenderedText(options)
};


describe('rendermime/registry', () => {

  let r: RenderMimeRegistry;

  beforeEach(() => {
    r = defaultRenderMime();
  });

  describe('RenderMimeRegistry', () => {

    describe('#constructor()', () => {

      it('should create a new rendermime instance', () => {
        expect(r instanceof RenderMimeRegistry).to.be(true);
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

    describe('#latexTypesetter', () => {

      it('should be the null typesetter by default', () => {
        expect(r.latexTypesetter).to.be(null);
      });

      it('should be clonable', () => {
        let typesetter1 = new MathJaxTypesetter();
        let clone1 = r.clone({ latexTypesetter: typesetter1 });
        expect(clone1.latexTypesetter).to.be(typesetter1);
        let typesetter2 = new MathJaxTypesetter();
        let clone2 = r.clone({ latexTypesetter: typesetter2 });
        expect(clone2.latexTypesetter).to.be(typesetter2);
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
        expect(r.preferredMimeType(model.data, 'any')).to.be('text/html');
      });

      it('should return `undefined` if there are no registered mimeTypes', () => {
        let model = createModel({ 'text/fizz': 'buzz' });
        expect(r.preferredMimeType(model.data, 'any')).to.be(void 0);
      });

      it('should select the mimeType that is safe', () => {
        let model = createModel({
          'text/plain': 'foo',
          'text/javascript': 'window.x = 1',
          'image/png': 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
        });
        expect(r.preferredMimeType(model.data)).to.be('image/png');
      });

      it('should render the mimeType that is sanitizable', () => {
        let model = createModel({
          'text/plain': 'foo',
          'text/html': '<h1>foo</h1>'
        });
        expect(r.preferredMimeType(model.data)).to.be('text/html');
      });

      it('should return `undefined` if only unsafe options with default `ensure`', () => {
        let model = createModel({
          'image/svg+xml': '',
        });
        expect(r.preferredMimeType(model.data)).to.be(void 0);
      });

      it('should return `undefined` if only unsafe options with `ensure`', () => {
        let model = createModel({
          'image/svg+xml': '',
        });
        expect(r.preferredMimeType(model.data, 'ensure')).to.be(void 0);
      });

      it('should return safe option if called with `prefer`', () => {
        let model = createModel({
          'image/svg+xml': '',
          'text/plain': '',
        });
        expect(r.preferredMimeType(model.data, 'prefer')).to.be('text/plain');
      });

      it('should return unsafe option if called with `prefer`, and no safe alternative', () => {
        let model = createModel({
          'image/svg+xml': '',
        });
        expect(r.preferredMimeType(model.data, 'prefer')).to.be('image/svg+xml');
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

    describe('#removeMimeType()', () => {

      it('should remove a factory by mimeType', () => {
        r.removeMimeType('text/html');
        let model = createModel({ 'text/html': '<h1>foo</h1>' });
        expect(r.preferredMimeType(model.data, 'any')).to.be(void 0);
      });

      it('should be a no-op if the mimeType is not registered', () => {
        r.removeMimeType('text/foo');
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
      let resolver: RenderMimeRegistry.UrlResolver;
      let contents: Contents.IManager;
      let session: Session.ISession;

      before(() => {
        const manager = new ServiceManager();
        const drive = new Drive({ name: 'extra' });
        contents = manager.contents;
        contents.addDrive(drive);
        return manager.ready.then(() => {
          return manager.sessions.startNew({ path: uuid() });
        }).then(s => {
          session = s;
          resolver = new RenderMimeRegistry.UrlResolver({
            session,
            contents: manager.contents
          });
        });
      });

      after(() => {
        return session.shutdown();
      });

      context('#constructor', () => {

        it('should create a UrlResolver instance', () => {
          expect(resolver).to.be.a(RenderMimeRegistry.UrlResolver);
        });

      });

      context('#resolveUrl()', () => {

        it('should resolve a relative url', () => {
          return resolver.resolveUrl('./foo').then(path => {
            expect(path).to.be('foo');
          });
        });

        it('should ignore urls that have a protocol', () => {
          return resolver.resolveUrl('http://foo').then(path => {
            expect(path).to.be('http://foo');
          });
        });

      });

      context('#getDownloadUrl()', () => {

        it('should resolve an absolute server url to a download url', () => {
          let contextPromise = resolver.getDownloadUrl('foo');
          let contentsPromise = contents.getDownloadUrl('foo');
          return Promise.all([contextPromise, contentsPromise])
          .then(values => {
            expect(values[0]).to.be(values[1]);
          });
        });

        it('should ignore urls that have a protocol', () => {
          return resolver.getDownloadUrl('http://foo').then(path => {
            expect(path).to.be('http://foo');
          });
        });

      });

      context('#isLocal', () => {

        it('should return true for a registered IDrive`', () => {
          expect(resolver.isLocal('extra:path/to/file')).to.be(true);
        });

        it('should return false for an unrecognized Drive`', () => {
          expect(resolver.isLocal('unregistered:path/to/file')).to.be(false);
        });

        it('should return true for a normal filesystem-like path`', () => {
          expect(resolver.isLocal('path/to/file')).to.be(true);
        });

      });

    });

  });


});
