/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { JupyterLabPlugin } from '@jupyterlab/application';

import dataRegistryPlugin from './dataregistry';
import converterRegistryPlugin from './converters';
import docRegistryPlugin from './docregistry';
import dataExplorerPlugin from './explorer';

export default [
  dataRegistryPlugin,
  converterRegistryPlugin,
  docRegistryPlugin,
  dataExplorerPlugin
] as JupyterLabPlugin<any>[];
