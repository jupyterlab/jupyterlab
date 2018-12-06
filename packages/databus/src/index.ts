/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { DisposableDelegate, IDisposable } from '@phosphor/disposable';

import { ArrayExt } from '@phosphor/algorithm';

import { ISignal, Signal } from '@phosphor/signaling';

/**
 * An interface for an abstract dataset, with a mimetype, data, and metadata.
 *
 * #### Notes
 * This interface is similar conceptually to that of nbformat.IMimeBundle,
 * but with only a single mimetype and different structure. We expect there
 * to be utilities to convert between this formats.
 */
export interface IDataset {
  /**
   * The string mimetype for the dataset.
   */
  mimeType: string;

  /***
   * The data of the dataset.
   *
   * #### Notes
   * The notion of data in the databus is completely abstract, and typed as an
   * any. Publishers and consumers of a given mimetype will need to agree
   * what the actual data is and cast it appropriately before use.
   */
  data: any;

  /**
   * The metadata associate with the dataset.
   *
   * #### Notes
   * Like the data itself, the databus notion of metadata is entirely abstract.
   * We are currently exploring different metadata schemes, so this may change
   * in the future.
   */
  metadata: any;
}

/**
 * A databus object, for managing datasets in JupyterLab.
 */
export class DataBus {
  /**
   * Construct a new databus.
   */
  constructor() {}

  /**
   * Publish a dataset to the databus.
   *
   * @param dataset - the `IDataset` to publish to the databus.
   *
   * @returns A disposable which will remove the dataset.
   *
   * @throws An error if the given dataset is already published.
   */
  publish(dataset: IDataset): IDisposable {
    if (this._datasets.find(i => i === dataset) === undefined) {
      throw new Error(`Dataset already published`);
    }

    var index = this._datasets.push(dataset) - 1;

    this._datasetsChanged.emit({ dataset, type: 'added' });

    return new DisposableDelegate(() => {
      ArrayExt.removeAt(this._datasets, index);
      this._datasetsChanged.emit({ dataset, type: 'removed' });
    });
  }

  /**
   * Filter the published datasets by a mime type.
   *
   * @param mimeType - The `mimeType` to filter on.
   *
   * @returns An array of matching `IDataset` objects.
   */
  filter(mimeType: string): Array<IDataset> {
    return this._datasets.filter(dataset => {
      if ((dataset as IDataset).mimeType === mimeType) {
        return dataset;
      }
    });
  }

  /**
   * Return a list of all published datasets.
   */
  get datasets(): Array<IDataset> {
    return this._datasets;
  }

  /**
   * A signal that will fire when datasets are published or removed.
   */
  get datasetsChanged(): ISignal<this, DataBus.IDatasetsChangedArgs> {
    return this._datasetsChanged;
  }

  private _datasets: Array<IDataset> = [];
  private _datasetsChanged = new Signal<this, DataBus.IDatasetsChangedArgs>(
    this
  );
}

/**
 * A public namespace for the databus.
 */
export namespace DataBus {
  /**
   * An interface for the changed args of the dataset changed signal.
   */
  export interface IDatasetsChangedArgs {
    /**
     * The dataset begin added or removed.
     */
    readonly dataset: IDataset;

    /**
     * The type of change.
     */
    readonly type: 'added' | 'removed';
  }
}
