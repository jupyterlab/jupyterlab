import todoPlugin from './todo';
import { JupyterFrontEndPlugin } from '@jupyterlab/application';

export default [todoPlugin] as Array<JupyterFrontEndPlugin<any>>;
