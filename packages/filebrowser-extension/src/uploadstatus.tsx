import React from 'react';
import { TextItem } from '@jupyterlab/statusbar';

import { JupyterLabPlugin, JupyterLab } from '@jupyterlab/application';

import {
  IUploadModel,
  FileBrowserModel,
  IFileBrowserFactory,
  FileBrowser
} from '@jupyterlab/filebrowser';

import { IChangedArgs } from '@jupyterlab/coreutils';

import { ProgressBar } from '@jupyterlab/statusbar';
import { VDomRenderer, InstanceTracker, VDomModel } from '@jupyterlab/apputils';
import { ArrayExt } from '@phosphor/algorithm';
import { IStatusBar, GroupItem } from '@jupyterlab/statusbar';

/**
 * Half-spacing between items in the overall status item.
 */
const HALF_SPACING = 4;

/**
 * A pure function component for a FileUpload status item.
 *
 * @param props: the props for the component.
 *
 * @returns a tsx component for the file upload status.
 */
function FileUploadComponent(
  props: FileUploadComponent.IProps
): React.ReactElement<FileUploadComponent.IProps> {
  return (
    <GroupItem spacing={HALF_SPACING}>
      <TextItem source={'Uploading…'} />
      <ProgressBar percentage={props.upload} />
    </GroupItem>
  );
}

/**
 * A namespace for FileUploadComponent statics.
 */
namespace FileUploadComponent {
  /**
   * The props for the FileUploadComponent.
   */
  export interface IProps {
    /**
     * The current upload fraction.
     */
    upload: number;
  }
}

/**
 * The time for which to show the "Complete!" message after uploading.
 */
const UPLOAD_COMPLETE_MESSAGE_MILLIS: number = 2000;

/**
 * Status bar item to display file upload progress.
 */
class FileUpload extends VDomRenderer<FileUpload.Model> {
  /**
   * Construct a new FileUpload status item.
   */
  constructor(opts: FileUpload.IOptions) {
    super();
    this._tracker = opts.tracker;
    this._tracker.currentChanged.connect(this._onBrowserChange);

    this.model = new FileUpload.Model(
      this._tracker.currentWidget && this._tracker.currentWidget.model
    );
  }

  /**
   * Render the FileUpload status.
   */
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

/**
 * A namespace for FileUpload class statics.
 */
namespace FileUpload {
  /**
   * The VDomModel for the FileUpload renderer.
   */
  export class Model extends VDomModel {
    /**
     * Construct a new model.
     */
    constructor(browserModel: FileBrowserModel | null) {
      super();
      this.browserModel = browserModel;
    }

    /**
     * The currently uploading items.
     */
    get items() {
      return this._items;
    }

    /**
     * The current file browser model.
     */
    get browserModel(): FileBrowserModel | null {
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

    /**
     * Handle an uploadChanged event in the filebrowser model.
     */
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

    private _items: Array<IFileUploadItem> = [];
    private _browserModel: FileBrowserModel | null = null;
  }

  /**
   * Options for creating the upload status item.
   */
  export interface IOptions {
    /**
     * The application file browser tracker.
     */
    readonly tracker: InstanceTracker<FileBrowser>;
  }
}

/**
 * The interface for an item that is being uploaded to
 * the file system.
 */
interface IFileUploadItem {
  /**
   * The path on the filesystem that is being uploaded to.
   */
  path: string;

  /**
   * The upload progress fraction.
   */
  progress: number;

  /**
   * Whether the upload is complete.
   */
  complete: boolean;
}

/**
 * A plugin providing file upload status.
 */
export const fileUploadStatus: JupyterLabPlugin<void> = {
  id: '@jupyterlab/filebrowser-extension:file-upload-item',
  autoStart: true,
  requires: [IStatusBar, IFileBrowserFactory],
  activate: (
    app: JupyterLab,
    statusBar: IStatusBar,
    browser: IFileBrowserFactory
  ) => {
    const item = new FileUpload({
      tracker: browser.tracker
    });

    statusBar.registerStatusItem('file-upload-item', item, {
      align: 'middle',
      isActive: () => {
        return !!item.model && item.model.items.length > 0;
      },
      stateChanged: item.model.stateChanged
    });
  }
};
