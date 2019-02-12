/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { ReactWidget, UseSignal } from '@jupyterlab/apputils';
import { Token } from '@phosphor/coreutils';
import * as React from 'react';
import { IDataBus } from './databus';
import { IActiveDataset } from './active';
import { Widget } from '@phosphor/widgets';

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
  active: IActiveDataset;
}) {
  const isActive =
    active.active !== null && active.active.toString() === url.toString();
  return (
    <div
      style={{ backgroundColor: isActive ? 'grey' : 'white' }}
      onClick={() => (active.active = url)}
    >
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
  active
}: {
  databus: IDataBus;
  active: IActiveDataset;
}) {
  return (
    <div>
      <h2>Data Explorer</h2>
      <UseSignal signal={databus.data.datasetsChanged}>
        {() => (
          <UseSignal signal={active.signal}>
            {() =>
              [...databus.data.URLs].map((url: URL) => (
                // TODO: Add ID for object? How?
                // Keep weakmap of objects to IDs in registry: https://stackoverflow.com/a/35306050/907060
                <DatasetCompononent
                  url={url}
                  databus={databus}
                  active={active}
                />
              ))
            }
          </UseSignal>
        )}
      </UseSignal>
    </div>
  );
}

export function createDataExplorer(
  databus: IDataBus,
  active: IActiveDataset
): IDataExplorer {
  const widget = ReactWidget.create(
    <DataExplorer databus={databus} active={active} />
  );
  widget.id = '@jupyterlab-databus/explorer';
  widget.title.iconClass = 'jp-SpreadsheetIcon  jp-SideBar-tabIcon';
  widget.title.caption = 'Data Explorer';
  return widget;
}
/* tslint:disable */
export const IDataExplorer = new Token<IDataExplorer>(
  '@jupyterlab/databus:IDataExplorer'
);

export interface IDataExplorer extends Widget {}
