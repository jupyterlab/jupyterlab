/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { ReactWidget, UseSignal } from '@jupyterlab/apputils';
import { Token } from '@phosphor/coreutils';
import * as React from 'react';
import { IDataBus } from './databus';

function MimeTypesComponent({ mimeTypes }: { mimeTypes: Iterable<string> }) {
  return (
    <ul>
      {[...mimeTypes].map(mimeType => (
        <li>
          <pre>{mimeType}</pre>
        </li>
      ))}
    </ul>
  );
}

function DatasetCompononent({
  url,
  databus,
  active
}: {
  url: URL;
  databus: IDataBus;
  active: boolean;
}) {
  return (
    <div style={{ backgroundColor: active ? 'grey' : 'white' }}>
      <h3>URL:</h3>
      <pre>{url.toString()}</pre>
      <h3>MimeTypes:</h3>
      <MimeTypesComponent mimeTypes={databus.data.mimeTypesForURL(url)} />
      <h3>Possible MimeTypes:</h3>
      <MimeTypesComponent mimeTypes={databus.possibleMimeTypesForURL(url)} />
      <h3>Viewers:</h3>
      <span>
        {[...databus.viewersForURL(url)].map((label: string) => (
          <button onClick={() => databus.viewURL(url, label)}>{label}</button>
        ))}
      </span>
    </div>
  );
}

function DataExplorer({
  databus,
  activeURL
}: {
  databus: IDataBus;
  activeURL: URL | null;
}) {
  return (
    <div>
      <h2>Data Explorer</h2>
      <UseSignal signal={databus.data.datasetsChanged}>
        {() =>
          [...databus.data.URLs].map((url: URL) => (
            // TODO: Add ID for object? How?
            // Keep weakmap of objects to IDs in registry: https://stackoverflow.com/a/35306050/907060
            <DatasetCompononent
              url={url}
              databus={databus}
              active={
                activeURL !== null && activeURL.toString() === url.toString()
              }
            />
          ))
        }
      </UseSignal>
    </div>
  );
}

class DataExplorerWidget extends ReactWidget implements IDataExplorer {
  constructor(private _databus: IDataBus) {
    super();
    this.id = '@jupyterlab-databus/explorer';
    this.title.iconClass = 'jp-SpreadsheetIcon  jp-SideBar-tabIcon';
    this.title.caption = 'Data Explorer';
    this._activeURL = null;
  }
  render() {
    return <DataExplorer databus={this._databus} activeURL={this._activeURL} />;
  }

  reveal(url: URL): void {
    this._activeURL = url;
    this.update();
  }
  private _activeURL: URL | null;
}

export function createDataExplorer(databus: IDataBus): IDataExplorer {
  return new DataExplorerWidget(databus);
}
/* tslint:disable */
export const IDataExplorer = new Token<IDataExplorer>(
  '@jupyterlab/databus:IDataExplorer'
);

export interface IDataExplorer extends DataExplorerWidget {}
