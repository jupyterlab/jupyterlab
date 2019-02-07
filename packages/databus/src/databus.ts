import { Token } from '@phosphor/coreutils';
import { IDisposable } from '@phosphor/disposable';
import { IConverterRegistry } from './converters';
import { Dataset, IDataRegistry } from './dataregistry';
import { resolveDataSet } from './resolvers';
import { createViewerMimeType, extractViewerLabel } from './viewers';

export interface IDataBusConfig {
  converters: IConverterRegistry;
  data: IDataRegistry;
}

/**
 * Registry that composes all other databus registries, to implement logic that require multiple of them.
 */
export class DataBus {
  public readonly converters: IConverterRegistry;
  public readonly data: IDataRegistry;
  constructor(config: IDataBusConfig) {
    this.converters = config.converters;
    this.data = config.data;
  }

  registerURL(url: URL): IDisposable | null {
    const dataset = resolveDataSet(url);
    if (this.data.contains(dataset)) {
      return null;
    }
    return this.data.publish(dataset);
  }

  possibleMimeTypesForURL(url: URL): Set<string> {
    return this.converters.listTargetMimeTypes(this.data.mimeTypesForURL(url));
  }
  /**
   * Returns the viewer labels for a given URL.
   */
  viewersForURL(url: URL): Set<string> {
    return new Set([...this.possibleMimeTypesForURL(url)]
      .map(extractViewerLabel)
      .filter(label => label !== null) as string[]);
  }

  /**
   * View a dataset with a certain URL with the viewer with a certain label.
   */
  async viewURL(url: URL, label: string): Promise<void> {
    this.registerURL(url);
    const viewer: Dataset<() => Promise<void>> = await this.convertByURL(
      url,
      createViewerMimeType(label)
    );
    await viewer.data();
  }

  /**
   * Returns a dataset of the the target mime type converted from existing
   * data types with the same URL.
   *
   * Any datasets that are created will be added to the registery.
   */
  async convertByURL(url: URL, targetMimeType: string): Promise<Dataset<any>> {
    let finalDataSet: Dataset<any>;
    for await (const dataset of this.converters.convert(
      this.data.filterByURL(url),
      targetMimeType
    )) {
      finalDataSet = dataset;
      if (!this.data.contains(dataset)) {
        this.data.publish(dataset);
      }
    }
    return finalDataSet!;
  }
}

export interface IDataBus extends DataBus {}
export const IDataBus = new Token<IDataBus>('@jupyterlab/databus:IDataBus');
