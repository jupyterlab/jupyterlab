import type { IChangedArgs } from '@jupyterlab/coreutils';
import { PathExt } from '@jupyterlab/coreutils';
import { Notification } from '@jupyterlab/apputils';
import type { FileBrowserModel, IUploadModel } from './model';
import type { ITranslator, TranslationBundle } from '@jupyterlab/translation';
import { nullTranslator } from '@jupyterlab/translation';
export class UploadNotifications {
  constructor(opts: UploadNotifications.IOptions) {
    this._model = opts.model;
    this._translator = opts.translator || nullTranslator;
    this._trans = this._translator.load('jupyterlab');

    this._model.uploadChanged.connect(this._onUploadChanged, this);
  }

  private _model: FileBrowserModel;
  private _translator: ITranslator;
  private _trans: TranslationBundle;

  private _uploadNotifications = new Map<string, string>();
  private _lastUpdateTime = new Map<string, number>();

  private _onUploadChanged = (
    _sender: FileBrowserModel,
    uploads: IChangedArgs<IUploadModel>
  ) => {
    const path = uploads.newValue?.path || uploads.oldValue?.path;
    const filename = PathExt.basename(path);

    if (uploads.name === 'start') {
      const message = this._trans.__('Uploading %1', filename);
      const now = Date.now();

      const id = Notification.emit(message, 'in-progress', {
        progress: 0,
        autoClose: false,
        actions: [
          {
            label: this._trans.__('Cancel'),
            callback: event => {
              event.preventDefault();
              this._model.cancelUpload(path);
            }
          }
        ]
      });
      this._uploadNotifications.set(path, id);
      this._lastUpdateTime.set(path, now);
    } else if (uploads.name === 'update') {
      const id = this._uploadNotifications.get(path);

      if (!id) {
        return;
      }
      const lastUpdate = this._lastUpdateTime.get(path) || 0;
      const now = Date.now();

      if (now - lastUpdate < 500) {
        return;
      }

      const progress = uploads.newValue?.progress;

      Notification.update({
        id,
        progress: progress
      });

      this._lastUpdateTime.set(path, now);
    } else if (uploads.name === 'finish') {
      const id = this._uploadNotifications.get(path);

      if (id) {
        const filename = PathExt.basename(path);
        const message = this._trans.__('Upload complete: %1', filename);
        Notification.update({
          id,
          progress: 1,
          type: 'success',
          message,
          autoClose: 2000,
          actions: []
        });

        this._uploadNotifications.delete(path);
        this._lastUpdateTime.delete(path);
      }
    } else if (uploads.name === 'cancelled') {
      const id = this._uploadNotifications.get(path);

      if (id) {
        const filename = PathExt.basename(path);
        const message = this._trans.__('Upload cancelled: %1', filename);
        Notification.update({
          id,
          type: 'warning',
          message,
          autoClose: 5000,
          actions: []
        });

        this._uploadNotifications.delete(path);
        this._lastUpdateTime.delete(path);
      }
    } else if (uploads.name === 'failure') {
      const id = this._uploadNotifications.get(path);

      if (id) {
        const filename = PathExt.basename(path);
        const message = this._trans.__('Upload failed: %1', filename);

        Notification.update({
          id,
          type: 'error',
          message,
          autoClose: 10000,
          actions: []
        });

        this._uploadNotifications.delete(path);
        this._lastUpdateTime.delete(path);
      }
    }
  };

  private _isDisposed = false;

  dispose(): void {
    if (this._isDisposed) {
      return;
    }

    this._isDisposed = true;
    this._model.uploadChanged.disconnect(this._onUploadChanged, this);
    this._uploadNotifications.clear();
    this._lastUpdateTime.clear();
  }
}

export namespace UploadNotifications {
  export interface IOptions {
    model: FileBrowserModel;
    translator?: ITranslator;
  }
}
