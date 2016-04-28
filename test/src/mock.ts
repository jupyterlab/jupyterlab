// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  IContentsModel, IContentsManager, IContentsOpts, ICheckpointModel,
  IAjaxSettings, ContentsManager
} from 'jupyter-js-services';


export
class MockContentsManager implements IContentsManager {

  methods: string[] = [];

  DEFAULT_TEXT = 'the quick brown fox jumped over the lazy dog';

  /**
   * Create a file with default content.
   */
  createFile(path: string): void {
    let model = {
      name: path.split('/').pop(),
      path: path,
      type: 'file',
      content: this.DEFAULT_TEXT
    }
    this._files[path] = model;
  }

  /**
   * Get a path in the format it was saved or created in.
   */
  get(path: string, options?: IContentsOpts): Promise<IContentsModel> {
    this.methods.push('get');
    let model = this._files[path];
    if (!model) {
      return Promise.reject(new Error('Path not found'));
    }
    return Promise.resolve(this._copyModel(model));
  }

  newUntitled(path: string, options?: IContentsOpts): Promise<IContentsModel> {
    this.methods.push('newUntitled');
    options = options || {};
    let ext = options.ext || '';
    let name = options.name || `untitled${ext}`;
    path = `${path}/${name}`;
    let model = {
      name,
      path,
      format: options.format || 'text',
      type: options.type || 'file',
      content: options.content || this.DEFAULT_TEXT
    };
    this._files[path] = model;
    return Promise.resolve(this._copyModel(model));
  }

  delete(path: string): Promise<void> {
    this.methods.push('delete');
    delete this._files[path];
    return Promise.resolve(void 0);
  }

  rename(path: string, newPath: string): Promise<IContentsModel> {
    this.methods.push('rename');
    let model = this._files[path];
    if (!model) {
      return Promise.reject(new Error('Path not found'));
    }
    model.name = newPath.split('/').pop();
    model.path = newPath;
    delete this._files[path];
    this._files[newPath] = model;
    return Promise.resolve(model);
  }

  save(path: string, model: IContentsModel): Promise<IContentsModel> {
    this.methods.push('save');
    this._files[path] = this._copyModel(model);
    return Promise.resolve(model);
  }

  copy(path: string, toDir: string): Promise<IContentsModel> {
    this.methods.push('copy');
    let model = this._files[path];
    if (!model) {
      return Promise.reject(new Error('Path not found'));
    }
    let newModel = JSON.parse(JSON.stringify(model)) as IContentsModel;
    newModel.path = `${toDir}/${model.name}`;
    this._files[newModel.path] = newModel;
    return Promise.resolve(newModel);
  }

  listContents(path: string): Promise<IContentsModel> {
    this.methods.push('listContents');
    let files: IContentsModel[] = [];
    for (let key of Object.keys(this._files)) {
      let model = this._files[key];
      let dname = model.path.slice(0, model.name.length);
      if (dname === path) {
        files.push(model);
      }
    }
    return Promise.resolve({
      name: path.split('/').pop(),
      path,
      type: 'directory',
      content: files
    });
  }

  createCheckpoint(path: string): Promise<ICheckpointModel> {
    this.methods.push('createCheckpoint');
    let fileModel = this._files[path];
    if (!fileModel) {
      return Promise.reject(new Error('Path not found'));
    }
    let checkpoints: ICheckpointModel[] = this._checkpoints[path] || [];
    let id = String(this._id++);
    let date = new Date(Date.now());
    let last_modified = date.toISOString();
    let model: ICheckpointModel = { id, last_modified };
    checkpoints.push(model);
    this._checkpoints[path] = checkpoints;
    this._fileSnaps[id] = this._copyModel(fileModel);
    return Promise.resolve(model);
  }

  listCheckpoints(path: string): Promise<ICheckpointModel[]> {
    this.methods.push('listCheckpoints');
    let checkpoints: ICheckpointModel[] = this._checkpoints[path] || [];
    return Promise.resolve(checkpoints);
  }

  restoreCheckpoint(path: string, checkpointID: string): Promise<void> {
    this.methods.push('restoreCheckpoint');
    this._files[path] = this._copyModel(this._fileSnaps[checkpointID]);
    return Promise.resolve(void 0);
  }

  deleteCheckpoint(path: string, checkpointID: string): Promise<void> {
    this.methods.push('deleteCheckpoint');
    delete this._fileSnaps[checkpointID];
    return Promise.resolve(void 0);
  }

  private _copyModel(model: IContentsModel): IContentsModel {
    return JSON.parse(JSON.stringify(model)) as IContentsModel;
  }

  ajaxSettings: IAjaxSettings = {};

  private _files: { [key: string]: IContentsModel } = Object.create(null);
  private _checkpoints: { [key: string]: ICheckpointModel[] } = Object.create(null);
  private _fileSnaps: { [key: string]: IContentsModel } = Object.create(null);
  private _id = 0;
}
