// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { URLExt } from '@jupyterlab/coreutils';

describe('@jupyterlab/coreutils', () => {
  describe('URLExt', () => {
    describe('.parse()', () => {
      it('should parse a url into a URLExt object', () => {
        const obj = URLExt.parse('http://www.example.com');
        expect(obj.href).toBe('http://www.example.com/');
        expect(obj.protocol).toBe('http:');
        expect(obj.host).toBe('www.example.com');
        expect(obj.hostname).toBe('www.example.com');
        expect(obj.pathname).toBe('/');
      });

      it('should handle query and hash', () => {
        const url = "http://example.com/path?that's#all, folks";
        const obj = URLExt.parse(url);
        // Chrome has a different href
        expect([
          'http://example.com/path?that%27s#all,%20folks',
          'http://example.com/path?that%27s#all, folks'
        ]).toContain(obj.href);
        expect(obj.protocol).toBe('http:');
        expect(obj.host).toBe('example.com');
        expect(obj.hostname).toBe('example.com');
        expect(obj.search).toBe('?that%27s');
        expect(obj.pathname).toBe('/path');
        // Chrome has a different hash
        expect(['#all,%20folks', '#all, folks']).toContain(obj.hash);
      });
    });

    describe('.join()', () => {
      it('should join a sequence of url components', () => {
        expect(URLExt.join('/foo/', 'bar/')).toBe('/foo/bar/');
        expect(URLExt.join('//example.com', 'bar/')).toBe('//example.com/bar/');
        expect(URLExt.join('//example.com', 'foo:bar/')).toBe(
          '//example.com/foo:bar/'
        );
        expect(URLExt.join('http://www.example.com/', '/bar')).toBe(
          'http://www.example.com/bar'
        );
        expect(URLExt.join('http://user:pass@www.example.com/', '/bar')).toBe(
          'http://user:pass@www.example.com/bar'
        );
        expect(URLExt.join('//example.com', 'foo:bar:', 'baz')).toBe(
          '//example.com/foo:bar:/baz'
        );
        expect(URLExt.join('http://example.com', 'foo:bar:', 'baz')).toBe(
          'http://example.com/foo:bar:/baz'
        );
        expect(
          URLExt.join('http://example.com', 'foo', '..', '..', 'bar/')
        ).toBe('http://example.com/bar/');
      });
    });

    describe('.encodeParts()', () => {
      it('should encode and join a sequence of url components', () => {
        expect(URLExt.encodeParts('>/>')).toBe('%3E/%3E');
      });
    });

    describe('.normalize()', () => {
      it('should handle leading slash', () => {
        expect(URLExt.normalize('/')).toBe(location.origin + '/');
      });

      it('should handle leading double slash', () => {
        expect(URLExt.normalize('//foo')).toBe(location.protocol + '//foo/');
      });

      it('should handle http', () => {
        expect(URLExt.normalize('http://foo')).toBe('http://foo/');
      });

      it('should handle other', () => {
        expect(URLExt.normalize('ftp://foo')).toBe('ftp://foo/');
      });
    });

    describe('objectToQueryString()', () => {
      it('should return a serialized object string suitable for a query', () => {
        const obj = {
          name: 'foo',
          id: 'baz'
        };
        expect(URLExt.objectToQueryString(obj)).toBe('?name=foo&id=baz');
      });
    });

    describe('.isLocal()', () => {
      it('should test whether the url is a local url', () => {
        expect(URLExt.isLocal('https://foo/bar.txt')).toBe(false);
        expect(URLExt.isLocal('http://foo/bar.txt')).toBe(false);
        expect(URLExt.isLocal('//foo/bar.txt')).toBe(false);
        expect(URLExt.isLocal('file://foo/bar.txt')).toBe(false);
        expect(URLExt.isLocal('data:text/plain,123ABC')).toBe(false);
        expect(URLExt.isLocal('/foo/bar.txt')).toBe(false);
        expect(URLExt.isLocal('httpserver/index.html')).toBe(true);
        expect(URLExt.isLocal('../foo/bar.txt')).toBe(true);
        expect(URLExt.isLocal('./foo/bar.txt')).toBe(true);
        expect(URLExt.isLocal('foo/bar.txt')).toBe(true);
        expect(URLExt.isLocal('bar.txt')).toBe(true);
      });
      it('should optionally allow references to root', () => {
        expect(URLExt.isLocal('/foo/bar.txt', true)).toBe(true);
        expect(URLExt.isLocal('//foo/bar.txt', true)).toBe(false);
      });
    });
  });
});
