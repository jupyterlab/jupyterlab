// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ConsoleWidget
} from '../widget';

import {
  defaultCodeMirrorConsoleRenderer, CodeMirrorConsoleRenderer
} from './widget';

import {
  IConsoleRenderer
} from '../plugin'

import {
  JupyterLab, JupyterLabPlugin
} from '../../application';

/**
 * The provider for a console's code mirror renderer.
 */
export
const rendererProvider: JupyterLabPlugin<ConsoleWidget.IRenderer> = {
  id: 'jupyter.services.console.codemirror.renderer',
  provides: IConsoleRenderer,
  activate: () => defaultCodeMirrorConsoleRenderer
};