// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { WebSocketProvider } from '../src';
import * as yws from 'y-websocket';

jest.mock('y-websocket');

describe('@jupyterlab/docprovider', () => {
  let Provider: jest.Mock;
  beforeAll(() => {
    Provider = yws.WebsocketProvider as jest.Mock;
    Provider.mockImplementation(() => {
      return {
        messageHandlers: {}
      };
    });
  });
  afterAll(() => {
    Provider.mockRestore();
  });
  describe('docprovider', () => {
    it('should have a type', () => {
      expect(WebSocketProvider).not.toBeUndefined();
    });
    it('should deduce the Y document type from content type if it is missing', () => {
      new WebSocketProvider({
        ymodel: {} as any,
        format: 'text',
        contentType: 'file',
        url: 'foo',
        user: {
          isReady: false,
          changed: { connect: jest.fn(), disconnect: jest.fn() },
          ready: { connect: jest.fn(), disconnect: jest.fn() }
        } as any,
        path: 'bar.txt'
      });
      expect(yws.WebsocketProvider).toBeCalledWith(
        'foo',
        'text:file:bar.txt:file',
        undefined,
        { awareness: undefined }
      );
    });
    it('should send the Y document type if it is defined', () => {
      new WebSocketProvider({
        ymodel: {} as any,
        format: 'text',
        contentType: 'file',
        url: 'foo',
        user: {
          isReady: false,
          changed: { connect: jest.fn(), disconnect: jest.fn() },
          ready: { connect: jest.fn(), disconnect: jest.fn() }
        } as any,
        path: 'bar.txt',
        yDocumentType: 'customType'
      });
      expect(yws.WebsocketProvider).toBeCalledWith(
        'foo',
        'text:file:bar.txt:customType',
        undefined,
        { awareness: undefined }
      );
    });
  });
});
