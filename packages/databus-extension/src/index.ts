/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { JupyterLab, JupyterLabPlugin } from '@jupyterlab/application';
import {
  IDataRegistry,
  IConverterRegistry,
  DataRegistry,
  ConverterRegistry
} from '@jupyterlab/databus';

/**
 * The data registry extension.
 */
const dataRegistryPlugin: JupyterLabPlugin<IDataRegistry> = {
  activate: activateDataRegistry,
  id: '@jupyterlab/databus-extension:data-registry',
  requires: [],
  provides: IDataRegistry,
  autoStart: true
};

/**
 * The converter registry extension.
 */
const converterRegistryPlugin: JupyterLabPlugin<IConverterRegistry> = {
  activate: activateConverterRegistry,
  id: '@jupyterlab/databus-extension:converter-registry',
  requires: [],
  provides: IConverterRegistry,
  autoStart: true
};

const plugins: JupyterLabPlugin<any>[] = [
  dataRegistryPlugin,
  converterRegistryPlugin
];
export default plugins;

function activateDataRegistry(app: JupyterLab): IDataRegistry {
  return new DataRegistry();
}

function activateConverterRegistry(app: JupyterLab): IConverterRegistry {
  return new ConverterRegistry();
}
