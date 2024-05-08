// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
//

import { WidgetTracker } from '@jupyterlab/apputils';
import { IChangedArgs } from '@jupyterlab/coreutils';
import { GroupItem, ProgressBar, TextItem } from '@jupyterlab/statusbar';
import {
  ITranslator,
  nullTranslator,
  TranslationBundle
} from '@jupyterlab/translation';
import { VDomModel, VDomRenderer } from '@jupyterlab/ui-components';
import { ArrayExt } from '@lumino/algorithm';
import React from 'react';
import { FileBrowser, FileBrowserModel, IUploadModel } from '.';

/**
 * Half-spacing between items in the overall status item.
 */
const HALF_SPACING = 4;

/**
 * A pure function component for a FileUpload status item.
 *
 * @param props the props for the component.
 *
 * @returns a tsx component for the file upload status.
 */
function FileUploadComponent(
  props: FileUploadComponent.IProps
): React.ReactElement<FileUploadComponent.IProps> {
  const translator = props.translator || nullTranslator;
  const trans = translator.load('jupyterlab');
  return (
    <GroupItem spacing={HALF_SPACING}>
      <TextItem source={trans.__('Uploading…')} />
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
     * The current upload percentage, from 0 to 100.
     */
    upload: number;

    /**
     * The language translator.
     */
    translator?: ITranslator;
  }
}

/**
 * The time for which to show the "Complete!" message after uploading.
 */
const UPLOAD_COMPLETE_MESSAGE_MILLIS: number = 2000;

/**
 * Status bar item to display file upload progress.
 */
export class FileUploadStatus extends VDomRenderer<FileUploadStatus.Model> {
  /**
   * Construct a new FileUpload status item.
   */
  constructor(opts: FileUploadStatus.IOptions) {
    super(
      new FileUploadStatus.Model(
        opts.tracker.currentWidget && opts.tracker.currentWidget.model
      )
    );
    this.translator = opts.translator || nullTranslator;
    this._trans = this.translator.load('jupyterlab');
    this._tracker = opts.tracker;
    this._tracker.currentChanged.connect(this._onBrowserChange);
  }

  /**
   * Render the FileUpload status.
   */
  render(): JSX.Element {
    const uploadPaths = this.model!.items;
    if (uploadPaths.length > 0) {
      const item = this.model!.items[0];

      if (item.complete) {
        return <TextItem source={this._trans.__('Complete!')} />;
      } else {
        return (
          <FileUploadComponent
            upload={this.model!.items[0].progress}
            translator={this.translator}
          />
        );
      }
    } else {
      return <FileUploadComponent upload={100} translator={this.translator} />;
    }
  }

  dispose(): void {
    super.dispose();
    this._tracker.currentChanged.disconnect(this._onBrowserChange);
  }

  private _onBrowserChange = (
    tracker: WidgetTracker<FileBrowser>,
    browser: FileBrowser | null
  ) => {
    if (browser === null) {
      this.model!.browserModel = null;
    } else {
      this.model!.browserModel = browser.model;
    }
  };

  private readonly translator: ITranslator;
  private _trans: TranslationBundle;
  private _tracker: WidgetTracker<FileBrowser>;
}

/**
 * A namespace for FileUpload class statics.
 */
export namespace FileUploadStatus {
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
    get items(): IFileUploadItem[] {
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
        const finishedItem = ArrayExt.findFirstValue(
          this._items,
          val => val.path === uploads.oldValue.path
        );

        if (finishedItem) {
          finishedItem.complete = true;
          setTimeout(() => {
            ArrayExt.removeFirstOf(this._items, finishedItem);
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
    readonly tracker: WidgetTracker<FileBrowser>;

    /**
     * The translation language bundle.
     */
    readonly translator?: ITranslator;
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
