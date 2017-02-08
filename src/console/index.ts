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
 * The command IDs used by the console plugin.
 */
export
namespace CommandIDs {
  export
  const create = 'console:create';

  export
  const clear = 'console:clear';

  export
  const run = 'console:run';

  export
  const runForced = 'console:run-forced';

  export
  const linebreak = 'console:linebreak';

  export
  const interrupt = 'console:interrupt-kernel';

  export
  const restart = 'console:restart-kernel';

  export
  const closeAndShutdown = 'console:close-and-shutdown';

  export
  const open = 'console:open';

  export
  const inject = 'console:inject';

  export
  const switchKernel = 'console:switch-kernel';
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
