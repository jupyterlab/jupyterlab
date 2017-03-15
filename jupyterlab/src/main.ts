// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  polyfill
} from 'es6-promise';

import {
  JupyterLab, ModuleLoader
} from '../../lib/application';

import 'font-awesome/css/font-awesome.min.css';
import '../../lib/default-theme/index.css';


polyfill();


/* tslint:disable */
const mods: JupyterLab.IPluginModule[] = [
  require('../../lib/about-extension'),
  require('../../lib/application-extension'),
  require('../../lib/apputils-extension'),
  require('../../lib/codemirror-extension'),
  require('../../lib/completer-extension'),
  require('../../lib/console-extension'),
  require('../../lib/csvwidget-extension'),
  require('../../lib/docmanager-extension'),
  require('../../lib/docregistry-extension'),
  require('../../lib/editorwidget-extension'),
  require('../../lib/faq-extension'),
  require('../../lib/filebrowser-extension'),
  require('../../lib/help-extension'),
  require('../../lib/imagewidget-extension'),
  require('../../lib/inspector-extension'),
  require('../../lib/landing-extension'),
  require('../../lib/launcher-extension'),
  require('../../lib/markdownwidget-extension'),
  require('../../lib/notebook-extension'),
  require('../../lib/rendermime-extension'),
  require('../../lib/running-extension'),
  require('../../lib/services-extension'),
  require('../../lib/shortcuts-extension'),
  require('../../lib/terminal-extension'),
  require('../../lib/tooltip-extension')
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
    version: require('../../package.json').version
  });
  lab.registerPluginModules(mods);
  return lab;
}
