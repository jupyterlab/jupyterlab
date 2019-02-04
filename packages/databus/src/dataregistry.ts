/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { Token } from '@phosphor/coreutils';
import { DisposableDelegate, IDisposable } from '@phosphor/disposable';
import { ISignal, Signal } from '@phosphor/signaling';

/**
 * A class class for a dataset, with a mimetype, URI, and data.
 *
 * This is templated over the type of data `T`.
 *
 * #### Notes
 * This interface is similar conceptually to that of nbformat.IMimeBundle,
 * but with only a single mimetype and different structure. We expect there
 * to be utilities to convert between this formats.
 */
export class Dataset<T> {
  constructor(mimetype: string, url: URL, data: T) {
    this.mimeType = mimetype;
    this.url = url;
    this.data = data;
  }

  /**
   * The string mimetype for the dataset.
   */
  readonly mimeType: string;

  /**
   * A persistent URL that points to the dataset.
   *
   * #### Notes
   * This can be used by other extensions and services to maintain
   * persistent pointers to datasets across sessions. It is also used interally
   * to understand that new datasets produced by conversions refer to the same
   * dataset. The term "URL" is prefered over "URI" by the WHATWG:
   * https://url.spec.whatwg.org/#goals
   */
  readonly url: URL;

  /***
   * The data of the dataset.
   *
   * #### Notes
   * The notion of data in the databus is completely abstract, and templated
   * over. Publishers and consumers of a given mimetype will need to agree
   * what the actual data is and cast it appropriately before use.
   */
  readonly data: T;

  /**
   * Checks whether this dataset has the same fields as another.
   */
  equals(other: Dataset<T>): boolean {
    return (
      this.mimeType === other.mimeType &&
      this.url === other.url &&
      this.data === other.data
    );
  }
}

/**
 * A data registry object, for managing datasets in JupyterLab.
 */
export class DataRegistry {
  /**
   * Publish a dataset to the data registry.
   *
   * @param dataset - the `IDataset` to publish to the data registry.
   *
   * @returns A disposable which will remove the dataset.
   *
   * @throws An error if the given dataset is already published.
   */
  publish(dataset: Dataset<any>): IDisposable {
    if (this.contains(dataset)) {
      throw new Error(`Dataset already published`);
    }

    this._datasets.add(dataset);

    this._datasetsChanged.emit({ dataset, type: 'added' });

    return new DisposableDelegate(() => {
      this._datasets.delete(dataset);
      this._datasetsChanged.emit({ dataset, type: 'removed' });
    });
  }

  /**
   * Filter the published datasets using a filtering function.
   *
   * @param func - A function to use for filtering.
   *
   * @returns An set of matching `IDataset` objects.
   */
  filter<T extends Dataset<any>>(
    func: (value: Dataset<any>) => value is T
  ): Set<T> {
    let result: Set<T> = new Set();
    this._datasets.forEach((value: T) => {
      if (func(value)) {
        result.add(value);
      }
    });
    return result;
  }

  /**
   * Filters the datasets to this with a certain URL.
   */
  filterByURL(url: URL): Set<Dataset<any>> {
    return new Set([...this._datasets].filter(dataset => dataset.url === url));
  }

  mimeTypesForURL(url: URL): Set<string> {
    return new Set([...this.filterByURL(url)].map(dataset => dataset.mimeType));
  }

  /**
   * Returns if the registry contains a dataset.
   */
  contains(dataset: Dataset<any>): boolean {
    for (const other of this._datasets) {
      if (dataset.equals(other)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Return a set of all published datasets.
   */
  get datasets(): Set<Dataset<any>> {
    return new Set(this._datasets);
  }

  /**
   * Return a set of all dataset URLs.
   */
  get URLs(): Set<URL> {
    return new Set([...this._datasets].map(d => d.url));
  }

  /**
   * A signal that will fire when datasets are published or removed.
   */
  get datasetsChanged(): ISignal<this, DataRegistry.IDatasetsChangedArgs> {
    return this._datasetsChanged;
  }

  private _datasets: Set<Dataset<any>> = new Set();
  private _datasetsChanged = new Signal<
    this,
    DataRegistry.IDatasetsChangedArgs
  >(this);
}

/**
 * A public namespace for the databus.
 */
export namespace DataRegistry {
  /**
   * An interface for the changed args of the dataset changed signal.
   */
  export interface IDatasetsChangedArgs {
    /**
     * The dataset begin added or removed.
     */
    readonly dataset: Dataset<any>;

    /**
     * The type of change.
     */
    readonly type: 'added' | 'removed';
  }
}
/* tslint:disable */
export const IDataRegistry = new Token<IDataRegistry>(
  '@jupyterlab/databus:IDataRegistry'
);

export interface IDataRegistry extends DataRegistry {}
