/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { Token } from '@phosphor/coreutils';
import { Widget } from '@phosphor/widgets';
import { IDataRegistry } from './dataregistry';
import { IConverterRegistry } from './converters';

export interface IDataExplorerOptions {
  converterRegistry: IConverterRegistry;
  dataRegistry: IDataRegistry;
}
export function createDataExplorer(
  options: IDataExplorerOptions
): IDataExplorer {
  const widget = new Widget();
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
