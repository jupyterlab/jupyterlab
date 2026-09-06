/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { applyJupyterTheme } from '@jupyter/web-components';

import '@jupyterlab/application/style/index.js';
import '@jupyterlab/cells/style/index.js';
import '@jupyterlab/theme-light-extension/style/theme.css';
import '@jupyterlab/completer/style/index.js';

import '../index.css';

// Apply JupyterLab theme to the Jupyter toolkit
window.addEventListener('load', () => {
  applyJupyterTheme();
});
