// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterLab
} from '@jupyterlab/application';

import * as aboutExtension
  from '@jupyterlab/about-extension';

import * as applicationExtension
  from '@jupyterlab/application-extension';

import * as apputilsExtension
  from '@jupyterlab/apputils-extension';

import * as codemirrorExtension
  from '@jupyterlab/codemirror-extension';

import * as completerExtension
  from '@jupyterlab/completer-extension';

import * as consoleExtension
  from '@jupyterlab/console-extension';

import * as csvwidgetExtension
  from '@jupyterlab/csvwidget-extension';

import * as docmanagerExtension
  from '@jupyterlab/docmanager-extension';

import * as docregistryExtension
  from '@jupyterlab/docregistry-extension';

import * as editorwidgetExtension
  from '@jupyterlab/editorwidget-extension';

import * as faqExtension
  from '@jupyterlab/faq-extension';

import * as filebrowserExtension
  from '@jupyterlab/filebrowser-extension';

import * as helpExtension
  from '@jupyterlab/help-extension';

import * as imagewidgetExtension
  from '@jupyterlab/imagewidget-extension';

import * as inspectorExtension
  from '@jupyterlab/inspector-extension';

import * as landingExtension
  from '@jupyterlab/landing-extension';

import * as launchExtension
  from '@jupyterlab/launcher-extension';

import * as markdownwidgetExtension
  from '@jupyterlab/markdownwidget-extension';

import * as notebookExtension
  from '@jupyterlab/notebook-extension';

import * as rendermimeExtension
  from '@jupyterlab/rendermime-extension';

import * as runningExtension
  from '@jupyterlab/running-extension';

import * as servicesExtension
  from '@jupyterlab/services-extension';

import * as shortcutsExtension
  from '@jupyterlab/shortcuts-extension';

import * as terminalExtension
  from '@jupyterlab/terminal-extension';

import * as tooltipExtension
  from '@jupyterlab/tooltip-extension';

import '@jupyterlab/default-theme/style/index.css';


export
const extensions: JupyterLab.IPluginModule[] = [
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
