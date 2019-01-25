/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { JupyterLabPlugin } from '@jupyterlab/application';

import dataRegistryPlugin from './dataregistry';
import converterRegistryPlugin from './converters';
import filePlugin from './files';
import dataExplorerPlugin from './explorer';
import resolverRegistryPlugin from './resolverregistry';
export default [
  dataRegistryPlugin,
  converterRegistryPlugin,
  filePlugin,
  dataExplorerPlugin,
  resolverRegistryPlugin
] as JupyterLabPlugin<any>[];
