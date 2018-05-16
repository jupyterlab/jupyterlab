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
  getRequestHandler
} from './utils';


describe('@jupyterlab/services', () => {

  describe('ServerConnection', () => {

    describe('.makeRequest()', () => {

      it('should make a request to the server', () => {
        let settings = getRequestHandler(200, 'hello');
        return ServerConnection.makeRequest(settings.baseUrl, {}, settings).then(response => {
          expect(response.statusText).to.be('OK');
          return response.json();
        }).then(data => {
          expect(data).to.be('hello');
        });
      });

    });

    describe('.makeSettings()', () => {

      it('should use default settings', () => {
        let settings = ServerConnection.makeSettings();
        expect(settings.baseUrl).to.be(PageConfig.getBaseUrl());
        expect(settings.wsUrl).to.be(PageConfig.getWsUrl());
        expect(settings.token).to.be(PageConfig.getOption('token'));
      });

      it('should use baseUrl for wsUrl', () => {
        let conf: Partial<ServerConnection.ISettings> = {
          baseUrl: 'https://host/path'
        };
        let settings = ServerConnection.makeSettings(conf);
        expect(settings.baseUrl).to.be(conf.baseUrl);
        expect(settings.wsUrl).to.be('wss://host/path');
      });

      it('should handle overrides', () => {
        let defaults: Partial<ServerConnection.ISettings> = {
          baseUrl: 'foo',
          wsUrl: 'bar',
          init: {
            credentials: 'same-origin'
          },
          token: 'baz',
        };
        let settings = ServerConnection.makeSettings(defaults);
        expect(settings.baseUrl).to.be(defaults.baseUrl);
        expect(settings.wsUrl).to.be(defaults.wsUrl);
        expect(settings.token).to.be(defaults.token);
        expect(settings.init.credentials).to.be(defaults.init.credentials);
      });

    });

    describe('.makeError()', () => {

      it('should create a server error from a server response', () => {
        let settings = getRequestHandler(200, 'hi');
        let init = { body: 'hi' };
        return ServerConnection.makeRequest(settings.baseUrl, init, settings).then(response => {
          let err = new ServerConnection.ResponseError(response);
          expect(err.message).to.be('Invalid response: 200 OK');
        });
      });

    });

  });

});
