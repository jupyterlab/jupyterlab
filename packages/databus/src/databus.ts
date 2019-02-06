import { Token } from '@phosphor/coreutils';
import { IDisposable } from '@phosphor/disposable';
import { IConverterRegistry } from './converters';
import { Dataset, IDataRegistry } from './dataregistry';
import { createFileConverter } from './files';
import { Resolver, resolverToConverter, createURLDataset } from './resolvers';
import {
  createViewerConverter,
  createViewerMimeType,
  extractViewerLabel,
  IViewerOptions,
  IWidgetViewerOptions,
  createWidgetViewerConverter
} from './viewers';
import { Widget } from '@phosphor/widgets';

/**
 * Registry that composes all other databus registries, to implement logic that require multiple of them.
 */
export class DataBus {
  constructor(
    public readonly converters: IConverterRegistry,
    public readonly data: IDataRegistry,
    private _getDownloadURL: (path: string) => Promise<URL>,
    private _displayWidget: (widget: Widget) => Promise<void>
  ) {}

  /**
   * Returns whether a file dataset can be recoginzed.
   *
   * i.e. checks whether it can be converted to anything useful.
   */
  validFileDataSet(dataset: Dataset<null>): boolean {
    return this.converters.listTargetMimeTypes([dataset.mimeType]).size > 1;
  }
  registerViewer(options: IViewerOptions<any>): IDisposable {
    return this.converters.register(createViewerConverter(options));
  }

  registerResolver(resolver: Resolver<any>): IDisposable {
    return this.converters.register(resolverToConverter(resolver));
  }
  registerFileResolver(extension: string, mimeType: string): IDisposable {
    return this.converters.register(
      createFileConverter(this._getDownloadURL, extension, mimeType)
    );
  }

  registerWidgetViewer(options: IWidgetViewerOptions<any>): IDisposable {
    return this.converters.register(
      createWidgetViewerConverter(this._displayWidget, options)
    );
  }

  possibleMimeTypesForURL(url: URL): Set<string> {
    return this.converters.listTargetMimeTypes(this.data.mimeTypesForURL(url));
  }
  /**
   * Returns the viewer labels for a given URL.
   */
  viewersForURL(url: URL): Set<string> {
    return new Set(
      [...this.possibleMimeTypesForURL(url)]
        .map(extractViewerLabel)
        .filter(label => label !== null)
    );
  }

  /**
   * View a dataset with a certain URL with the viewer with a certain label.
   */
  async viewURL(url: URL, label: string): Promise<void> {
    console.log('Trying to view URL');
    if (this.data.filterByURL(url).size === 0) {
      this.data.publish(createURLDataset(url));
    }

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
    return finalDataSet;
  }
}

export interface IDataBus extends DataBus {}
export const IDataBus = new Token<IDataBus>('@jupyterlab/databus:IDataBus');
