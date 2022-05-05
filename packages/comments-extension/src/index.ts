// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module comments-extension
 */

import { JupyterFrontEndPlugin } from '@jupyterlab/application';

import apiPlugins from './api';
import notebookCommentsPlugin from './notebook';
import textCommentingPlugin from './text';

export * from './api';
export * from './notebook';
export * from './text';

const plugins: JupyterFrontEndPlugin<any>[] = [
  ...apiPlugins,
  notebookCommentsPlugin,
  textCommentingPlugin
];
export default plugins;
