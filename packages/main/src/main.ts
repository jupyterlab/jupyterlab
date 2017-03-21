// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  polyfill
} from 'es6-promise';

import {
  JupyterLab, ModuleLoader
} from '@jupyterlab/application';

import 'font-awesome/css/font-awesome.min.css';
import '@jupyterlab/default-theme/style/index.css';


polyfill();


/* tslint:disable */
const mods: JupyterLab.IPluginModule[] = [
  require('@jupyterlab/about-extension'),
  require('@jupyterlab/application-extension'),
  require('@jupyterlab/apputils-extension'),
  require('@jupyterlab/codemirror-extension'),
  require('@jupyterlab/completer-extension'),
  require('@jupyterlab/console-extension'),
  require('@jupyterlab/csvwidget-extension'),
  require('@jupyterlab/docmanager-extension'),
  require('@jupyterlab/docregistry-extension'),
  require('@jupyterlab/editorwidget-extension'),
  require('@jupyterlab/faq-extension'),
  require('@jupyterlab/filebrowser-extension'),
  require('@jupyterlab/help-extension'),
  require('@jupyterlab/imagewidget-extension'),
  require('@jupyterlab/inspector-extension'),
  require('@jupyterlab/landing-extension'),
  require('@jupyterlab/launcher-extension'),
  require('@jupyterlab/markdownwidget-extension'),
  require('@jupyterlab/notebook-extension'),
  require('@jupyterlab/rendermime-extension'),
  require('@jupyterlab/running-extension'),
  require('@jupyterlab/services-extension'),
  require('@jupyterlab/shortcuts-extension'),
  require('@jupyterlab/terminal-extension'),
  require('@jupyterlab/tooltip-extension')
];
/* tslint:enable */


/**
 * Create an application object.
 *
 * @param loader - The module loader for the application.
 *
 * @returns A new application object.
 */
export
function createLab(loader: ModuleLoader): JupyterLab {
  const lab = new JupyterLab({
    loader,
    gitDescription: process.env.GIT_DESCRIPTION,
    namespace: 'jupyterlab',
    version: process.env.JUPYTERLAB_VERSION
  });
  lab.registerPluginModules(mods);
  return lab;
}
