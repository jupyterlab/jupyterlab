// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { testEmission } from '@jupyterlab/testing';
import { type Kernel, KernelConnection, ServerConnection } from '../../src';
import { KernelTester } from '../utils';

/**
 * Tests for WebSocket close code handling in KernelConnection._onWSClose.
 *
 * Verifies that the handler respects close codes and only reconnects
 * on abnormal closures, not on normal closures (code 1000/1001).
 *
 * See: https://github.com/jupyterlab/jupyterlab/issues/18189
 */
describe('KernelConnection WebSocket close code handling', () => {
  let tester: KernelTester;

  jest.retryTimes(3);

  afterEach(() => {
    if (tester) {
      tester.dispose();
    }
  });

  it('should auto-reconnect on default websocket close (no code)', async () => {
    tester = new KernelTester();
    const kernel = await tester.start();
    await kernel.info;

    const emission = testEmission(kernel.connectionStatusChanged, {
      find: (k, status) => status === 'connecting'
    });
    await tester.close();
    await expect(emission).resolves.not.toThrow();
  });

  it('should not reconnect on normal WebSocket closure (code 1000)', async () => {
    tester = new KernelTester();
    const kernel = await tester.start();
    await kernel.info;

    const statuses: string[] = [];
    kernel.connectionStatusChanged.connect((_, status) => {
      statuses.push(status);
    });

    // Close with code 1000 (Normal Closure)
    await tester.closeWithCode(1000, 'Normal closure');
    await new Promise(resolve => setTimeout(resolve, 2000));

    expect(statuses).not.toContain('connecting');
    expect(statuses).toContain('disconnected');
  }, 10000);

  it('should not reconnect on WebSocket going away (code 1001)', async () => {
    tester = new KernelTester();
    const kernel = await tester.start();
    await kernel.info;

    const statuses: string[] = [];
    kernel.connectionStatusChanged.connect((_, status) => {
      statuses.push(status);
    });

    // Close with code 1001 (Going Away)
    await tester.closeWithCode(1001, 'Going away');
    await new Promise(resolve => setTimeout(resolve, 2000));

    expect(statuses).not.toContain('connecting');
  }, 10000);

  it('should reconnect on abnormal WebSocket closure (code 1011)', async () => {
    tester = new KernelTester();
    const kernel = await tester.start();
    await kernel.info;

    const emission = testEmission(kernel.connectionStatusChanged, {
      find: (k, status) => status === 'connecting'
    });
    // Close with code 1011 (Internal Error) - should reconnect
    await tester.closeWithCode(1011, 'Internal error');
    await expect(emission).resolves.not.toThrow();
  });
});

describe('KernelConnection', () => {
  describe('#dispose()', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it('should cancel pending getKernelModel retry timer on early WebSocket close', async () => {
      jest.useFakeTimers();

      const mockSocket = {
        onopen: null as (() => void) | null,
        onclose: null as ((evt: CloseEvent) => void) | null,
        onerror: null as ((evt: Event) => void) | null,
        onmessage: null as ((evt: MessageEvent) => void) | null,
        binaryType: 'arraybuffer',
        close: jest.fn()
      };
      const MockWebSocket = jest.fn(() => mockSocket);
      const getModel = jest
        .fn()
        .mockRejectedValue(
          new ServerConnection.NetworkError(new TypeError('Failed to fetch'))
        );

      const serverSettings = ServerConnection.makeSettings({
        WebSocket: MockWebSocket as unknown as typeof WebSocket
      });
      const kernelAPIClient = {
        getModel
      } as unknown as Kernel.IKernelAPIClient;

      const kernel = new KernelConnection({
        model: { id: 'test-kernel-id', name: 'python3' },
        serverSettings,
        kernelAPIClient
      });

      mockSocket.onclose?.({ code: 1006, reason: '' } as CloseEvent);
      await Promise.resolve();
      await Promise.resolve();

      expect(getModel).toHaveBeenCalledTimes(1);
      expect(jest.getTimerCount()).toBe(1);

      kernel.dispose();
      expect(jest.getTimerCount()).toBe(0);

      jest.advanceTimersByTime(35000);
      await Promise.resolve();

      expect(getModel).toHaveBeenCalledTimes(1);
    });
  });
});
