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
import { style, classes } from 'typestyle';

const buttonClassName = style({
  color: '#2196F3',
  borderRadius: 2,
  background: '#FFFFFF',
  fontSize: 10,
  borderWidth: 0,
  margin: 2,
  marginRight: 12, // 2 + 10 spacer between
  paddingRight: 2,
  paddingLeft: 2,
  paddingTop: 4,
  paddingBottom: 4,
  $nest: {
    '&:hover': {
      background: '#E0E0E0'
    },
    '&:active': {
      background: '#BDBDBD'
    }
  }
});

function Button({ onClick, text }: { onClick: () => void; text: string }) {
  return (
    <button className={buttonClassName} onClick={onClick}>
      {text}
    </button>
  );
}

const datasetClassName = style({
  borderBottom: '1px solid #E0E0E0',
  color: '#333333',
  padding: 4,
  $nest: {
    '&:hover': {
      background: '#F2F2F2'
    }
  }
});

const activeDatasetClassName = style({
  backgroundColor: '#E0E0E0',
  $nest: {
    '&:hover': {
      background: '#E0E0E0'
    }
  }
});

function DatasetCompononent({
  url,
  databus,
  active
}: {
  url: URL;
  databus: IDataBus;
  active: IActiveDataset;
}) {
  const classNames = [datasetClassName];
  if (active.active !== null && active.active.toString() === url.toString()) {
    classNames.push(activeDatasetClassName);
  }
  const viewers = [...databus.viewersForURL(url)];
  viewers.sort();
  return (
    <div
      className={classes(...classNames)}
      onClick={() => (active.active = url)}
    >
      <h3
        style={{
          fontSize: 12,
          fontWeight: 'unset',
          margin: 'unset'
        }}
      >
        {url.toString()}
      </h3>
      <h3
        style={{
          fontSize: 10,
          fontWeight: 'unset',
          paddingTop: 12,
          paddingBottom: 4,
          margin: 'unset'
        }}
      >
        Launch:
      </h3>
      <span>
        {viewers.map((label: string) => (
          <Button onClick={() => databus.viewURL(url, label)} text={label} />
        ))}
      </span>
    </div>
  );
}

function Name() {
  return (
    <div
      style={{
        height: 27,
        paddingTop: 8,
        paddingLeft: 8,
        borderBottom: '1px solid #E0E0E0',
        fontSize: 13
      }}
    >
      [ADRF] : sensitive_project
    </div>
  );
}

function Heading() {
  return (
    <h2
      style={{
        paddingTop: 8,
        paddingBottom: 6,
        fontSize: 14,
        textAlign: 'center',
        letterSpacing: '0.1em',
        margin: 'unset',
        color: '#333333',
        borderBottom: '1px solid #E0E0E0'
      }}
    >
      Project Datasets
    </h2>
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
    <div
      style={{
        background: '#FFFFFF',
        color: '#000000',
        fontFamily: 'Helvetica'
      }}
    >
      <Name />
      <Heading />
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
