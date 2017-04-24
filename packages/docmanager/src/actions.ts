// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  PathExt, uuid
} from '@jupyterlab/coreutils';

import {
  Contents, IServiceManager, Session
} from '@jupyterlab/services';

import {
 IIterator
} from '@phosphor/algorithm';

import {
  DocumentManager
} from './';


/**
 * A stripped-down interface for a file container.
 */
export
interface IFileContainer {
  /**
   * Returns an iterator over the container's items.
   */
  items(): IIterator<Contents.IModel>;

  /**
   * The current working directory of the file container.
   */
  path: string;
}


/**
 * A namespace for commonly used file system manipulation actions.
 */
export
namespace Actions {
  /**
   * Delete a file.
   *
   * @param manager - The service manager used to delete.
   *
   * @param: path - The path to the file to be deleted.
   *
   * @param basePath - The base path to resolve against, defaults to ''.
   *
   * @returns A promise which resolves when the file is deleted.
   *
   * #### Notes
   * If there is a running session associated with the file and no other
   * sessions are using the kernel, the session will be shut down.
   */
  export
  function deleteFile(manager: IServiceManager, path: string, basePath = ''): Promise<void> {
    path = PathExt.resolve(basePath, path);
    return stopIfNeeded(manager, path).then(() => {
      return manager.contents.delete(path);
    });
  }

  /**
   * Create a new untitled file.
   */
  export
  function newUntitled(manager: DocumentManager, options: Contents.ICreateOptions): Promise<Contents.IModel> {
    if (options.type === 'file') {
      options.ext = options.ext || '.txt';
    }

    return manager.services.contents.newUntitled(options);
  }


  /**
   * Overwrite a file.
   *
   * @param manager - The service manager used to overwrite.
   *
   * @param oldPath - The path to the original file.
   *
   * @param newPath - The path to the new file.
   *
   * @param basePath - The base path to resolve against, defaults to ''.
   *
   * @returns A promise containing the new file contents model.
   */
  export
  function overwrite(manager: IServiceManager, oldPath: string, newPath: string, basePath = ''): Promise<Contents.IModel> {
    // Cleanly overwrite the file by moving it, making sure the original
    // does not exist, and then renaming to the new path.
    const tempPath = `${newPath}.${uuid()}`;
    const cb = () => rename(manager, tempPath, newPath, basePath);
    return rename(manager, oldPath, tempPath, basePath).then(() => {
      return deleteFile(manager, newPath);
    }).then(cb, cb);
  }

  /**
   * Rename a file or directory.
   *
   * @param manager - The service manager used to rename.
   *
   * @param oldPath - The path to the original file.
   *
   * @param newPath - The path to the new file.
   *
   * @param basePath - The base path to resolve against, defaults to ''.
   *
   * @returns A promise containing the new file contents model.  The promise
   *   will reject if the newPath already exists.  Use [[overwrite]] to
   *   overwrite a file.
   */
  export
  function rename(manager: IServiceManager, oldPath: string, newPath: string, basePath = ''): Promise<Contents.IModel> {
    // Normalize paths.
    oldPath = PathExt.resolve(basePath, oldPath);
    newPath = PathExt.resolve(basePath, newPath);

    return manager.contents.rename(oldPath, newPath);
  }

  /**
   * Find a session associated with a path and stop it is the only
   * session using that kernel.
   */
  export
  function stopIfNeeded(manager: IServiceManager, path: string): Promise<void> {
    return Session.listRunning().then(sessions => {
      const matches = sessions.filter(value => value.notebook.path === path);
      if (matches.length === 1) {
        const id = matches[0].id;
        return manager.sessions.shutdown(id).catch(() => { /* no-op */ });
      }
    }).catch(() => Promise.resolve(void 0)); // Always succeed.
  }
}
