/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { JupyterLab, JupyterLabPlugin } from '@jupyterlab/application';
import { IConverterRegistry, URLStringConverter } from '@jupyterlab/databus';

export default {
  activate,
  id: '@jupyterlab/databus-extension:urls',
  requires: [IConverterRegistry],
  autoStart: true
} as JupyterLabPlugin<void>;

function activate(app: JupyterLab, converters: IConverterRegistry) {
  converters.register(URLStringConverter);
}
