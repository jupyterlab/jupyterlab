import { IPlugin, PluginRegistry, Token } from '@lumino/coreutils';

const PLUGIN_ACTIVATION_TIMEOUT = 3000;

export class JupyterPluginRegistry<T = any> extends PluginRegistry<T> {
  registerPlugin(plugin: IPlugin<T, any>): void {
    this._pluginData.set(plugin.id, plugin);
    return super.registerPlugin(plugin);
  }

  async activatePlugin(id: string) {
    const startTime = performance.now();

    // Set a timeout to detect if the plugin stalls
    let timeoutId = setTimeout(() => {
      console.warn(`Plugin ${id} is taking too long to activate.`);
    }, PLUGIN_ACTIVATION_TIMEOUT);

    try {
      const result = await super.activatePlugin(id);
      clearTimeout(timeoutId);
      const endTime = performance.now();
      const activationTime = endTime - startTime;

      if (activationTime >= PLUGIN_ACTIVATION_TIMEOUT) {
        const dependantCount = this._getDependentCount(id);
        console.warn(
          `Plugin ${id} (with ${dependantCount} dependants) took ${activationTime.toFixed(
            2
          )}ms to activate.`
        );
      }

      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      console.error(`Error activating plugin: ${id}`, error);
      throw error;
    }
  }

  private _getDependentCount(id: string): number {
    const plugin = this._pluginData.get(id);
    if (!plugin?.provides) return 0;

    const tokenName = plugin.provides.name;
    let dependentCount = 0;

    for (const [otherId, otherPlugin] of this._pluginData.entries()) {
      if (otherId === id) continue;

      const isDependant = otherPlugin.requires
        ?.filter((token: Token<any>) => !!token)
        .some((token: Token<any>) => token.name === tokenName);

      if (isDependant) {
        dependentCount++;
      }
    }

    return dependentCount;
  }

  private _pluginData: Map<string, IPlugin<T, any>> = new Map();
}
