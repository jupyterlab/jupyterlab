// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Kernel
} from '@jupyterlab/services';

import {
  JSONObject
} from '@phosphor/coreutils';

export * from './foreign';
export * from './history';
export * from './panel';
export * from './tracker';
export * from './widget';


/**
 * The arguments used to create a console.
 */
export
interface ICreateConsoleArgs extends JSONObject {
  id?: string;
  path?: string;
  kernel?: Kernel.IModel;
  preferredLanguage?: string;
};
