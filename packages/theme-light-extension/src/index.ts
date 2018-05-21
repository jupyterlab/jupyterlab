// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  IRecoveryTheme, IThemeManager
} from '@jupyterlab/apputils';


/**
 * The Jupyter Light Theme stylesheet.
 */
const style = '@jupyterlab/theme-light-extension/index.css';


/**
 * A plugin for the Jupyter Light Theme.
 */
const theme: JupyterLabPlugin<void> = {
  id: '@jupyterlab/theme-light-extension:plugin',
  requires: [IThemeManager],
  activate: function(app: JupyterLab, manager: IThemeManager) {
    manager.register({
      name: 'JupyterLab Light',
      load: () => manager.loadCSS(style),
      unload: () => Promise.resolve(undefined)
    });
  },
  autoStart: true
};


/**
 * A plugin for the Jupyter Light Theme.
 */
const recoveryTheme: JupyterLabPlugin<IRecoveryTheme> = {
  id: '@jupyterlab/theme-light-extension:recovery',
  requires: [IThemeManager],
  activate: (app: JupyterLab, manager: IThemeManager) => manager.loadCSS(style),
  autoStart: true,
  provides: IRecoveryTheme
};


/**
 * Export the plugins as default.
 */
const plugins: JupyterLabPlugin<any>[] = [theme, recoveryTheme];
export default plugins;
