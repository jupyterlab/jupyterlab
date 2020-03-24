// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { UUID, JSONObject } from '@lumino/coreutils';

import { Contents, Drive, ServiceManager, Session } from '@jupyterlab/services';

import { toArray } from '@lumino/algorithm';

import { PageConfig } from '@jupyterlab/coreutils';

import { Widget } from '@lumino/widgets';

import { SessionContext } from '@jupyterlab/apputils';

import { MathJaxTypesetter } from '@jupyterlab/mathjax2';

import {
  MimeModel,
  IRenderMime,
  RenderedText,
  RenderMimeRegistry
} from '@jupyterlab/rendermime';

import {
  defaultRenderMime,
  createFileContextWithKernel
} from '@jupyterlab/testutils';

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
  let RESOLVER: IRenderMime.IResolver;

  before(async () => {
    let fileContext = await createFileContextWithKernel();
    await fileContext.initialize(true);

    // The context initialization kicks off a sessionContext initialization,
    // but does not wait for it. We need to wait for it so our url resolver
    // has access to the session.
    await fileContext.sessionContext.initialize();
    RESOLVER = fileContext.urlResolver;
  });

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
        const args = {
          url: PageConfig.getOption('mathjaxUrl'),
          config: PageConfig.getOption('mathjaxConfig')
        };
        const typesetter1 = new MathJaxTypesetter(args);
        const clone1 = r.clone({ latexTypesetter: typesetter1 });
        expect(clone1.latexTypesetter).to.equal(typesetter1);
        const typesetter2 = new MathJaxTypesetter(args);
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
          'text/html': '<img src="./foo%2520">foo</img>'
        });
        let called0 = false;
        let called1 = false;
        r = r.clone({
          resolver: {
            resolveUrl: (url: string) => {
              called0 = true;
              return Promise.resolve(url);
            },
            getDownloadUrl: (url: string) => {
              expect(called0).to.equal(true);
              called1 = true;
              expect(url).to.equal('./foo%2520');
              return Promise.resolve(url);
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

      it('should send decoded paths to link handler', async () => {
        const model = createModel({
          'text/html': '<a href="foo%2520/b%C3%A5r.txt">foo</a>'
        });
        let called = false;
        r = r.clone({
          resolver: RESOLVER,
          linkHandler: {
            handleLink: (node: HTMLElement, path: string) => {
              expect(path).to.equal('foo%20/bår.txt');
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
        const f = r.getFactory('text/plain')!;
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
      let manager: ServiceManager;
      let resolverSession: RenderMimeRegistry.UrlResolver;
      let resolverPath: RenderMimeRegistry.UrlResolver;
      let contents: Contents.IManager;
      let session: Session.ISessionConnection;
      const pathParent = 'has%20üni';
      const urlParent = encodeURI(pathParent);
      const path = pathParent + '/pr%25 ' + UUID.uuid4();

      before(async () => {
        manager = new ServiceManager({ standby: 'never' });
        const drive = new Drive({ name: 'extra' });
        contents = manager.contents;
        contents.addDrive(drive);
        await manager.ready;
        session = await manager.sessions.startNew({
          name: '',
          path: path,
          type: 'test'
        });
        resolverSession = new RenderMimeRegistry.UrlResolver({
          session,
          contents: manager.contents
        });
        resolverPath = new RenderMimeRegistry.UrlResolver({
          path: path,
          contents: manager.contents
        });
      });

      after(() => {
        return session.shutdown();
      });

      context('#constructor', () => {
        it('should create a UrlResolver instance', () => {
          expect(resolverSession).to.be.an.instanceof(
            RenderMimeRegistry.UrlResolver
          );
          expect(resolverPath).to.be.an.instanceof(
            RenderMimeRegistry.UrlResolver
          );
        });
      });

      context('.path', () => {
        it('should give precedence to the explicit path over the session', async () => {
          const resolver = new RenderMimeRegistry.UrlResolver({
            session: new SessionContext({
              sessionManager: manager.sessions,
              specsManager: manager.kernelspecs,
              path: pathParent + '/pr%25 ' + UUID.uuid4(),
              kernelPreference: { canStart: false, shouldStart: false }
            }),
            contents: manager.contents,
            path: '/some/path/file.txt'
          });
          expect(await resolver.resolveUrl('./foo')).to.equal('some/path/foo');
        });

        it('should fall back to the session path if only the session is given', () => {
          expect(resolverSession.path).to.equal(path);
        });

        it('should allow the path to be changed', async () => {
          const resolver = new RenderMimeRegistry.UrlResolver({
            session: new SessionContext({
              sessionManager: manager.sessions,
              specsManager: manager.kernelspecs,
              path: pathParent + '/pr%25 ' + UUID.uuid4(),
              kernelPreference: { canStart: false, shouldStart: false }
            }),
            contents: manager.contents
          });
          resolver.path = '/some/path/file.txt';
          expect(await resolver.resolveUrl('./foo')).to.equal('some/path/foo');
          const resolver2 = new RenderMimeRegistry.UrlResolver({
            path: '/some/path/file.txt',
            contents: manager.contents
          });
          resolver2.path = '/other/path/file.txt';
          expect(await resolver2.resolveUrl('./foo')).to.equal(
            'other/path/foo'
          );
        });
      });

      context('#resolveUrl()', () => {
        it('should resolve a relative url', async () => {
          expect(await resolverSession.resolveUrl('./foo')).to.equal(
            urlParent + '/foo'
          );
          expect(await resolverPath.resolveUrl('./foo')).to.equal(
            urlParent + '/foo'
          );
        });

        it('should resolve a relative url with no active session', async () => {
          const resolver = new RenderMimeRegistry.UrlResolver({
            session: new SessionContext({
              sessionManager: manager.sessions,
              specsManager: manager.kernelspecs,
              path: pathParent + '/pr%25 ' + UUID.uuid4(),
              kernelPreference: { canStart: false, shouldStart: false }
            }),
            contents: manager.contents
          });
          const path = await resolver.resolveUrl('./foo');
          expect(path).to.equal(urlParent + '/foo');
        });

        it('should ignore urls that have a protocol', async () => {
          expect(await resolverSession.resolveUrl('http://foo')).to.equal(
            'http://foo'
          );
          expect(await resolverPath.resolveUrl('http://foo')).to.equal(
            'http://foo'
          );
        });

        it('should resolve URLs with escapes', async () => {
          expect(await resolverSession.resolveUrl('has%20space')).to.equal(
            urlParent + '/has%20space'
          );
          expect(await resolverPath.resolveUrl('has%20space')).to.equal(
            urlParent + '/has%20space'
          );
        });
      });

      context('#getDownloadUrl()', () => {
        it('should resolve an absolute server url to a download url', async () => {
          const contextPromise = resolverPath.getDownloadUrl('foo');
          const contentsPromise = contents.getDownloadUrl('foo');
          const values = await Promise.all([contextPromise, contentsPromise]);
          expect(values[0]).to.equal(values[1]);
        });

        it('should resolve escapes correctly', async () => {
          const contextPromise = resolverPath.getDownloadUrl('foo%2520test');
          const contentsPromise = contents.getDownloadUrl('foo%20test');
          const values = await Promise.all([contextPromise, contentsPromise]);
          expect(values[0]).to.equal(values[1]);
        });

        it('should ignore urls that have a protocol', async () => {
          const path = await resolverPath.getDownloadUrl('http://foo');
          expect(path).to.equal('http://foo');
        });
      });

      context('#isLocal', () => {
        it('should return true for a registered IDrive`', () => {
          expect(resolverPath.isLocal('extra:path/to/file')).to.equal(true);
        });

        it('should return false for an unrecognized Drive`', () => {
          expect(resolverPath.isLocal('unregistered:path/to/file')).to.equal(
            false
          );
        });

        it('should return true for a normal filesystem-like path`', () => {
          expect(resolverPath.isLocal('path/to/file')).to.equal(true);
        });
      });
    });
  });
});
