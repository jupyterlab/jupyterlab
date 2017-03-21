// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  polyfill
} from 'es6-promise';

import {
  JupyterLab, ModuleLoader
} from '@jupyterlab/application';

import {
  default as aboutExtension
} from '@jupyterlab/about-extension';

import {
  default as applicationExtension
} from '@jupyterlab/application-extension';

import {
  default as apputilsExtension
} from '@jupyterlab/apputils-extension';

import {
  default as codemirrorExtension
} from '@jupyterlab/codemirror-extension';

import {
  default as completerExtension
} from '@jupyterlab/completer-extension';

import {
  default as consoleExtension
} from '@jupyterlab/console-extension';

import {
  default as csvwidgetExtension
} from '@jupyterlab/csvwidget-extension';

import {
  default as docmanagerExtension
} from '@jupyterlab/docmanager-extension';

import {
  default as docregistryExtension
} from '@jupyterlab/docregistry-extension';

import {
  default as editorwidgetExtension
} from '@jupyterlab/editorwidget-extension';

import {
  default as faqExtension
} from '@jupyterlab/faq-extension';

import {
  default as filebrowserExtension
} from '@jupyterlab/filebrowser-extension';

import {
  default as helpExtension
} from '@jupyterlab/help-extension';

import {
  default as imagewidgetExtension
} from '@jupyterlab/imagewidget-extension';

import {
  default as inspectorExtension
} from '@jupyterlab/inspector-extension';

import {
  default as landingExtension
} from '@jupyterlab/landing-extension';

import {
  default as launchExtension
} from '@jupyterlab/launcher-extension';

import {
  default as markdownwidgetExtension
} from '@jupyterlab/markdownwidget-extension';

import {
  default as notebookExtension
} from '@jupyterlab/notebook-extension';

import {
  default as rendermimeExtension
} from '@jupyterlab/rendermime-extension';

import {
  default as runningExtension
} from '@jupyterlab/running-extension';

import {
  default as servicesExtension
} from '@jupyterlab/services-extension';

import {
  default as shortcutsExtension
} from '@jupyterlab/shortcuts-extension';

import {
  default as terminalExtension
} from '@jupyterlab/terminal-extension';

import {
  default as tooltipExtension
} from '@jupyterlab/tooltip-extension';

import 'font-awesome/css/font-awesome.min.css';
import '@jupyterlab/default-theme/style/index.css';


polyfill();


/* tslint:disable */
const mods: JupyterLab.IPluginModule[] = [
aboutExtension,
applicationExtension,
apputilsExtension,
codemirrorExtension,
completerExtension,
consoleExtension,
csvwidgetExtension,
docmanagerExtension,
docregistryExtension,
editorwidgetExtension,
faqExtension,
filebrowserExtension,
helpExtension,
imagewidgetExtension,
inspectorExtension,
landingExtension,
launchExtension,
markdownwidgetExtension,
notebookExtension,
rendermimeExtension,
runningExtension,
servicesExtension,
shortcutsExtension,
terminalExtension,
tooltipExtension,
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
