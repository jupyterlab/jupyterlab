// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

export * from './widget';


/**
 * The map of command ids used by the terminal plugin.
 */
export
const cmdIds = {
  createNew: 'terminal:create-new',
  open: 'terminal:open',
  increaseFont: 'terminal:increase-font',
  decreaseFont: 'terminal:decrease-font',
  toggleTheme: 'terminal:toggle-theme'
};
