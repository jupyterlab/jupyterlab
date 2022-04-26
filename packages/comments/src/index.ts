// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module comments
 */

import {
  commentRegistryPlugin,
  commentWidgetRegistryPlugin,
  jupyterCommentingPlugin
} from './api';
// Importing directly from './text' causes the imported plugin to be undefined (??)
import { textCommentingPlugin } from './text/plugin';
import { notebookCommentsPlugin } from './notebook';
import { JupyterFrontEndPlugin } from '@jupyterlab/application';

export * from './api';
export * from './notebook';
export * from './text';

const plugins: JupyterFrontEndPlugin<any>[] = [
  jupyterCommentingPlugin,
  commentRegistryPlugin,
  commentWidgetRegistryPlugin,
  notebookCommentsPlugin,
  textCommentingPlugin
];

/**
 * Export the plugins as default.
 */
export default plugins;
