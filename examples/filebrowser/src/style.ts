/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { applyJupyterTheme } from '@jupyter/web-components';

import '@jupyterlab/application/style/index.css';
import '@jupyterlab/codemirror/style/index.css';
import '@jupyterlab/filebrowser/style/index.css';
import '@jupyterlab/theme-light-extension/style/theme.css';

import '../index.css';

// Apply JupyterLab theme to the Jupyter toolkit
window.addEventListener('load', () => {
  applyJupyterTheme();
});
