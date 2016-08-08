// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ConsoleWidget
} from '../widget';

import {
  defaultCodeMirrorConsoleRenderer, CodeMirrorConsoleRenderer
} from './widget';

export const rendererProvider = {
  id: 'jupyter.services.console.codemirror.renderer',
  provides: ConsoleWidget.Renderer,
  resolve: () => {
    return defaultCodeMirrorConsoleRenderer
  }
};