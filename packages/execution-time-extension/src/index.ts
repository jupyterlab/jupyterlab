/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

/**
 * The Execution Time extension.
 */
const plugin: JupyterLabPlugin<void> = {
    activate,
    id: '@jupyterlab/execution-time-extension:plugin',
    requires: [],
    autoStart: true
};
export default plugin;

/**
 * Activate the Execution Time plugin.
 */
function activate(app: JupyterLab): void {
    console.log('I am alive.');
}

