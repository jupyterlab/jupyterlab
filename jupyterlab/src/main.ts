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
  require('../../lib/application/plugin'),
  require('../../lib/codemirror/plugin'),
  require('../../lib/application-extension'),
  require('../../lib/apputils/plugin'),
  require('../../lib/codemirror-extension'),
  require('../../lib/commandlinker/plugin'),
  require('../../lib/commandpalette/plugin'),
  require('../../lib/completer-extension'),
  require('../../lib/console-extension'),
  require('../../lib/csvwidget/plugin'),
  require('../../lib/docmanager/plugin'),
  require('../../lib/docregistry/plugin'),
  require('../../lib/editorwidget/plugin'),
  require('../../lib/faq-extension'),
  require('../../lib/filebrowser/plugin'),
  require('../../lib/help-extension'),
  require('../../lib/imagewidget/plugin'),
  require('../../lib/inspector/plugin'),
  require('../../lib/landing-extension'),
  require('../../lib/launcher/plugin'),
  require('../../lib/mainmenu/plugin'),
  require('../../lib/markdownwidget/plugin'),
  require('../../lib/notebook/plugin'),
  require('../../lib/rendermime/plugin'),
  require('../../lib/running/plugin'),
  require('../../lib/services/plugin'),
  require('../../lib/shortcuts-extension'),
  require('../../lib/statedb/plugin'),
  require('../../lib/terminal/plugin'),
  require('../../lib/tooltip/plugin')
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
