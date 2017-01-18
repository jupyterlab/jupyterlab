// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  TooltipWidget
} from './index';


/**
 * The tooltip extension.
 */
const plugin: JupyterLabPlugin<void> = {
  activate,
  id: 'jupyter.extensions.tooltip',
  autoStart: true
};


/**
 * Export the plugin as default.
 */
export default plugin;


/**
 * Activate the tooltip.
 */
function activate(app: JupyterLab): void {
  console.log('initialized tooltip plugin', TooltipWidget);
}
