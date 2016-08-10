// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterLabPlugin
} from '../../application';

import {
  ConsoleWidget
} from '../widget';

import {
  CodeMirrorConsoleRenderer
} from './widget';


/**
 * The provider for a console's code mirror renderer.
 */
export
const rendererProvider: JupyterLabPlugin<ConsoleWidget.IRenderer> = {
  id: 'jupyter.services.console.codemirror.renderer',
  provides: ConsoleWidget.IRenderer,
  activate: () => CodeMirrorConsoleRenderer.defaultRenderer
};
