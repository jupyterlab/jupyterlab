// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { URLExt } from '@jupyterlab/coreutils';

// Polyfill Blob arrayBuffer and text methods for jsdom environment
// See https://github.com/jsdom/jsdom/issues/2555
if (!Blob.prototype.arrayBuffer) {
  // Since "this" must refer to the Blob instance, we use a function expression
  Blob.prototype.arrayBuffer = function (): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(this);
    });
  };
}

if (!Blob.prototype.text) {
  // Since "this" must refer to the Blob instance, we use a function expression
  Blob.prototype.text = function (): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(this);
    });
  };
}

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

    describe('.parseDataURI()', () => {
      it('should parse a valid base64 data URI', () => {
        const result = URLExt.parseDataURI(
          'data:image/png;base64,iVBORw0KGgo='
        );
        expect(result).toEqual({
          mimeType: 'image/png',
          isBase64: true,
          data: 'iVBORw0KGgo='
        });
      });

      it('should parse a valid non-base64 data URI', () => {
        const result = URLExt.parseDataURI('data:text/plain,Hello%20World');
        expect(result).toEqual({
          mimeType: 'text/plain',
          isBase64: false,
          data: 'Hello%20World'
        });
      });

      it('should use default MIME type when empty', () => {
        const result = URLExt.parseDataURI('data:,test');
        expect(result).toEqual({
          mimeType: 'text/plain;charset=US-ASCII',
          isBase64: false,
          data: 'test'
        });
      });

      it('should return null for missing data: prefix', () => {
        const result = URLExt.parseDataURI('http://example.com');
        expect(result).toBeNull();
      });

      it('should return null for missing comma', () => {
        const result = URLExt.parseDataURI('data:text/plain');
        expect(result).toBeNull();
      });

      it('should handle empty data portion', () => {
        const result = URLExt.parseDataURI('data:text/plain,');
        expect(result).toEqual({
          mimeType: 'text/plain',
          isBase64: false,
          data: ''
        });
      });

      it('should handle MIME type with charset', () => {
        const result = URLExt.parseDataURI(
          'data:text/html;charset=utf-8,<h1>Hi</h1>'
        );
        expect(result).toEqual({
          mimeType: 'text/html;charset=utf-8',
          isBase64: false,
          data: '<h1>Hi</h1>'
        });
      });

      it('should handle MIME type with charset and base64', () => {
        const result = URLExt.parseDataURI(
          'data:text/plain;charset=utf-8;base64,SGVsbG8='
        );
        expect(result).toEqual({
          mimeType: 'text/plain;charset=utf-8',
          isBase64: true,
          data: 'SGVsbG8='
        });
      });
    });

    describe('.parseUriListFirst()', () => {
      it('should return the first URI from a single URI', () => {
        const result = URLExt.parseUriListFirst('http://example.com\r\n');
        expect(result).toBe('http://example.com');
      });

      it('should return the first URI from multiple URIs', () => {
        const result = URLExt.parseUriListFirst(
          'http://first.com\r\nhttp://second.com\r\n'
        );
        expect(result).toBe('http://first.com');
      });

      it('should skip comments and return first URI', () => {
        const result = URLExt.parseUriListFirst(
          '# comment\r\nhttp://actual.com\r\n'
        );
        expect(result).toBe('http://actual.com');
      });

      it('should return null for empty string', () => {
        const result = URLExt.parseUriListFirst('');
        expect(result).toBeNull();
      });

      it('should return null for only comments', () => {
        const result = URLExt.parseUriListFirst('# comment1\r\n# comment2\r\n');
        expect(result).toBeNull();
      });

      it('should handle URI without trailing CRLF', () => {
        const result = URLExt.parseUriListFirst('http://example.com');
        expect(result).toBe('http://example.com');
      });

      it('should skip multiple leading comments', () => {
        const result = URLExt.parseUriListFirst(
          '# first comment\r\n# second comment\r\nhttp://example.com\r\n'
        );
        expect(result).toBe('http://example.com');
      });

      it('should return null for null input', () => {
        const result = URLExt.parseUriListFirst(null as any);
        expect(result).toBeNull();
      });
    });

    describe('.dataURItoBlob()', () => {
      it('should convert a base64 image data URI to Blob', async () => {
        // Small valid PNG
        const pngBase64 =
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
        const dataURI = `data:image/png;base64,${pngBase64}`;
        const blob = URLExt.dataURItoBlob(dataURI);

        expect(blob).not.toBeNull();
        expect(blob!.type).toBe('image/png');
        expect(blob!.size).toBeGreaterThan(0);

        // Convert back to base64 and verify it matches original
        const arrayBuffer = await blob!.arrayBuffer();
        const roundTrippedBase64 = btoa(
          String.fromCharCode(...new Uint8Array(arrayBuffer))
        );
        expect(roundTrippedBase64).toBe(pngBase64);
      });

      it('should convert a percent-encoded text data URI to Blob', async () => {
        const dataURI = 'data:text/plain,Hello%20World';
        const blob = URLExt.dataURItoBlob(dataURI);

        expect(blob).not.toBeNull();
        expect(blob!.type).toBe('text/plain');

        // Verify the actual text content
        const text = await blob!.text();
        expect(text).toBe('Hello World');
      });

      it('should return null for invalid data URI', () => {
        const blob = URLExt.dataURItoBlob('not-a-data-uri');
        expect(blob).toBeNull();
      });

      it('should handle empty base64 data', () => {
        const blob = URLExt.dataURItoBlob('data:text/plain;base64,');
        expect(blob).not.toBeNull();
        expect(blob!.size).toBe(0);
      });

      it('should preserve MIME type in blob', () => {
        const blob = URLExt.dataURItoBlob('data:audio/x-wave;base64,AAAA');
        expect(blob).not.toBeNull();
        expect(blob!.type).toBe('audio/x-wave');
      });

      it('should handle base64 data', async () => {
        // "Hello" in base64 is "SGVsbG8="
        const blob = URLExt.dataURItoBlob('data:text/plain;base64,SGVsbG8=');
        expect(blob).not.toBeNull();

        const text = await blob!.text();
        expect(text).toBe('Hello');
      });
    });
  });
});
