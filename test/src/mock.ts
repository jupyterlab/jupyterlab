// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  IContentsModel, IContentsManager, IContentsOpts, ICheckpointModel,
  IAjaxSettings, ContentsManager
} from 'jupyter-js-services';


export
class MockContentsManager implements IContentsManager {

  get(path: string, options?: IContentsOpts): Promise<IContentsModel> {
    return Promise.resolve({
      name: path.split('/').pop(),
      path: path,
      type: 'file',
      content: 'bar'
    });
  }

  newUntitled(path: string, options: IContentsOpts): Promise<IContentsModel> {
    return Promise.resolve({
      name: 'untitled',
      path: `${path}/untitled`,
      type: 'file',
      content: 'bar'
    });
  }

  delete(path: string): Promise<void> {
    return Promise.resolve(void 0);
  }

  rename(path: string, newPath: string): Promise<IContentsModel> {
    return Promise.resolve({
      name: newPath.split('/').pop(),
      path: newPath,
      type: 'file',
      content: 'bar'
    });
  }

  save(path: string, model: IContentsModel): Promise<IContentsModel> {
    return Promise.resolve(model);
  }

  copy(path: string, toDir: string): Promise<IContentsModel> {
    let name = path.split('/').pop();
    return Promise.resolve({
      name,
      path: `${toDir}/${name}`,
      type: 'file',
      content: 'bar'
    });
  }

  listContents(path: string): Promise<IContentsModel> {
    return Promise.resolve({
      name: path.split('/').pop(),
      path,
      type: 'dirty',
      content: []
    });
  }

  createCheckpoint(path: string): Promise<ICheckpointModel> {
    return Promise.resolve(void 0);
  }

  listCheckpoints(path: string): Promise<ICheckpointModel[]> {
    return Promise.resolve(void 0);
  }

  restoreCheckpoint(path: string, checkpointID: string): Promise<void> {
    return Promise.resolve(void 0);
  }

  deleteCheckpoint(path: string, checkpointID: string): Promise<void> {
    return Promise.resolve(void 0);
  }

  ajaxSettings: IAjaxSettings = {};
}
