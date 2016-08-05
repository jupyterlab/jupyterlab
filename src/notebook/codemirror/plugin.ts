// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  NotebookPanel
} from '../notebook/panel';

import {
  defaultCodeMirrorRenderer, CodeMirrorRenderer
} from './notebook/panel';

export const rendererProvider = {
  id: 'jupyter.services.notebook.codemirror.renderer',
  provides: NotebookPanel.Renderer,
  resolve: () => {
    return defaultCodeMirrorRenderer
  }
};