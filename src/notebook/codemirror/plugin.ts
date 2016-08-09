// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  NotebookPanel
} from '../notebook/panel';

import {
  defaultCodeMirrorNotebookPanelRenderer, CodeMirrorNotebookPanelRenderer
} from './notebook/panel';

import {
  JupyterLab, JupyterLabPlugin
} from '../../application';

import {
  INotebookRenderer
} from '../plugin';

export const rendererProvider: JupyterLabPlugin<NotebookPanel.IRenderer> = {
  id: 'jupyter.services.notebook.codemirror.renderer',
  provides: INotebookRenderer,
  activate: () => defaultCodeMirrorNotebookPanelRenderer
};