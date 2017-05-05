// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import expect = require('expect.js');

import {
  getConfigOption, getBaseUrl, getWsUrl, ajaxRequest, loadObject
} from '../../lib/utils';

import {
  MockXMLHttpRequest
} from './mockxhr';


declare var global: any;
let path = require('path') as any;
global.requirejs = require('requirejs');


describe('@jupyterlab/services', () => {

  describe('getConfigOption()', () => {

    it('should get a config option passed on the command line', () => {
      expect(getConfigOption('foo')).to.be('bar');
    });

    it('should return `undefined` for a option that was not given', () => {
      expect(getConfigOption('baz')).to.be(void 0);
    });

  });

  describe('getBaseUrl()', () => {

    it('should get the default base url', () => {
      expect(getBaseUrl()).to.be('http://localhost:8888/');
    });

  });

  describe('getWsUrl()', () => {

    it('should get the default ws url', () => {
      expect(getWsUrl()).to.be('ws://localhost:8888/');
    });

  });

  describe('ajaxRequest()', () => {

    it('should handle default values', (done) => {
      let called = false;
      MockXMLHttpRequest.onRequest = request => {
        expect(request.method).to.be('GET');
        expect(request.password).to.be('');
        expect(request.async).to.be(true);
        expect(Object.keys(request.requestHeaders)).to.eql(['Content-Type']);
        let url = request.url;
        expect(url.indexOf('hello?')).to.be(0);
        called = true;
        request.respond(200, 'hello!');
      };

      ajaxRequest('hello', {}).then(response => {
        expect(called).to.be(true);
        expect(response.data).to.be('hello!');
        expect(response.xhr.statusText).to.be('200 OK');
      }).then(done, done);
    });

    it('should allow overrides', (done) => {
      MockXMLHttpRequest.onRequest = request => {
        expect(request.method).to.be('POST');
        expect(request.password).to.be('password');
        expect(Object.keys(request.requestHeaders)).to.eql(['Content-Type', 'foo']);
        let url = request.url;
        expect(url.indexOf('hello?')).to.be(-1);
        expect(url.indexOf('hello')).to.be(0);
        request.respond(200, 'hello!');
      };
      ajaxRequest('hello', {
        method: 'POST',
        password: 'password',
        cache: true,
        contentType: 'bar',
        requestHeaders: {
          foo: 'bar'
        },
        timeout: 5
      }).then(response => {
        expect(response.data).to.be('hello!');
        expect(response.xhr.statusText).to.be('200 OK');
        expect(response.ajaxSettings.method).to.be('POST');
      }).then(done, done);
    });

    it('should reject the promise for a bad status response', (done) => {
      MockXMLHttpRequest.onRequest = request => {
        request.respond(400, 'denied!');
      };
      ajaxRequest('hello', {}).catch(response => {
        expect(response.xhr.statusText).to.be('400 Bad Request');
        expect(response.throwError).to.be('400 Bad Request');
      }).then(done, done);
    });

    it('should reject the promise on an error', (done) => {
      MockXMLHttpRequest.onRequest = request => {
        request.error(new Error('Denied!'));
      };
      ajaxRequest('hello', {}).catch(response => {
        expect(response.event.message).to.be('Denied!');
      }).then(done, done);
    });

  });

  describe('#loadObject()', () => {

    it('should accept a name and a module name to load', done => {
      // The path is relative to mocha.
      let target = path.resolve('test/build/target');
      loadObject('test', target).then(func => {
        expect(func()).to.be(1);
      }).then(done, done);
    });

    it('should reject if the module name is not found', done => {
      loadObject('test', 'foo').catch(error => {
        expect(error.message.indexOf("Cannot find module 'foo'")).to.not.be(-1);
      }).then(done, done);
    });

    it('should reject if the object is not found', done => {
      let target = path.resolve('test/build/target');
      loadObject('foo', target).catch(error => {
        expect(error.message).to.contain("Object 'foo' not found in module");
      }).then(done, done);
    });

    it('should accept a registry', done => {
      let registry = { test: () => { return 1; }};
      loadObject('test', void 0, registry).then(func => {
        expect(func()).to.be(1);
      }).then(done, done);
    });

    it('should reject if the object is not in the registry', done => {
      let registry = { test: () => { return 1; }};
      loadObject('foo', void 0, registry).catch(error => {
        expect(error.message).to.be("Object 'foo' not found in registry");
      }).then(done, done);
    });

  });

});
