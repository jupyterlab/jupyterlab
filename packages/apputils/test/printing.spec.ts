/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { ServerConnection } from '@jupyterlab/services';
import { Printing } from '@jupyterlab/apputils';

const interceptSettings = async (
  callback: () => Promise<void>
): Promise<ServerConnection.ISettings> => {
  let capturedSettings: ServerConnection.ISettings | undefined;
  const originalMakeRequest = ServerConnection.makeRequest;

  ServerConnection.makeRequest = (
    url: string,
    init: RequestInit,
    settings: ServerConnection.ISettings
  ) => {
    capturedSettings = settings;
    throw new Error(
      'Settings successfully captured, now interrupting subsequent logic'
    );
  };

  try {
    await callback();
    throw new Error(
      'Expected the callback function to generate a request which should throw'
    );
  } catch (error) {
    // Expected to throw
  } finally {
    ServerConnection.makeRequest = originalMakeRequest;
  }

  return capturedSettings!;
};

describe('@jupyterlab/apputils', () => {
  describe('Printing.printURL', () => {
    it('should use custom server settings when provided', async () => {
      const customBaseUrl = 'http://custom-server:8888/';
      const customSettings = ServerConnection.makeSettings({
        baseUrl: customBaseUrl
      });

      const capturedSettings = await interceptSettings(() =>
        Printing.printURL('http://example.com/document.pdf', customSettings)
      );

      // Verify that the custom settings were used
      expect(capturedSettings).toBe(customSettings);
      expect(capturedSettings.baseUrl).toBe('http://custom-server:8888/');
    });

    it('should use default server settings when none provided', async () => {
      const capturedSettings = await interceptSettings(() =>
        Printing.printURL('http://example.com/document.pdf')
      );

      // Verify that settings were provided (not undefined)
      expect(capturedSettings).toBeDefined();
      expect(capturedSettings.baseUrl).toBe(
        ServerConnection.makeSettings().baseUrl
      );
    });
  });
});
