// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

export * from './browser';
export * from './buttons';
export * from './crumbs';
export * from './listing';
export * from './model';
export * from './tracker';


/**
 * The command IDs used by the file browser plugin.
 */
export
namespace CommandIDs {
  export
  const save = 'file-operations:save';

  export
  const restoreCheckpoint = 'file-operations:restore-checkpoint';

  export
  const saveAs = 'file-operations:save-as';

  export
  const close = 'file-operations:close';

  export
  const closeAllFiles = 'file-operations:close-all-files';

  export
  const open = 'file-operations:open';

  export
  const newTextFile = 'file-operations:new-text-file';

  export
  const newNotebook = 'file-operations:new-notebook-file';

  export
  const showBrowser = 'file-browser:activate';

  export
  const hideBrowser = 'file-browser:hide';

  export
  const toggleBrowser = 'file-browser:toggle';
};
