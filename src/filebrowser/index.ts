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
  const save: string = 'file-operations:save';

  export
  const restoreCheckpoint: string = 'file-operations:restore-checkpoint';

  export
  const saveAs: string = 'file-operations:save-as';

  export
  const close: string = 'file-operations:close';

  export
  const closeAllFiles: string = 'file-operations:close-all-files';

  export
  const open: string = 'file-operations:open';

  export
  const newTextFile: string = 'file-operations:new-text-file';

  export
  const newNotebook: string = 'file-operations:new-notebook';

  export
  const showBrowser: string = 'file-browser:activate';

  export
  const hideBrowser: string = 'file-browser:hide';

  export
  const toggleBrowser: string = 'file-browser:toggle';
};
