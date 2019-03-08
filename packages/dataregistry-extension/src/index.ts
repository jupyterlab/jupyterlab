/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { JupyterFrontEndPlugin } from '@jupyterlab/application';
import converterRegistryPlugin from './converters';
import dataRegistryPlugin from './dataregistry';
import datasetsPlugin from './datasets';
import dataExplorerPlugin from './explorer';
import filesPlugin from './files';
import snippetsPlugin from './snippets';
import widgetPlugin from './widgets';
import URLPlugin from './urls';
import renderMimePlugin from './rendermime';
import activePlugin from './active';
import filePlugin from './file';

export default [
  dataRegistryPlugin,
  converterRegistryPlugin,
  dataExplorerPlugin,
  datasetsPlugin,
  filesPlugin,
  widgetPlugin,
  snippetsPlugin,
  URLPlugin,
  renderMimePlugin,
  activePlugin,
  filePlugin
] as JupyterFrontEndPlugin<any>[];
