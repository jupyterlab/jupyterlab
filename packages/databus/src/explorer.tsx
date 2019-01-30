/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { Token } from '@phosphor/coreutils';
import { Widget } from '@phosphor/widgets';
import { IDataRegistry, IDataset } from './dataregistry';
import { IConverterRegistry } from './converters';
import { ReactWidget, UseSignal } from '@jupyterlab/apputils';
import * as React from 'react';
import { IVisualizerRegistry, IVisualizer } from './visualizers';

// TODO: Maybe make converters clone URLs?
// URL is like UUID. Data with some URLs can is converted between.

function visualizers<V, T extends IDataset<V>>(
  dataset: T,
  visualizers: IVisualizerRegistry,
  converters: IConverterRegistry
): Iterable<IVisualizer<T>> {
  converters.listTargetMimeTypes(dataset.mimeType);
  visualizers.
}

function DatasetCompononent({ dataset }: { dataset: IDataset<any> }) {
  return (
    <div>
      <pre>{JSON.stringify(dataset)}</pre>
    </div>
  );
}

function DataExplorer(props: IDataExplorerOptions) {
  return (
    <div>
      <h2>Data Explorer</h2>
      <UseSignal signal={props.dataRegistry.datasetsChanged}>
        {() =>
          [...props.dataRegistry.datasets].map((dataset: IDataset<any>) => (
            // TODO: Add ID for object? How?
            // Keep weakmap of objects to IDs in registry: https://stackoverflow.com/a/35306050/907060
            <DatasetCompononent dataset={dataset} />
          ))
        }
      </UseSignal>
    </div>
  );
}

/**
 * Options to pass in to construct the data explorer widget.
 */
export interface IDataExplorerOptions {
  converterRegistry: IConverterRegistry;
  dataRegistry: IDataRegistry;
}

class DataExplorerWidget extends ReactWidget implements IDataExplorer {
  constructor(private _options: IDataExplorerOptions) {
    super();
    this.id = '@jupyterlab-databus/explorer';
    this.title.iconClass = 'jp-SpreadsheetIcon  jp-SideBar-tabIcon';
    this.title.caption = 'Data Explorer';
  }
  render() {
    return <DataExplorer {...this._options} />;
  }

  reveal(dataset: IDataset<any>): void {
    return;
  }
}

export function createDataExplorer(
  options: IDataExplorerOptions
): IDataExplorer {
  return new DataExplorerWidget(options);
}
/* tslint:disable */
export const IDataExplorer = new Token<IDataExplorer>(
  '@jupyterlab/databus:IDataExplorer'
);

export interface IDataExplorer extends Widget {
  /**
   * Highlights a dataset in the explorer.
   */
  reveal(dataset: IDataset<any>): void;
}
