// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { ActivityMonitor, PathExt } from '@jupyterlab/coreutils';
import { IDocumentManager } from '@jupyterlab/docmanager';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import {
  nullTranslator,
  ITranslator,
  TranslationBundle
} from '@jupyterlab/translation';
import { Message } from '@lumino/messaging';
import { Widget } from '@lumino/widgets';
import { IHeading } from './utils/headings';
import { TableOfContentsRegistry as Registry } from './registry';
import { TOCTree } from './toc_tree';

/**
 * Timeout for throttling ToC rendering.
 *
 * @private
 */
const RENDER_TIMEOUT = 1000;

/**
 * Widget for hosting a notebook table of contents.
 */
export class TableOfContents extends Widget {
  /**
   * Returns a new table of contents.
   *
   * @param options - options
   * @returns widget
   */
  constructor(options: TableOfContents.IOptions) {
    super();
    this.translator = options.translator || nullTranslator;
    this._docmanager = options.docmanager;
    this._rendermime = options.rendermime;
    this._trans = this.translator.load('jupyterlab');
  }

  /**
   * Current widget-generator tuple for the ToC.
   */
  get current(): TableOfContents.ICurrentWidget | null {
    return this._current;
  }
  set current(value: TableOfContents.ICurrentWidget | null) {
    // If they are the same as previously, do nothing...
    if (
      value &&
      this._current &&
      this._current.widget === value.widget &&
      this._current.generator === value.generator
    ) {
      return;
    }
    this._current = value;

    if (this.generator) {
      if (this.generator.toolbarGenerator) {
        this._toolbar = this.generator.toolbarGenerator();
      } else {
        this._toolbar = null;
      }
    }
    // Dispose an old activity monitor if one existed...
    if (this._monitor) {
      this._monitor.dispose();
      this._monitor = null;
    }
    // If we are wiping the ToC, update and return...
    if (!this._current) {
      this.update();
      return;
    }
    // Find the document model associated with the widget:
    const context = this._docmanager.contextForWidget(this._current.widget);
    if (!context || !context.model) {
      throw Error('Could not find a context for the Table of Contents');
    }
    // Throttle the rendering rate of the table of contents:
    this._monitor = new ActivityMonitor({
      signal: context.model.contentChanged,
      timeout: RENDER_TIMEOUT
    });
    this._monitor.activityStopped.connect(this.update, this);
    this.update();
  }

  /**
   * Current table of contents generator.
   *
   * @returns table of contents generator
   */
  get generator() {
    if (this._current) {
      return this._current.generator;
    }
    return null;
  }

  /**
   * Callback invoked upon an update request.
   *
   * @param msg - message
   */
  protected onUpdateRequest(msg: Message): void {
    let toc: IHeading[] = [];
    let title = this._trans.__('Table of Contents');
    if (this._current) {
      toc = this._current.generator.generate(this._current.widget);
      const context = this._docmanager.contextForWidget(this._current.widget);
      if (context) {
        title = PathExt.basename(context.localPath);
      }
    }
    let itemRenderer: (item: IHeading) => JSX.Element | null = (
      item: IHeading
    ) => {
      return <span>{item.text}</span>;
    };
    if (this._current && this._current.generator.itemRenderer) {
      itemRenderer = this._current.generator.itemRenderer!;
    }
    let jsx = (
      <div className="jp-TableOfContents">
        <header>{title}</header>
      </div>
    );
    if (this._current && this._current.generator) {
      jsx = (
        <TOCTree
          title={title}
          toc={toc}
          generator={this.generator}
          itemRenderer={itemRenderer}
          toolbar={this._toolbar}
        />
      );
    }
    ReactDOM.render(jsx, this.node, () => {
      if (
        this._current &&
        this._current.generator.usesLatex === true &&
        this._rendermime.latexTypesetter
      ) {
        this._rendermime.latexTypesetter.typeset(this.node);
      }
    });
  }

  /**
   * Callback invoked to re-render after showing a table of contents.
   *
   * @param msg - message
   */
  protected onAfterShow(msg: Message): void {
    this.update();
  }

  private translator: ITranslator;
  private _trans: TranslationBundle;
  private _toolbar: any;
  private _rendermime: IRenderMimeRegistry;
  private _docmanager: IDocumentManager;
  private _current: TableOfContents.ICurrentWidget | null;
  private _monitor: ActivityMonitor<any, any> | null;
}

/**
 * A namespace for TableOfContents statics.
 */
export namespace TableOfContents {
  /**
   * Interface describing table of contents widget options.
   */
  export interface IOptions {
    /**
     * Application document manager.
     */
    docmanager: IDocumentManager;

    /**
     * Application rendered MIME type.
     */
    rendermime: IRenderMimeRegistry;

    /**
     * Application language translator.
     */
    translator?: ITranslator;
  }

  /**
   * Interface describing the current widget.
   */
  export interface ICurrentWidget<W extends Widget = Widget> {
    /**
     * Current widget.
     */
    widget: W;

    /**
     * Table of contents generator for the current widget.
     */
    generator: Registry.IGenerator<W>;
  }
}
