// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { MathJaxTypesetter } from '@jupyterlab/mathjax-extension';
import {
  IRenderMime,
  MimeModel,
  RenderedHTML,
  RenderedText,
  RenderMimeRegistry,
  standardRendererFactories
} from '@jupyterlab/rendermime';
import { Contents, Drive, ServiceManager, Session } from '@jupyterlab/services';
import { ServiceManagerMock } from '@jupyterlab/services/lib/testutils';
import { JSONObject, UUID } from '@lumino/coreutils';
import { Widget } from '@lumino/widgets';
import json2html from 'json-to-html';

class JSONRenderer extends RenderedHTML {
  mimeType = 'text/html';

  renderModel(model: IRenderMime.IMimeModel): Promise<void> {
    const source = model.data['application/json'];
    model.setData({ data: { 'text/html': json2html(source) } });
    return super.renderModel(model);
  }
}

const jsonRendererFactory = {
  mimeTypes: ['application/json'],
  safe: true,
  createRenderer(options: IRenderMime.IRendererOptions): IRenderMime.IRenderer {
    return new JSONRenderer(options);
  }
};

const defaultRenderMime = new RenderMimeRegistry({
  initialFactories: standardRendererFactories
});
defaultRenderMime.addFactory(jsonRendererFactory, 10);

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

  beforeAll(async () => {
    RESOLVER = new RenderMimeRegistry.UrlResolver({
      contents: ServiceManagerMock().contents,
      path: UUID.uuid4() + '.txt'
    });
  });

  beforeEach(() => {
    r = defaultRenderMime.clone();
  });

  describe('RenderMimeRegistry', () => {
    describe('#constructor()', () => {
      it('should create a new rendermime instance', () => {
        expect(r instanceof RenderMimeRegistry).toBe(true);
      });
    });

    describe('#resolver', () => {
      it('should be the resolver used by the rendermime', () => {
        expect(r.resolver).toBeNull();
        const clone = r.clone({ resolver: RESOLVER });
        expect(clone.resolver).toBe(RESOLVER);
      });
    });

    describe('#linkHandler', () => {
      it('should be the link handler used by the rendermime', () => {
        expect(r.linkHandler).toBeNull();
        const handler = {
          handleLink: () => {
            /* no-op */
          }
        };
        const clone = r.clone({ linkHandler: handler });
        expect(clone.linkHandler).toBe(handler);
      });
    });

    describe('#latexTypesetter', () => {
      it('should be the null typesetter by default', () => {
        expect(r.latexTypesetter).toBeNull();
      });

      it('should be clonable', () => {
        const typesetter1 = new MathJaxTypesetter();
        const clone1 = r.clone({ latexTypesetter: typesetter1 });
        expect(clone1.latexTypesetter).toBe(typesetter1);
        const typesetter2 = new MathJaxTypesetter();
        const clone2 = r.clone({ latexTypesetter: typesetter2 });
        expect(clone2.latexTypesetter).toBe(typesetter2);
      });
    });

    describe('#createRenderer()', () => {
      it('should create a mime renderer', () => {
        const w = r.createRenderer('text/plain');
        expect(w instanceof Widget).toBe(true);
      });

      it('should raise an error for an unregistered mime type', () => {
        expect(() => {
          r.createRenderer('text/fizz');
        }).toThrow();
      });

      it('should render json data', async () => {
        const model = createModel({
          'application/json': { foo: 1 }
        });
        const w = r.createRenderer('application/json');
        await w.renderModel(model);
        expect(w.node.textContent).toBe('{\n  "foo": 1\n}');
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
              expect(called0).toBe(true);
              called1 = true;
              expect(url).toBe('./foo%2520');
              return Promise.resolve(url);
            }
          }
        });
        const w = r.createRenderer('text/html');
        await w.renderModel(model);
        expect(called1).toBe(true);
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
              expect(url).toContain('foo/bar.txt');
              called = true;
            }
          }
        });
        const w = r.createRenderer('text/html');
        await w.renderModel(model);
        expect(called).toBe(true);
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
              expect(path).toContain('foo%20/bår.txt');
              called = true;
            }
          }
        });
        const w = r.createRenderer('text/html');
        await w.renderModel(model);
        expect(called).toBe(true);
      });
    });

    describe('#preferredMimeType()', () => {
      it('should find the preferred mimeType in a bundle', () => {
        const model = createModel({
          'text/plain': 'foo',
          'text/html': '<h1>foo</h1>'
        });
        expect(r.preferredMimeType(model.data, 'any')).toBe('text/html');
      });

      it('should return `undefined` if there are no registered mimeTypes', () => {
        const model = createModel({ 'text/fizz': 'buzz' });
        expect(r.preferredMimeType(model.data, 'any')).toBeUndefined();
      });

      it('should select the mimeType that is safe', () => {
        const model = createModel({
          'text/plain': 'foo',
          'text/javascript': 'window.x = 1',
          'image/png':
            'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
        });
        expect(r.preferredMimeType(model.data)).toBe('image/png');
      });

      it('should render the mimeType that is sanitizable', () => {
        const model = createModel({
          'text/plain': 'foo',
          'text/html': '<h1>foo</h1>'
        });
        expect(r.preferredMimeType(model.data)).toBe('text/html');
      });

      it('should return `undefined` if only unsafe options with default `ensure`', () => {
        const model = createModel({
          'image/svg+xml': ''
        });
        expect(r.preferredMimeType(model.data)).toBeUndefined();
      });

      it('should return `undefined` if only unsafe options with `ensure`', () => {
        const model = createModel({
          'image/svg+xml': ''
        });
        expect(r.preferredMimeType(model.data, 'ensure')).toBeUndefined();
      });

      it('should return safe option if called with `prefer`', () => {
        const model = createModel({
          'image/svg+xml': '',
          'text/plain': ''
        });
        expect(r.preferredMimeType(model.data, 'prefer')).toBe('text/plain');
      });

      it('should return unsafe option if called with `prefer`, and no safe alternative', () => {
        const model = createModel({
          'image/svg+xml': ''
        });
        expect(r.preferredMimeType(model.data, 'prefer')).toBe('image/svg+xml');
      });
    });

    describe('#clone()', () => {
      it('should clone the rendermime instance with shallow copies of data', () => {
        const c = r.clone();
        expect(Array.from(c.mimeTypes)).toEqual(r.mimeTypes);
        c.addFactory(fooFactory);
        expect(r).not.toBe(c);
      });
    });

    describe('#addFactory()', () => {
      it('should add a factory', () => {
        r.addFactory(fooFactory);
        const index = r.mimeTypes.indexOf('text/foo');
        expect(index).toBe(r.mimeTypes.length - 1);
      });

      it('should take an optional rank', () => {
        const len = r.mimeTypes.length;
        r.addFactory(fooFactory, 0);
        const index = r.mimeTypes.indexOf('text/foo');
        expect(index).toBe(0);
        expect(r.mimeTypes.length).toBe(len + 1);
      });
    });

    describe('#removeMimeType()', () => {
      it('should remove a factory by mimeType', () => {
        r.removeMimeType('text/html');
        const model = createModel({ 'text/html': '<h1>foo</h1>' });
        expect(r.preferredMimeType(model.data, 'any')).toBeUndefined();
      });

      it('should be a no-op if the mimeType is not registered', () => {
        expect(() => {
          r.removeMimeType('text/foo');
        }).not.toThrow();
      });
    });

    describe('#getFactory()', () => {
      it('should get a factory by mimeType', () => {
        const f = r.getFactory('text/plain')!;
        expect(f.mimeTypes).toEqual(expect.arrayContaining(['text/plain']));
      });

      it('should return undefined for missing mimeType', () => {
        expect(r.getFactory('hello/world')).toBeUndefined();
      });
    });

    describe('#mimeTypes', () => {
      it('should get the ordered list of mimeTypes', () => {
        expect(r.mimeTypes.indexOf('text/html')).not.toBe(-1);
      });
    });

    describe('.UrlResolver', () => {
      let manager: ServiceManager.IManager;
      let resolverPath: RenderMimeRegistry.UrlResolver;
      let contents: Contents.IManager;
      let session: Session.ISessionConnection;
      const pathParent = 'has%20üni';
      const urlParent = encodeURI(pathParent);
      const path = pathParent + '/pr%25 ' + UUID.uuid4();

      beforeAll(async () => {
        manager = new ServiceManagerMock();
        const drive = new Drive({ name: 'extra' });
        contents = manager.contents;
        contents.addDrive(drive);
        await manager.ready;
        session = await manager.sessions.startNew({
          name: '',
          path: path,
          type: 'test'
        });
        resolverPath = new RenderMimeRegistry.UrlResolver({
          path: path,
          contents: manager.contents
        });
      });

      afterAll(() => {
        return session.shutdown();
      });

      describe('#constructor', () => {
        it('should create a UrlResolver instance', () => {
          expect(resolverPath).toBeInstanceOf(RenderMimeRegistry.UrlResolver);
        });
      });

      describe('.path', () => {
        it('should allow the path to be changed', async () => {
          const resolver = new RenderMimeRegistry.UrlResolver({
            path: pathParent + '/pr%25 ' + UUID.uuid4(),
            contents: manager.contents
          });
          resolver.path = '/some/path/file.txt';
          expect(await resolver.resolveUrl('./foo')).toContain('some/path/foo');
          const resolver2 = new RenderMimeRegistry.UrlResolver({
            path: '/some/path/file.txt',
            contents: manager.contents
          });
          resolver2.path = '/other/path/file.txt';
          expect(await resolver2.resolveUrl('./foo')).toContain(
            'other/path/foo'
          );
        });
      });

      describe('#resolveUrl()', () => {
        it('should resolve a relative url', async () => {
          expect(await resolverPath.resolveUrl('./foo')).toContain(
            urlParent + '/foo'
          );
        });

        it('should resolve a relative url with no active session', async () => {
          const resolver = new RenderMimeRegistry.UrlResolver({
            path: pathParent + '/pr%25 ' + UUID.uuid4(),
            contents: manager.contents
          });
          const path = await resolver.resolveUrl('./foo');
          expect(path).toContain(urlParent + '/foo');
        });

        it('should ignore urls that have a protocol', async () => {
          expect(await resolverPath.resolveUrl('http://foo')).toContain(
            'http://foo'
          );
        });

        it('should resolve URLs with escapes', async () => {
          expect(await resolverPath.resolveUrl('has%20space%23hash')).toContain(
            urlParent + '/has%20space%23hash'
          );
        });
      });

      describe('#getDownloadUrl()', () => {
        it('should resolve an absolute server url to a download url', async () => {
          const contextPromise = resolverPath.getDownloadUrl('foo');
          const contentsPromise = contents.getDownloadUrl('foo');
          const values = await Promise.all([contextPromise, contentsPromise]);
          expect(values[0]).toBe(values[1]);
        });

        it('should resolve escapes correctly', async () => {
          const contextPromise =
            resolverPath.getDownloadUrl('foo%20%23%2520test');
          const contentsPromise = contents.getDownloadUrl('foo #%20test');
          const values = await Promise.all([contextPromise, contentsPromise]);
          expect(values[0]).toBe(values[1]);
        });

        it('should ignore urls that have a protocol', async () => {
          const path = await resolverPath.getDownloadUrl('http://foo');
          expect(path).toBe('http://foo');
        });
      });

      describe('#isLocal', () => {
        it('should return true for a registered IDrive`', () => {
          expect(resolverPath.isLocal('extra:path/to/file')).toBe(true);
        });

        it('should return false for an unrecognized Drive`', () => {
          expect(resolverPath.isLocal('unregistered:path/to/file')).toBe(false);
        });

        it('should return true for a normal filesystem-like path`', () => {
          expect(resolverPath.isLocal('path/to/file')).toBe(true);
        });

        it('should return false for malformed URLs', () => {
          expect(resolverPath.isLocal('http://www.example.com%bad')).toBe(
            false
          );
        });
      });
    });
  });
});
