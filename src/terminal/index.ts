// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

export * from './widget';


/**
 * The command IDs used by the terminal plugin.
 */
export
namespace CommandIDs {
  export
  const createNew = 'terminal:create-new';

  export
  const open = 'terminal:open';

  export
  const increaseFont = 'terminal:increase-font';

  export
  const decreaseFont = 'terminal:decrease-font';

  export
  const toggleTheme = 'terminal:toggle-theme';
};
