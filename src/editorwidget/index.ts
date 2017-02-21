// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

export * from './widget';


/**
 * The command IDs used by the editor plugin.
 */
export
namespace CommandIDs {
  export
  const lineNumbers: string = 'editor:line-numbers';

  export
  const lineWrap: string = 'editor:line-wrap';

  export
  const createConsole: string = 'editor:create-console';

  export
  const runCode: string = 'editor:run-code';
};
