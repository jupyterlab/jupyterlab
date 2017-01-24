// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Kernel
} from '@jupyterlab/services';

import {
  JSONObject
} from 'phosphor/lib/algorithm/json';

export * from './panel';
export * from './tracker';
export * from './widget';


/**
 * The map of command ids used by the console plugin.
 */
export
const cmdIds = {
  create: 'console:create',
  clear: 'console:clear',
  run: 'console:run',
  runForced: 'console:run-forced',
  linebreak: 'console:linebreak',
  interrupt: 'console:interrupt-kernel',
  open: 'console:open',
  inject: 'console:inject',
  switchKernel: 'console:switch-kernel'
};


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
