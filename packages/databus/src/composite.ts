import { IConverterRegistry } from './converters';
import { IDataRegistry } from './dataregistry';
import { IVisualizerRegistry, IVisualizer } from './visualizers';
import { IResolverRegistry } from './resolverregistry';

/**
 * Registry that composes all other databus registries, to implement logic that require multiple of them.
 */
export class DataBusRegistry {
  constructor(
    public converters: IConverterRegistry,
    public data: IDataRegistry,
    public visualizers: IVisualizerRegistry,
    public resolvers: IResolverRegistry
  ) {}

  /**
   * Returns a list of all unique URLs of datasets.
   */
  dataURLs(): Set<URL> {
    const urls: Set<URL> = new Set();
    for (const dataset of this.data.datasets) {
      urls.add(dataset.url);
    }
    return urls;
  }

  /**
   * Returns a list of visualizers that work with some data URL.
   */
  visualizersForURL(url: URL): Set<IVisualizer<any>> {
    // Compute available mimetype for URL
    const availableMimeTypes: Set<string> = new Set();

    const { listTargetMimeTypes } = this.converters;
    function addMimeType(mimeType: string): void {
      if (availableMimeTypes.has(mimeType)) {
        return;
      }
      availableMimeTypes.add(mimeType);
      listTargetMimeTypes(mimeType).forEach(addMimeType);
    }

    for (const dataset of this.data.datasets) {
      if (dataset.url === url) {
        addMimeType(dataset.mimeType);
      }
    }

    // Compute available visualizers for mimetypes
    const visualizers: Set<IVisualizer<any>> = new Set();
    for (const mimeType of availableMimeTypes) {
      this.visualizers.filter(mimeType).forEach(visualizers.add);
    }
    return visualizers;
  }

  /**
   * Visualize a dataset with a certain URL
   * @param visualizer
   */
  visualizeURL(visualizer: IVisualizer);
}
