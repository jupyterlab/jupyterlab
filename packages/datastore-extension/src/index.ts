/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { IDataStore } from '@jupyterlab/datastore';

const plugin: JupyterFrontEndPlugin<IDataStore> = {
  id: '@jupyterlab/datastore-extension:datastore',
  autoStart: true,
  provides: IDataStore,
  activate: (app: JupyterFrontEnd): IDataStore => {
    console.log('activating');
    return {
      test: () => null
    };
  }
};
export default [plugin];
