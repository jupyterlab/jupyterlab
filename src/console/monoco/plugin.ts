// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterLabPlugin
} from '../../application';

import {
  ConsoleContent
} from '../content';

import {
  defaultConsoleContentRenderer
} from './renderers';


/**
 * The provider for a console's monaco renderer.
 */
export
const rendererProvider: JupyterLabPlugin<ConsoleContent.IRenderer> = {
  id: 'jupyter.services.console.monaco.renderer',
  provides: ConsoleContent.IRenderer,
  activate: () => defaultConsoleContentRenderer
};
