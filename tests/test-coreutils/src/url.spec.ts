// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { URLExt } from '@jupyterlab/coreutils';

describe('@jupyterlab/coreutils', () => {
  describe('URLExt', () => {
    describe('.parse()', () => {
      it('should parse a url into a URLExt object', () => {
        const obj = URLExt.parse('http://www.example.com');
        expect(obj.href).to.equal('http://www.example.com/');
        expect(obj.protocol).to.equal('http:');
        expect(obj.host).to.equal('www.example.com');
        expect(obj.hostname).to.equal('www.example.com');
        expect(obj.pathname).to.equal('/');
      });

      it('should handle query and hash', () => {
        const url = "http://example.com/path?that's#all, folks";
        const obj = URLExt.parse(url);
        try {
          expect(obj.href).to.equal(
            'http://example.com/path?that%27s#all,%20folks'
          );
        } catch (e) {
          // Chrome
          expect(obj.href).to.equal(
            'http://example.com/path?that%27s#all, folks'
          );
        }
        expect(obj.protocol).to.equal('http:');
        expect(obj.host).to.equal('example.com');
        expect(obj.hostname).to.equal('example.com');
        expect(obj.search).to.equal('?that%27s');
        expect(obj.pathname).to.equal('/path');
        try {
          expect(obj.hash).to.equal('#all,%20folks');
        } catch (e) {
          // Chrome
          expect(obj.hash).to.equal('#all, folks');
        }
      });
    });

    describe('.join()', () => {
      it('should join a sequence of url components', () => {
        expect(URLExt.join('/foo/', 'bar/')).to.equal('/foo/bar/');
      });
    });

    describe('.encodeParts()', () => {
      it('should encode and join a sequence of url components', () => {
        expect(URLExt.encodeParts('>/>')).to.equal('%3E/%3E');
      });
    });

    describe('.normalize()', () => {
      it('should handle leading slash', () => {
        expect(URLExt.normalize('/')).to.equal(location.origin + '/');
      });

      it('should handle leading double slash', () => {
        expect(URLExt.normalize('//foo')).to.equal(
          location.protocol + '//foo/'
        );
      });

      it('should handle http', () => {
        expect(URLExt.normalize('http://foo')).to.equal('http://foo/');
      });

      it('should handle other', () => {
        expect(URLExt.normalize('ftp://foo')).to.equal('ftp://foo/');
      });
    });

    describe('objectToQueryString()', () => {
      it('should return a serialized object string suitable for a query', () => {
        const obj = {
          name: 'foo',
          id: 'baz'
        };
        expect(URLExt.objectToQueryString(obj)).to.equal('?name=foo&id=baz');
      });
    });

    describe('.isLocal()', () => {
      it('should test whether the url is a local url', () => {
        expect(URLExt.isLocal('https://foo/bar.txt')).to.equal(false);
        expect(URLExt.isLocal('http://foo/bar.txt')).to.equal(false);
        expect(URLExt.isLocal('//foo/bar.txt')).to.equal(false);
        expect(URLExt.isLocal('file://foo/bar.txt')).to.equal(false);
        expect(URLExt.isLocal('data:text/plain,123ABC')).to.equal(false);
        expect(URLExt.isLocal('/foo/bar.txt')).to.equal(false);
        expect(URLExt.isLocal('httpserver/index.html')).to.equal(true);
        expect(URLExt.isLocal('../foo/bar.txt')).to.equal(true);
        expect(URLExt.isLocal('./foo/bar.txt')).to.equal(true);
        expect(URLExt.isLocal('foo/bar.txt')).to.equal(true);
        expect(URLExt.isLocal('bar.txt')).to.equal(true);
      });
    });
  });
});
