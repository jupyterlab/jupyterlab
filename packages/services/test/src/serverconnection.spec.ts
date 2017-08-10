// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  PageConfig
} from '@jupyterlab/coreutils';

import {
  ServerConnection
} from '../../lib';

import {
  MockXMLHttpRequest
} from './mockxhr';


describe('@jupyterlab/services', () => {

  describe('ServerConnection', () => {

    describe('.makeRequest()', () => {

      it ('should make a request to the server', () => {
        let settings = ServerConnection.makeSettings();
        MockXMLHttpRequest.onRequest = request => {
          expect(request.method).to.be('GET');
          request.respond(200, 'hi');
        };
        let request = { url: 'foo', data: 'hi' };
        return ServerConnection.makeRequest(request, settings).then(response => {
          expect(response.request.url).to.be('foo');
          expect(response.xhr).to.be.ok();
          expect(response.settings.baseUrl).to.be.ok();
          expect(response.data).to.be('hi');
          expect(response.hasOwnProperty('event')).to.be(true);
        });
      });

      it('should handle default values', () => {
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
        let settings = ServerConnection.makeSettings();
        return ServerConnection.makeRequest({ url: 'hello' }, settings).then(response => {
          expect(called).to.be(true);
          expect(response.data).to.be('hello!');
          expect(response.xhr.statusText).to.be('200 OK');
        });
      });

      it('should allow overrides', () => {
        MockXMLHttpRequest.onRequest = request => {
          expect(request.method).to.be('POST');
          expect(request.password).to.be('password');
          expect(Object.keys(request.requestHeaders)).to.eql(['Content-Type', 'foo']);
          let url = request.url;
          expect(url.indexOf('hello?')).to.be(-1);
          expect(url.indexOf('hello')).to.be(0);
          request.respond(200, 'hello!');
        };
        let settings = ServerConnection.makeSettings({
          password: 'password'
        });
        let requestData = {
          url: 'hello',
          method: 'POST',
          cache: true,
          contentType: 'bar',
          headers: {
            foo: 'bar'
          },
        };
        return ServerConnection.makeRequest(requestData, settings).then(response => {
          expect(response.data).to.be('hello!');
          expect(response.xhr.statusText).to.be('200 OK');
          expect((response.xhr as any).method).to.be('POST');
        });
      });

      it('should reject the promise for a bad status response', () => {
        MockXMLHttpRequest.onRequest = request => {
          request.respond(400, 'denied!');
        };
        let settings = ServerConnection.makeSettings();
        return ServerConnection.makeRequest({ url: 'foo' }, settings).catch(response => {
          expect(response.xhr.statusText).to.be('400 Bad Request');
          expect(response.message).to.be('400 Bad Request');
        });
      });

      it('should reject the promise on an error', () => {
        MockXMLHttpRequest.onRequest = request => {
          request.error(new Error('Denied!'));
        };
        let settings = ServerConnection.makeSettings();
        return ServerConnection.makeRequest({ url: 'foo' }, settings).catch(response => {
          expect(response.event.message).to.be('Denied!');
        });
      });

    });

    describe('.makeSettings()', () => {

      it('should use default settings', () => {
        let settings = ServerConnection.makeSettings();
        expect(settings.baseUrl).to.be(PageConfig.getBaseUrl());
        expect(settings.wsUrl).to.be(PageConfig.getWsUrl());
        expect(settings.user).to.be('');
        expect(settings.password).to.be('');
        expect(settings.withCredentials).to.be(false);
        expect(settings.timeout).to.be(0);
        expect(settings.token).to.be(PageConfig.getOption('token'));
        expect(Object.keys(settings.requestHeaders).length).to.be(0);
      });

      it('should handle overrides', () => {
        let defaults: Partial<ServerConnection.ISettings> = {
          baseUrl: 'foo',
          wsUrl: 'bar',
          withCredentials: true,
          user: 'foo',
          password: 'bar',
          timeout: 20,
          token: 'baz',
          requestHeaders: { foo: 'bar' }
        };
        let settings = ServerConnection.makeSettings(defaults);
        expect(settings.baseUrl).to.be(defaults.baseUrl);
        expect(settings.wsUrl).to.be(defaults.wsUrl);
        expect(settings.withCredentials).to.be(defaults.withCredentials);
        expect(settings.user).to.be(defaults.user);
        expect(settings.password).to.be(defaults.password);
        expect(settings.timeout).to.be(defaults.timeout);
        expect(settings.token).to.be(defaults.token);
        expect(settings.requestHeaders).to.eql(defaults.requestHeaders);
      });

    });

    describe('.makeError()', () => {

      it('should create a server error from a server response', () => {
        let settings = ServerConnection.makeSettings();
        MockXMLHttpRequest.onRequest = request => {
          expect(request.method).to.be('GET');
          request.respond(200, 'hi');
        };
        let request = { url: 'foo', data: 'hi' };
        return ServerConnection.makeRequest(request, settings).then(response => {
          let err = ServerConnection.makeError(response, 'foo');
          expect(err.message).to.be('foo');
          expect(err.xhr).to.be(response.xhr);
          expect(err.request).to.be(response.request);
          expect(err.settings).to.be(response.settings);
          expect(err.event).to.be(response.event);
        });
      });

    });

  });

});
