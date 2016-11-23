/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  ILayoutRestorer, LayoutRestorer
} from './layoutrestorer';


/**
 * The default layout restorer provider.
 */
export
const layoutRestorerProvider: JupyterLabPlugin<ILayoutRestorer> = {
  id: 'jupyter.services.layout-restorer',
  activate: (app: JupyterLab) => new LayoutRestorer(),
  autoStart: true
};
