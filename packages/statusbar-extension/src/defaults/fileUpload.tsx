/**
 * Default item to display file upload progress.
 */
/**
 * Part of Jupyterlab status bar defaults.
 */
import React from 'react';
import { TextItem } from '../component/text';

import { JupyterLabPlugin, JupyterLab } from '@jupyterlab/application';

import {
  IUploadModel,
  FileBrowserModel,
  IFileBrowserFactory,
  FileBrowser
} from '@jupyterlab/filebrowser';

import { IChangedArgs } from '@jupyterlab/coreutils';
import { ISignal } from '@phosphor/signaling';
import { IDisposable } from '@phosphor/disposable';
import { Token } from '@phosphor/coreutils';

import { ProgressBar } from '../component/progressBar';
import { VDomRenderer, InstanceTracker, VDomModel } from '@jupyterlab/apputils';
import { ArrayExt } from '@phosphor/algorithm';
import { IDefaultsManager } from './manager';
import { GroupItem } from '../component/group';
import vars from '../style/variables';

// tslint:disable-next-line:variable-name
const FileUploadComponent = (
  props: FileUploadComponent.IProps
): React.ReactElement<FileUploadComponent.IProps> => {
  return (
    <GroupItem spacing={vars.textIconHalfSpacing}>
      <TextItem source={'Uploading'} />
      <ProgressBar percentage={props.upload} />
    </GroupItem>
  );
};

namespace FileUploadComponent {
  export interface IProps {
    upload: number;
  }
}

const UPLOAD_COMPLETE_MESSAGE_MILLIS: number = 2000;

class FileUpload extends VDomRenderer<FileUpload.Model> implements IFileUpload {
  constructor(opts: FileUpload.IOptions) {
    super();
    this._tracker = opts.tracker;
    this._tracker.currentChanged.connect(this._onBrowserChange);

    this.model = new FileUpload.Model(
      this._tracker.currentWidget && this._tracker.currentWidget.model
    );
  }

  render() {
    const uploadPaths = this.model!.items;
    if (uploadPaths.length > 0) {
      const item = this.model!.items[0];

      if (item.complete) {
        return <TextItem source="Complete!" />;
      } else {
        return <FileUploadComponent upload={this.model!.items[0].progress} />;
      }
    } else {
      return <FileUploadComponent upload={100} />;
    }
  }

  dispose() {
    super.dispose();

    this._tracker.currentChanged.disconnect(this._onBrowserChange);
  }

  private _onBrowserChange = (
    tracker: InstanceTracker<FileBrowser>,
    browser: FileBrowser | null
  ) => {
    if (browser === null) {
      this.model!.browserModel = null;
    } else {
      this.model!.browserModel = browser.model;
    }
  };

  private _tracker: InstanceTracker<FileBrowser>;
}

namespace FileUpload {
  export class Model extends VDomModel implements IFileUpload.IModel {
    constructor(browserModel: FileBrowserModel | null) {
      super();

      this.browserModel = browserModel;
    }

    get items() {
      return this._items;
    }

    get browserModel() {
      return this._browserModel;
    }

    set browserModel(browserModel: FileBrowserModel | null) {
      const oldBrowserModel = this._browserModel;
      if (oldBrowserModel) {
        oldBrowserModel.uploadChanged.disconnect(this._uploadChanged);
      }

      this._browserModel = browserModel;
      this._items = [];

      if (this._browserModel !== null) {
        this._browserModel.uploadChanged.connect(this._uploadChanged);
      }

      this.stateChanged.emit(void 0);
    }

    private _uploadChanged = (
      browse: FileBrowserModel,
      uploads: IChangedArgs<IUploadModel>
    ) => {
      if (uploads.name === 'start') {
        this._items.push({
          path: uploads.newValue.path,
          progress: uploads.newValue.progress * 100,
          complete: false
        });
      } else if (uploads.name === 'update') {
        const idx = ArrayExt.findFirstIndex(
          this._items,
          val => val.path === uploads.oldValue.path
        );
        if (idx !== -1) {
          this._items[idx].progress = uploads.newValue.progress * 100;
        }
      } else if (uploads.name === 'finish') {
        const idx = ArrayExt.findFirstIndex(
          this._items,
          val => val.path === uploads.oldValue.path
        );

        if (idx !== -1) {
          this._items[idx].complete = true;
          setTimeout(() => {
            ArrayExt.removeAt(this._items, idx);
            this.stateChanged.emit(void 0);
          }, UPLOAD_COMPLETE_MESSAGE_MILLIS);
        }
      } else if (uploads.name === 'failure') {
        ArrayExt.removeFirstWhere(
          this._items,
          val => val.path === uploads.newValue.path
        );
      }

      this.stateChanged.emit(void 0);
    };

    private _items: Array<IFileUpload.IItem> = [];
    private _browserModel: FileBrowserModel | null = null;
  }

  export interface IOptions {
    readonly tracker: InstanceTracker<FileBrowser>;
  }
}

export interface IFileUpload extends IDisposable {
  readonly model: IFileUpload.IModel | null;
  readonly modelChanged: ISignal<this, void>;
}

// tslint:disable-next-line:variable-name
export const IFileUpload = new Token<IFileUpload>(
  '@jupyterlab/statusbar:IFileUpload'
);

export namespace IFileUpload {
  export interface IModel {
    readonly items: Array<IFileUpload.IItem>;
    readonly browserModel: FileBrowserModel | null;
  }

  export interface IItem {
    path: string;
    progress: number;
    complete: boolean;
  }
}

export const fileUploadItem: JupyterLabPlugin<IFileUpload> = {
  id: '@jupyterlab/statusbar:file-upload-item',
  autoStart: true,
  provides: IFileUpload,
  requires: [IDefaultsManager, IFileBrowserFactory],
  activate: (
    app: JupyterLab,
    manager: IDefaultsManager,
    browser: IFileBrowserFactory
  ) => {
    const item = new FileUpload({
      tracker: browser.tracker
    });

    manager.addDefaultStatus('file-upload-item', item, {
      align: 'middle',
      isActive: () => {
        return !!item.model && item.model.items.length > 0;
      },
      stateChanged: item.model!.stateChanged
    });

    return item;
  }
};
