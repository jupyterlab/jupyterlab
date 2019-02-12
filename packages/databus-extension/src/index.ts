/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { JupyterLabPlugin } from '@jupyterlab/application';

import dataRegistryPlugin from './dataregistry';
import converterRegistryPlugin from './converters';
import dataExplorerPlugin from './explorer';
import dataBusPlugin from './databus';
import filePlugin from './files';
export default [
  dataRegistryPlugin,
  converterRegistryPlugin,
  dataExplorerPlugin,
  dataBusPlugin,
  filePlugin
] as JupyterLabPlugin<any>[];
