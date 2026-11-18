// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { testEmission } from '@jupyterlab/testing';
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
