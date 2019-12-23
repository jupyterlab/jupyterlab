// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { PageConfig } from '@jupyterlab/coreutils';

import { ServerConnection } from '@jupyterlab/services';

import { getRequestHandler } from './utils';

describe('@jupyterlab/services', () => {
  describe('ServerConnection', () => {
    describe('.makeRequest()', () => {
      it('should make a request to the server', async () => {
        const settings = getRequestHandler(200, 'hello');
        const response = await ServerConnection.makeRequest(
          settings.baseUrl,
          {},
          settings
        );
        expect(response.statusText).to.equal('OK');
        const data = await response.json();
        expect(data).to.equal('hello');
      });
    });

    describe('.makeSettings()', () => {
      it('should use default settings', () => {
        const settings = ServerConnection.makeSettings();
        expect(settings.baseUrl).to.equal(PageConfig.getBaseUrl());
        expect(settings.wsUrl).to.equal(PageConfig.getWsUrl());
        expect(settings.token).to.equal(PageConfig.getOption('token'));
      });

      it('should use baseUrl for wsUrl', () => {
        const conf: Partial<ServerConnection.ISettings> = {
          baseUrl: 'https://host/path'
        };
        const settings = ServerConnection.makeSettings(conf);
        expect(settings.baseUrl).to.equal(conf.baseUrl);
        expect(settings.wsUrl).to.equal('wss://host/path');
      });

      it('should handle overrides', () => {
        const defaults: Partial<ServerConnection.ISettings> = {
          baseUrl: 'foo',
          wsUrl: 'bar',
          init: {
            credentials: 'same-origin'
          },
          token: 'baz'
        };
        const settings = ServerConnection.makeSettings(defaults);
        expect(settings.baseUrl).to.equal(defaults.baseUrl);
        expect(settings.wsUrl).to.equal(defaults.wsUrl);
        expect(settings.token).to.equal(defaults.token);
        expect(settings.init.credentials).to.equal(defaults.init!.credentials);
      });
    });

    describe('.makeError()', () => {
      it('should create a server error from a server response', async () => {
        const settings = getRequestHandler(200, 'hi');
        const init = { body: 'hi', method: 'POST' };
        const response = await ServerConnection.makeRequest(
          settings.baseUrl,
          init,
          settings
        );
        const err = new ServerConnection.ResponseError(response);
        expect(err.message).to.equal('Invalid response: 200 OK');
      });
    });
  });
});
