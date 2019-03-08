/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import {
  IConverterRegistry,
  URLStringConverter,
  resolverURLConverter
} from '@jupyterlab/dataregistry';

export default {
  activate,
  id: '@jupyterlab/dataregistry-extension:urls',
  requires: [IConverterRegistry],
  autoStart: true
} as JupyterFrontEndPlugin<void>;

function activate(app: JupyterFrontEnd, converters: IConverterRegistry) {
  converters.register(URLStringConverter);
  converters.register(resolverURLConverter);
}
