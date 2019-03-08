/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { ReactWidget, UseSignal } from '@jupyterlab/apputils';
import { Token } from '@phosphor/coreutils';
import * as React from 'react';
import { IDataRegistry } from './dataregistry';
import { IActiveDataset } from './active';
import { Widget } from '@phosphor/widgets';
import { style, classes } from 'typestyle';
import { Classes } from '@blueprintjs/core';

const buttonClassName = style({
  color: '#2196F3',
  borderRadius: 2,
  background: '#FFFFFF',
  fontSize: 10,
  borderWidth: 0,
  marginRight: 12, // 2 + 10 spacer between
  padding: '2px 4px',
  $nest: {
    '&:active': {
      background: '#BDBDBD'
    },
    '&:active:hover': {
      background: '#BDBDBD'
    },
    '&:hover': {
      background: '#E0E0E0'
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
  paddingRight: 12,
  paddingLeft: 12,
  borderLeftWidth: 8,
  borderLeftColor: 'white',
  borderLeftStyle: 'solid',
  $nest: {
    '&:hover': {
      borderLeftColor: '#E0E0E0'
    },
    '&:active': {
      borderLeftColor: '#BDBDBD'
    },
    '&:active:hover': {
      borderLeftColor: '#BDBDBD'
    }
  }
});

const activeDatasetClassName = style({
  borderLeftColor: 'var(--jp-brand-color1)',
  $nest: {
    '&:hover': {
      borderLeftColor: 'var(--jp-brand-color1)'
    },
    '&:active': {
      borderLeftColor: 'var(--jp-brand-color1)'
    },
    '&:active:hover': {
      borderLeftColor: 'var(--jp-brand-color1)'
    }
  }
});

function DatasetCompononent({
  url,
  dataRegistry,
  active
}: {
  url: URL;
  dataRegistry: IDataRegistry;
  active: IActiveDataset;
}) {
  const classNames = [datasetClassName];
  if (active.active !== null && active.active.toString() === url.toString()) {
    classNames.push(activeDatasetClassName);
  }
  const viewers = [...dataRegistry.viewersForURL(url)];
  console.log('Dataset', {
    url,
    mimeType: dataRegistry.data.mimeTypesForURL(url),
    possible: dataRegistry.possibleMimeTypesForURL(url)
  });
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
          margin: 'unset',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          direction: 'rtl',
          textAlign: 'left'
        }}
      >
        {url.toString()}
      </h3>
      <span>
        {viewers.map((label: string) => (
          <Button
            key={label}
            onClick={() => dataRegistry.viewURL(url, label)}
            text={label}
          />
        ))}
      </span>
    </div>
  );
}

function Heading({
  search,
  onSearch
}: {
  search: string;
  onSearch: (search: string) => void;
}) {
  return (
    <h2
      style={{
        paddingTop: 8,
        paddingBottom: 6,
        paddingLeft: 12,
        paddingRight: 12,
        fontSize: 14,
        letterSpacing: '0.1em',
        margin: 'unset',
        color: '#333333',
        display: 'flex',
        justifyContent: 'space-between',
        borderBottom:
          'var(--jp-border-width) solid var(--jp-toolbar-border-color)',
        boxShadow: 'var(--jp-toolbar-box-shadow)'
      }}
    >
      Datasets
      <input
        type="text"
        placeholder="Search..."
        style={{ marginLeft: 12 }}
        className={classes(Classes.INPUT, Classes.SMALL)}
        value={search}
        onChange={event => onSearch(event.target.value)}
      />
    </h2>
  );
}

class DataExplorer extends React.Component<
  {
    dataRegistry: IDataRegistry;
    active: IActiveDataset;
  },
  { search: string }
> {
  state: { search: string } = {
    search: ''
  };

  urls(): Array<URL> {
    return [...this.props.dataRegistry.data.URLs].filter(
      url => url.toString().indexOf(this.state.search) !== -1
    );
  }
  render() {
    return (
      <div
        style={{
          background: '#FFFFFF',
          color: '#000000',
          fontFamily: 'Helvetica',
          height: '100%',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Heading
          search={this.state.search}
          onSearch={(search: string) => this.setState({ search })}
        />
        <div style={{ flex: 1, overflow: 'auto' }}>
          <UseSignal signal={this.props.dataRegistry.data.datasetsChanged}>
            {() => (
              <UseSignal signal={this.props.active.signal}>
                {() =>
                  this.urls().map((url: URL) => (
                    <DatasetCompononent
                      key={url.toString()}
                      url={url}
                      dataRegistry={this.props.dataRegistry}
                      active={this.props.active}
                    />
                  ))
                }
              </UseSignal>
            )}
          </UseSignal>
        </div>
      </div>
    );
  }
}

export function createDataExplorer(
  dataRegistry: IDataRegistry,
  active: IActiveDataset
): IDataExplorer {
  const widget = ReactWidget.create(
    <DataExplorer dataRegistry={dataRegistry} active={active} />
  );
  widget.id = '@jupyterlab-dataRegistry/explorer';
  widget.title.iconClass = 'jp-SpreadsheetIcon  jp-SideBar-tabIcon';
  widget.title.caption = 'Data Explorer';
  return widget;
}
/* tslint:disable */
export const IDataExplorer = new Token<IDataExplorer>(
  '@jupyterlab/dataRegistry:IDataExplorer'
);

export interface IDataExplorer extends Widget {}
