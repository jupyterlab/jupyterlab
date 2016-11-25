/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  IStateDB
} from '../statedb';

import {
  ILayoutRestorer, LayoutRestorer
} from './layoutrestorer';


/**
 * The default layout restorer provider.
 */
export
const layoutRestorerProvider: JupyterLabPlugin<ILayoutRestorer> = {
  id: 'jupyter.services.layout-restorer',
  activate: (app: JupyterLab, state: IStateDB) => {
    return new LayoutRestorer({ first: app.started, state });
  },
  autoStart: true,
  provides: ILayoutRestorer
};
