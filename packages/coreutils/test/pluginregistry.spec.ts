import { JupyterPluginRegistry } from '@jupyterlab/coreutils';
import { IPlugin, PluginRegistry, Token } from '@lumino/coreutils';

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
    const slowPluginToken = new Token<any>('slow-plugin-token');
    const mockPlugins: IPlugin<any, any>[] = [
      {
        id: 'slow-plugin',
        provides: slowPluginToken,
        activate: () => {}
      },
      {
        id: 'dependent-plugin-1',
        requires: [slowPluginToken],
        activate: () => {}
      },
      {
        id: 'dependent-plugin-2',
        requires: [slowPluginToken],
        activate: () => {}
      }
    ];
    registry.registerPlugins(mockPlugins);

    // Mock super.activatePlugin to return after 3 seconds
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
