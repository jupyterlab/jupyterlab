// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

// Utils from: https://github.com/jupyterlab/jupyterlab/blob/b1e2b83047421bf7196bec5f2a94d0616dcb2329/packages/services/test/utils.ts

import { ServerConnection } from '@jupyterlab/services';

import { JSONObject } from '@lumino/coreutils';

export const KERNELSPECS: JSONObject = {
  default: 'xpython',
  kernelspecs: {
    python3: {
      name: 'Python',
      spec: {
        language: 'python',
        argv: [],
        display_name: 'Python 3',
        env: {}
      },
      resources: {}
    },
    xpython: {
      name: 'xpython',
      spec: {
        language: 'python',
        argv: [],
        display_name: 'xpython',
        env: {},
        metadata: { debugger: true }
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
