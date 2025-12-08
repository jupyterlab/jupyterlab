import { PluginRegistry } from '@lumino/coreutils';

export class JPPluginRegistry extends PluginRegistry {
  constructor() {
    super();
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

      if (activationTime > 30000) {
        console.warn(`Plugin ${id} took ${activationTime}ms to activate.`);
      }

      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      console.error(`Error activating plugin: ${id}`, error);
      throw error;
    }
  }
}
