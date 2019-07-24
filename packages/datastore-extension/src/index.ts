import datastorePlugin from './datastore';
import todoPlugin from './todo';
import { JupyterFrontEndPlugin } from '@jupyterlab/application';

export default [datastorePlugin, todoPlugin] as Array<
  JupyterFrontEndPlugin<any>
>;
