/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { IDatastore } from '@jupyterlab/datastore';

const plugin: JupyterFrontEndPlugin<IDatastore> = {
  id: '@jupyterlab/datastore-extension:datastore',
  autoStart: true,
  provides: IDatastore,
  activate: (app: JupyterFrontEnd): IDatastore => {
    console.log('activating');
    return {
      test: () => null
    };
  }
};
export default [plugin];
