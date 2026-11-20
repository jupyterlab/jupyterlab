// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

// Utils inspired by: packages/services/test/utils.ts

import { ServerConnection } from '@jupyterlab/services';

import type { JSONObject } from '@lumino/coreutils';

import { Signal } from '@lumino/signaling';

import type { DebugProtocol } from '@vscode/debugprotocol';

import type { IDebugger } from '../src/tokens';

export const KERNELSPECS: JSONObject = {
  default: 'python3',
  kernelspecs: {
    python3: {
      name: 'Python',
      spec: {
        language: 'python',
        argv: [],
        display_name: 'Python 3',
        env: {},
        metadata: { debugger: true }
      },
      resources: {}
    },
    nopydebug: {
      name: 'nopydebug',
      spec: {
        language: 'python',
        argv: [],
        display_name: 'Python No Debug',
        env: {}
      },
      resources: {}
    }
  }
};

/**
 * Create new server connection settings.
 *
 * @param settings The server connection settings.
 */
export function makeSettings(
  settings?: Partial<ServerConnection.ISettings>
): ServerConnection.ISettings {
  return ServerConnection.makeSettings(settings);
}

/**
 * An interface for a service that has server settings.
 */
export interface IService {
  readonly serverSettings: ServerConnection.ISettings;
}

/**
 * Handle a single request with a mock response.
 *
 * @param item The service.
 * @param status The status code for the response.
 * @param body The body for the response.
 */
export function handleRequest(item: IService, status: number, body: any): void {
  // Store the existing fetch function.
  const oldFetch = item.serverSettings.fetch;

  // A single use callback.
  const temp = (info: RequestInfo, init: RequestInit): Promise<void> => {
    // Restore fetch.
    (item.serverSettings as any).fetch = oldFetch;

    // Normalize the body.
    if (typeof body !== 'string') {
      body = JSON.stringify(body);
    }

    // Create the response and return it as a promise.
    const response = new Response(body, { status });
    return Promise.resolve(response as any);
  };

  // Override the fetch function.
  (item.serverSettings as any).fetch = temp;
}

/**
 * Give a debugger service a started session with a fake kernel that keeps
 * the breakpoints of each file, and return those breakpoints by file.
 */
export function startTestSession(service: IDebugger): Map<string, number[]> {
  const kernel = 'python3';
  service.config.setHashParams({ kernel, method: 'Murmur2', seed: '0' });
  service.config.setTmpFileParams({
    kernel,
    prefix: '/tmp/ipykernel/',
    suffix: '.py'
  });
  const breakpoints = new Map<string, number[]>();
  const session = {
    connection: { id: 'test', name: 'test.ipynb', kernel: { name: kernel } },
    isStarted: true,
    eventMessage: new Signal<unknown, IDebugger.ISession.Event>(service),
    dispose: () => undefined,
    restoreState: async () => ({
      body: {
        breakpoints: Array.from(breakpoints, ([source, lines]) => ({
          source,
          breakpoints: lines.map(line => ({ line }))
        }))
      }
    }),
    sendRequest: async (
      command: string,
      args: {
        code?: string;
        breakpoints?: DebugProtocol.SourceBreakpoint[];
        source?: DebugProtocol.Source;
      }
    ) => {
      if (command === 'dumpCell') {
        return { body: { sourcePath: service.getCodeId(args.code ?? '') } };
      }
      if (command === 'setBreakpoints') {
        const path = args.source?.path ?? '';
        const lines = (args.breakpoints ?? []).map(({ line }) => line);
        if (lines.length) {
          breakpoints.set(path, lines);
        } else {
          breakpoints.delete(path);
        }
        return {
          body: { breakpoints: lines.map(line => ({ line, verified: true })) }
        };
      }
      throw new Error(`Unexpected debug request: ${command}`);
    }
  };
  service.session = session as unknown as IDebugger.ISession;
  return breakpoints;
}

/**
 * Wait for the pending debug requests and their replies.
 */
export async function flushRequests(): Promise<void> {
  for (let i = 0; i < 50; i++) {
    await Promise.resolve();
  }
}
