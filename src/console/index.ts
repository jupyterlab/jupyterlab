// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Kernel
} from '@jupyterlab/services';

import {
  JSONObject
} from '@phosphor/coreutils';

export * from './panel';
export * from './tracker';
export * from './widget';


/**
 * The command IDs used by the console plugin.
 */
export
namespace CommandIDs {
  export
  const create: string = 'console:create';

  export
  const clear: string = 'console:clear';

  export
  const run: string = 'console:run';

  export
  const runForced: string = 'console:run-forced';

  export
  const linebreak: string = 'console:linebreak';

  export
  const interrupt: string = 'console:interrupt-kernel';

  export
  const restart: string = 'console:restart-kernel';

  export
  const closeAndShutdown: string = 'console:close-and-shutdown';

  export
  const open: string = 'console:open';

  export
  const inject: string = 'console:inject';

  export
  const switchKernel: string = 'console:switch-kernel';
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
