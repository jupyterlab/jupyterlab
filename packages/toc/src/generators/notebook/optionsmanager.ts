// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ISanitizer } from '@jupyterlab/apputils';

import { INotebookTracker } from '@jupyterlab/notebook';

import { TableOfContentsRegistry } from '../../registry';

import { TableOfContents } from '../../toc';

import { TagsToolComponent } from './tagstool';

export class NotebookGeneratorOptionsManager extends TableOfContentsRegistry.IGeneratorOptionsManager {
  constructor(
    widget: TableOfContents,
    notebook: INotebookTracker,
    options: {
      needsNumbering: boolean;
      sanitizer: ISanitizer;
      tagTool?: TagsToolComponent;
    }
  ) {
    super();
    this._numbering = options.needsNumbering;
    this._widget = widget;
    this._notebook = notebook;
    this.sanitizer = options.sanitizer;
    this.tagTool = null;
    this.storeTags = [];
  }

  readonly sanitizer: ISanitizer;
  public tagTool?: TagsToolComponent | null;

  set notebookMetadata(value: [string, any]) {
    if (this._notebook.currentWidget != null) {
      this._notebook.currentWidget.model.metadata.set(value[0], value[1]);
    }
  }

  set numbering(value: boolean) {
    this._numbering = value;
    this._widget.update();
    this.notebookMetadata = ['toc-autonumbering', this._numbering];
  }

  get numbering() {
    return this._numbering;
  }

  set showCode(value: boolean) {
    this._showCode = value;
    this.notebookMetadata = ['toc-showcode', this._showCode];
    this._widget.update();
  }

  get showCode() {
    return this._showCode;
  }

  set showMarkdown(value: boolean) {
    this._showMarkdown = value;
    this.notebookMetadata = ['toc-showmarkdowntxt', this._showMarkdown];
    this._widget.update();
  }

  get showMarkdown() {
    return this._showMarkdown;
  }

  set showTags(value: boolean) {
    this._showTags = value;
    this.notebookMetadata = ['toc-showtags', this._showTags];
    this._widget.update();
  }

  get showTags() {
    return this._showTags;
  }

  get filtered() {
    if (this.tagTool) {
      this._filtered = this.tagTool.filtered;
    } else if (this.storeTags.length > 0) {
      this._filtered = this.storeTags;
    } else {
      this._filtered = [];
    }
    return this._filtered;
  }

  set preRenderedToolbar(value: any) {
    this._preRenderedToolbar = value;
  }

  get preRenderedToolbar() {
    return this._preRenderedToolbar;
  }

  updateWidget() {
    this._widget.update();
  }

  setTagTool(tagTool: TagsToolComponent | null) {
    this.tagTool = tagTool;
  }

  // initialize options, will NOT change notebook metadata
  initializeOptions(
    numbering: boolean,
    showCode: boolean,
    showMarkdown: boolean,
    showTags: boolean
  ) {
    this._numbering = numbering;
    this._showCode = showCode;
    this._showMarkdown = showMarkdown;
    this._showTags = showTags;
    this._widget.update();
  }

  private _preRenderedToolbar: any = null;
  private _filtered: string[] = [];
  private _numbering: boolean;
  private _showCode = false;
  private _showMarkdown = false;
  private _showTags = false;
  private _notebook: INotebookTracker;
  private _widget: TableOfContents;
  public storeTags: string[];
}
