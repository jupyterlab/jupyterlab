// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

export * from './browser';
export * from './buttons';
export * from './crumbs';
export * from './listing';
export * from './model';
export * from './tracker';


/**
 * The map of command ids used by the filebrowser plugin.
 */
export
const cmdIds = {
  save: 'file-operations:save',
  restoreCheckpoint: 'file-operations:restore-checkpoint',
  saveAs: 'file-operations:save-as',
  close: 'file-operations:close',
  closeAllFiles: 'file-operations:close-all-files',
  open: 'file-operations:open',
  showBrowser: 'file-browser:activate',
  hideBrowser: 'file-browser:hide',
  toggleBrowser: 'file-browser:toggle'
};
