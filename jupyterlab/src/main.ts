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
  require('../../lib/plugin-about'),
  require('../../lib/application/plugin'),
  require('../../lib/codemirror/plugin'),
  require('../../lib/commandlinker/plugin'),
  require('../../lib/commandpalette/plugin'),
  require('../../lib/completer/plugin'),
  require('../../lib/console/plugin'),
  require('../../lib/csvwidget/plugin'),
  require('../../lib/docmanager/plugin'),
  require('../../lib/docregistry/plugin'),
  require('../../lib/editorwidget/plugin'),
  require('../../lib/plugin-faq'),
  require('../../lib/filebrowser/plugin'),
  require('../../lib/help/plugin'),
  require('../../lib/imagewidget/plugin'),
  require('../../lib/inspector/plugin'),
  require('../../lib/landing/plugin'),
  require('../../lib/launcher/plugin'),
  require('../../lib/instancerestorer/plugin'),
  require('../../lib/mainmenu/plugin'),
  require('../../lib/markdownwidget/plugin'),
  require('../../lib/notebook/plugin'),
  require('../../lib/rendermime/plugin'),
  require('../../lib/running/plugin'),
  require('../../lib/services/plugin'),
  require('../../lib/shortcuts/plugin'),
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
