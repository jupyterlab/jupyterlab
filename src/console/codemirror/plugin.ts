// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterLabPlugin
} from '../../application';

import {
  ConsoleContent
} from '../content';

import {
  CodeMirrorConsoleRenderer
} from './widget';


/**
 * The provider for a console's code mirror renderer.
 */
export
const rendererProvider: JupyterLabPlugin<ConsoleContent.IRenderer> = {
  id: 'jupyter.services.console.codemirror.renderer',
  provides: ConsoleContent.IRenderer,
  activate: () => CodeMirrorConsoleRenderer.defaultRenderer
};
