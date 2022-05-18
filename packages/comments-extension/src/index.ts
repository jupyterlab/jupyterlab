// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module comments-extension
 */

import { JupyterFrontEndPlugin } from '@jupyterlab/application';

import apiPlugins from './api';
import textCommentingPlugin from './text';

export * from './api';
export * from './text';

const plugins: JupyterFrontEndPlugin<any>[] = [
  ...apiPlugins,
  textCommentingPlugin
];
export default plugins;
