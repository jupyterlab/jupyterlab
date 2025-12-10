import { PluginRegistry } from '@lumino/coreutils';

export class JupyterPluginRegistry extends PluginRegistry {
  constructor() {
    super();
  }

  private getDependentCount(id: string): number {
    const plugin = (this as any)._plugins?.get(id);
    if (!plugin?.provides) return 0;

    const tokenName = plugin.provides.name;
    let dependentCount = 0;

    for (const otherPlugin of (this as any)._plugins?.values() ?? []) {
      if (otherPlugin.id === id) continue;

      const isDependant = otherPlugin.requires
        ?.filter((token: any) => !!token)
        .some((token: any) => token.name === tokenName);

      if (isDependant) {
        dependentCount++;
      }
    }

    return dependentCount;
  }

  async activatePlugin(id: string) {
    const startTime = performance.now();

    // Set a timeout to detect if the plugin stalls
    let timeoutId = setTimeout(() => {
      console.warn(`Plugin ${id} is taking too long to activate.`);
    }, 3000);

    try {
      const result = await super.activatePlugin(id);
      clearTimeout(timeoutId);
      const endTime = performance.now();
      const activationTime = endTime - startTime;

      if (activationTime > 3000) {
        const dependantCount = this.getDependentCount(id);
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
}
