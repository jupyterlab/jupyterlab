// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

export * from './handler';
export * from './model';
export * from './widget';

/**
 * The command IDs used by the completer plugin.
 */
export
namespace CommandIDs {
  export
  const consoleAttach = 'completer:console-attach';

  export
  const consoleInvoke = 'completer:console-invoke';

  export
  const notebookAttach = 'completer:notebook-attach';

  export
  const notebookInvoke = 'completer:notebook-invoke';
}
