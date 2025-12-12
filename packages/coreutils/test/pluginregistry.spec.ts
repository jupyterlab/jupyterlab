import { JupyterPluginRegistry } from '@jupyterlab/coreutils';
import { PluginRegistry } from '@lumino/coreutils';

describe('JupyterPluginRegistry', () => {
  let registry: JupyterPluginRegistry;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    registry = new JupyterPluginRegistry();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  it('should log plugin activation time with dependant count', async () => {
    const mockPlugins = new Map([
      [
        'slow-plugin',
        {
          id: 'slow-plugin',
          provides: { name: 'slow-service' }
        }
      ],
      [
        'dependent-plugin-1',
        {
          id: 'dependent-plugin-1',
          requires: [{ name: 'slow-service' }]
        }
      ],
      [
        'dependent-plugin-2',
        {
          id: 'dependent-plugin-2',
          requires: [{ name: 'slow-service' }]
        }
      ]
    ]);

    for (const [id, plugin] of mockPlugins) {
      (registry as any)._pluginData.set(id, plugin);
    }

    // Mock super.activatePlugin to return after 31 seconds
    jest
      .spyOn(PluginRegistry.prototype, 'activatePlugin')
      .mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(), 3000))
      );

    await registry.activatePlugin('slow-plugin');

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('slow-plugin')
    );
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('with 2 dependants')
    );
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('300') // About 3000
    );
  });
});
