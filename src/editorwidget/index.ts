// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

export * from './widget';


/**
 * The command IDs used by the editor plugin.
 */
export
namespace CommandIDs {
  export
  const lineNumbers = 'editor:line-numbers';

  export
  const lineWrap = 'editor:line-wrap';

  export
  const createConsole = 'editor:create-console';

  export
  const runCode = 'editor:run-code';
};
