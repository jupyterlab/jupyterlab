// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { UUID } from '@phosphor/coreutils';

import { Contents, Drive, ServiceManager, Session } from '@jupyterlab/services';

import { toArray } from '@phosphor/algorithm';

import { JSONObject } from '@phosphor/coreutils';

import { Widget } from '@phosphor/widgets';

import { MathJaxTypesetter } from '@jupyterlab/mathjax2-extension';

import {
  MimeModel,
  IRenderMime,
  RenderedText,
  RenderMimeRegistry
} from '@jupyterlab/rendermime';

import { defaultRenderMime, createFileContext } from '@jupyterlab/testutils';

const RESOLVER: IRenderMime.IResolver = createFileContext().urlResolver;

function createModel(data: JSONObject): IRenderMime.IMimeModel {
  return new MimeModel({ data });
}

const fooFactory: IRenderMime.IRendererFactory = {
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
        expect(r instanceof RenderMimeRegistry).to.equal(true);
      });
    });

    describe('#resolver', () => {
      it('should be the resolver used by the rendermime', () => {
        expect(r.resolver).to.be.null;
        const clone = r.clone({ resolver: RESOLVER });
        expect(clone.resolver).to.equal(RESOLVER);
      });
    });

    describe('#linkHandler', () => {
      it('should be the link handler used by the rendermime', () => {
        expect(r.linkHandler).to.be.null;
        const handler = {
          handleLink: () => {
            /* no-op */
          }
        };
        const clone = r.clone({ linkHandler: handler });
        expect(clone.linkHandler).to.equal(handler);
      });
    });

    describe('#latexTypesetter', () => {
      it('should be the null typesetter by default', () => {
        expect(r.latexTypesetter).to.be.null;
      });

      it('should be clonable', () => {
        const typesetter1 = new MathJaxTypesetter();
        const clone1 = r.clone({ latexTypesetter: typesetter1 });
        expect(clone1.latexTypesetter).to.equal(typesetter1);
        const typesetter2 = new MathJaxTypesetter();
        const clone2 = r.clone({ latexTypesetter: typesetter2 });
        expect(clone2.latexTypesetter).to.equal(typesetter2);
      });
    });

    describe('#createRenderer()', () => {
      it('should create a mime renderer', () => {
        const w = r.createRenderer('text/plain');
        expect(w instanceof Widget).to.equal(true);
      });

      it('should raise an error for an unregistered mime type', () => {
        expect(() => {
          r.createRenderer('text/fizz');
        }).to.throw();
      });

      it('should render json data', async () => {
        const model = createModel({
          'application/json': { foo: 1 }
        });
        const w = r.createRenderer('application/json');
        await w.renderModel(model);
        expect(w.node.textContent).to.equal('{\n  "foo": 1\n}');
      });

      it('should send a url resolver', async () => {
        const model = createModel({
          'text/html': '<img src="./foo">foo</img>'
        });
        let called0 = false;
        let called1 = false;
        r = r.clone({
          resolver: {
            resolveUrl: (path: string) => {
              called0 = true;
              return Promise.resolve(path);
            },
            getDownloadUrl: (path: string) => {
              expect(called0).to.equal(true);
              called1 = true;
              return Promise.resolve(path);
            }
          }
        });
        const w = r.createRenderer('text/html');
        await w.renderModel(model);
        expect(called1).to.equal(true);
      });

      it('should send a link handler', async () => {
        const model = createModel({
          'text/html': '<a href="./foo/bar.txt">foo</a>'
        });
        let called = false;
        r = r.clone({
          resolver: RESOLVER,
          linkHandler: {
            handleLink: (node: HTMLElement, url: string) => {
              expect(url).to.equal('foo/bar.txt');
              called = true;
            }
          }
        });
        const w = r.createRenderer('text/html');
        await w.renderModel(model);
        expect(called).to.equal(true);
      });
    });

    describe('#preferredMimeType()', () => {
      it('should find the preferred mimeType in a bundle', () => {
        const model = createModel({
          'text/plain': 'foo',
          'text/html': '<h1>foo</h1>'
        });
        expect(r.preferredMimeType(model.data, 'any')).to.equal('text/html');
      });

      it('should return `undefined` if there are no registered mimeTypes', () => {
        const model = createModel({ 'text/fizz': 'buzz' });
        expect(r.preferredMimeType(model.data, 'any')).to.be.undefined;
      });

      it('should select the mimeType that is safe', () => {
        const model = createModel({
          'text/plain': 'foo',
          'text/javascript': 'window.x = 1',
          'image/png':
            'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
        });
        expect(r.preferredMimeType(model.data)).to.equal('image/png');
      });

      it('should render the mimeType that is sanitizable', () => {
        const model = createModel({
          'text/plain': 'foo',
          'text/html': '<h1>foo</h1>'
        });
        expect(r.preferredMimeType(model.data)).to.equal('text/html');
      });

      it('should return `undefined` if only unsafe options with default `ensure`', () => {
        const model = createModel({
          'image/svg+xml': ''
        });
        expect(r.preferredMimeType(model.data)).to.be.undefined;
      });

      it('should return `undefined` if only unsafe options with `ensure`', () => {
        const model = createModel({
          'image/svg+xml': ''
        });
        expect(r.preferredMimeType(model.data, 'ensure')).to.be.undefined;
      });

      it('should return safe option if called with `prefer`', () => {
        const model = createModel({
          'image/svg+xml': '',
          'text/plain': ''
        });
        expect(r.preferredMimeType(model.data, 'prefer')).to.equal(
          'text/plain'
        );
      });

      it('should return unsafe option if called with `prefer`, and no safe alternative', () => {
        const model = createModel({
          'image/svg+xml': ''
        });
        expect(r.preferredMimeType(model.data, 'prefer')).to.equal(
          'image/svg+xml'
        );
      });
    });

    describe('#clone()', () => {
      it('should clone the rendermime instance with shallow copies of data', () => {
        const c = r.clone();
        expect(toArray(c.mimeTypes)).to.deep.equal(r.mimeTypes);
        c.addFactory(fooFactory);
        expect(r).to.not.equal(c);
      });
    });

    describe('#addFactory()', () => {
      it('should add a factory', () => {
        r.addFactory(fooFactory);
        const index = r.mimeTypes.indexOf('text/foo');
        expect(index).to.equal(r.mimeTypes.length - 1);
      });

      it('should take an optional rank', () => {
        const len = r.mimeTypes.length;
        r.addFactory(fooFactory, 0);
        const index = r.mimeTypes.indexOf('text/foo');
        expect(index).to.equal(0);
        expect(r.mimeTypes.length).to.equal(len + 1);
      });
    });

    describe('#removeMimeType()', () => {
      it('should remove a factory by mimeType', () => {
        r.removeMimeType('text/html');
        const model = createModel({ 'text/html': '<h1>foo</h1>' });
        expect(r.preferredMimeType(model.data, 'any')).to.be.undefined;
      });

      it('should be a no-op if the mimeType is not registered', () => {
        r.removeMimeType('text/foo');
      });
    });

    describe('#getFactory()', () => {
      it('should get a factory by mimeType', () => {
        const f = r.getFactory('text/plain');
        expect(f.mimeTypes).to.contain('text/plain');
      });

      it('should return undefined for missing mimeType', () => {
        expect(r.getFactory('hello/world')).to.be.undefined;
      });
    });

    describe('#mimeTypes', () => {
      it('should get the ordered list of mimeTypes', () => {
        expect(r.mimeTypes.indexOf('text/html')).to.not.equal(-1);
      });
    });

    describe('.UrlResolver', () => {
      let resolver: RenderMimeRegistry.UrlResolver;
      let contents: Contents.IManager;
      let session: Session.ISession;

      before(async () => {
        const manager = new ServiceManager();
        const drive = new Drive({ name: 'extra' });
        contents = manager.contents;
        contents.addDrive(drive);
        await manager.ready;
        session = await manager.sessions.startNew({ path: UUID.uuid4() });
        resolver = new RenderMimeRegistry.UrlResolver({
          session,
          contents: manager.contents
        });
      });

      after(() => {
        return session.shutdown();
      });

      context('#constructor', () => {
        it('should create a UrlResolver instance', () => {
          expect(resolver).to.be.an.instanceof(RenderMimeRegistry.UrlResolver);
        });
      });

      context('#resolveUrl()', () => {
        it('should resolve a relative url', async () => {
          const path = await resolver.resolveUrl('./foo');
          expect(path).to.equal('foo');
        });

        it('should ignore urls that have a protocol', async () => {
          const path = await resolver.resolveUrl('http://foo');
          expect(path).to.equal('http://foo');
        });
      });

      context('#getDownloadUrl()', () => {
        it('should resolve an absolute server url to a download url', async () => {
          const contextPromise = resolver.getDownloadUrl('foo');
          const contentsPromise = contents.getDownloadUrl('foo');
          const values = await Promise.all([contextPromise, contentsPromise]);
          expect(values[0]).to.equal(values[1]);
        });

        it('should ignore urls that have a protocol', async () => {
          const path = await resolver.getDownloadUrl('http://foo');
          expect(path).to.equal('http://foo');
        });
      });

      context('#isLocal', () => {
        it('should return true for a registered IDrive`', () => {
          expect(resolver.isLocal('extra:path/to/file')).to.equal(true);
        });

        it('should return false for an unrecognized Drive`', () => {
          expect(resolver.isLocal('unregistered:path/to/file')).to.equal(false);
        });

        it('should return true for a normal filesystem-like path`', () => {
          expect(resolver.isLocal('path/to/file')).to.equal(true);
        });
      });
    });
  });
});
