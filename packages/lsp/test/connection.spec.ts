/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { PromiseDelegate } from '@lumino/coreutils';

import type { MessageConnection } from 'vscode-ws-jsonrpc';

import { LSPConnection } from '../src/connection';
import { Method } from '../src/tokens';

class TestLSPConnection extends LSPConnection {
  initialize(connection: MessageConnection): void {
    this.connection = connection;
    this._isConnected = true;
    this._isInitialized = true;
  }
}

function createConnection(sendRequest: jest.Mock): TestLSPConnection {
  const connection = new TestLSPConnection({
    capabilities: {},
    languageId: '',
    rootUri: '',
    serverUri: ''
  });
  connection.initialize({ sendRequest } as unknown as MessageConnection);
  return connection;
}

describe('LSPConnection', () => {
  describe('#request()', () => {
    it('should forward a client request and return its result', async () => {
      const expected = { contents: 'result' };
      const sendRequest = jest.fn().mockResolvedValue(expected);
      const connection = createConnection(sendRequest);
      const params = { textDocument: { uri: 'file:///test.py' } };

      const result = await connection.request(
        Method.ClientRequest.HOVER,
        params
      );

      expect(result).toBe(expected);
      expect(sendRequest).toHaveBeenCalledWith(
        Method.ClientRequest.HOVER,
        params
      );
    });

    it('should propagate request errors', async () => {
      const expected = new Error('Request failed');
      const connection = createConnection(
        jest.fn().mockRejectedValue(expected)
      );

      await expect(
        connection.request(Method.ClientRequest.HOVER, {})
      ).rejects.toBe(expected);
    });

    it('should reject requests before the connection is ready', async () => {
      const connection = new LSPConnection({
        capabilities: {},
        languageId: '',
        rootUri: '',
        serverUri: ''
      });

      await expect(
        connection.request(Method.ClientRequest.HOVER, {})
      ).rejects.toThrow(
        'Cannot send an LSP request before the connection is ready.'
      );
    });

    it('should reject requests after the connection is disposed', async () => {
      const connection = new LSPConnection({
        capabilities: {},
        languageId: '',
        rootUri: '',
        serverUri: ''
      });
      connection.dispose();

      await expect(
        connection.request(Method.ClientRequest.HOVER, {})
      ).rejects.toThrow('Cannot send an LSP request on a disposed connection.');
    });

    it('should cancel a request with the provided signal', async () => {
      const response = new PromiseDelegate<unknown>();
      const sendRequest = jest.fn().mockReturnValue(response.promise);
      const connection = createConnection(sendRequest);
      const controller = new AbortController();
      const reason = new Error('Timed out');

      const request = connection.request(
        Method.ClientRequest.HOVER,
        {},
        {
          signal: controller.signal
        }
      );
      const cancellationToken = sendRequest.mock.calls[0][2];
      const onCancellationRequested = jest.fn();
      const disposable = cancellationToken.onCancellationRequested(
        onCancellationRequested
      );
      expect(cancellationToken.isCancellationRequested).toBe(false);

      controller.abort(reason);

      expect(cancellationToken.isCancellationRequested).toBe(true);
      expect(onCancellationRequested).toHaveBeenCalledTimes(1);
      await expect(request).rejects.toBe(reason);
      disposable.dispose();
      response.resolve(undefined);
    });

    it('should not send a request with an already aborted signal', async () => {
      const sendRequest = jest.fn();
      const connection = createConnection(sendRequest);
      const controller = new AbortController();
      controller.abort();

      await expect(
        connection.request(
          Method.ClientRequest.HOVER,
          {},
          {
            signal: controller.signal
          }
        )
      ).rejects.toMatchObject({ name: 'AbortError' });
      expect(sendRequest).not.toHaveBeenCalled();
    });
  });
});
