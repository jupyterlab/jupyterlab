// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module comments-extension
 */

import { JupyterFrontEndPlugin } from '@jupyterlab/application';

import apiPlugins from './api';

export * from './api';

const plugins: JupyterFrontEndPlugin<any>[] = apiPlugins;

export default plugins;
