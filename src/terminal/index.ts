// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

export * from './widget';


/**
 * The command IDs used by the terminal plugin.
 */
export
namespace CommandIDs {
  export
  const createNew: string = 'terminal:create-new';

  export
  const open: string = 'terminal:open';

  export
  const refresh: string = 'terminal:refresh';

  export
  const increaseFont: string = 'terminal:increase-font';

  export
  const decreaseFont: string = 'terminal:decrease-font';

  export
  const toggleTheme: string = 'terminal:toggle-theme';
};
