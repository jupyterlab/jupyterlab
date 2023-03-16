/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { ITranslator } from '@jupyterlab/translation';
import { SidePanel } from '@jupyterlab/ui-components';
import { Panel, Widget } from '@lumino/widgets';
import { TableOfContentsWidget } from './treeview';
import { TableOfContents } from './tokens';
import { Message } from '@lumino/messaging';

/**
 * Table of contents sidebar panel.
 */
export class TableOfContentsPanel extends SidePanel {
  /**
   * Constructor
   *
   * @param translator - Translator tool
   */
  constructor(translator?: ITranslator) {
    super({ content: new Panel(), translator });
    this._model = null;

    this.addClass('jp-TableOfContents');

    this._title = new Private.Header(this._trans.__('Table of Contents'));
    this.header.addWidget(this._title);

    this._treeview = new TableOfContentsWidget({
      placeholderHeadline: this._trans.__('No Headings'),
      placeholderText: this._trans.__(
        'The table of contents shows headings in notebooks and supported files.'
      )
    });
    this._treeview.addClass('jp-TableOfContents-tree');
    this.content.addWidget(this._treeview);
  }

  /**
   * Get the current model.
   */
  get model(): TableOfContents.Model | null {
    return this._model;
  }
  set model(newValue: TableOfContents.Model | null) {
    if (this._model !== newValue) {
      this._model?.stateChanged.disconnect(this._onTitleChanged, this);

      this._model = newValue;
      if (this._model) {
        this._model.isActive = this.isVisible;
      }

      this._model?.stateChanged.connect(this._onTitleChanged, this);
      this._onTitleChanged();

      this._treeview.model = this._model;
    }
  }

  protected onAfterHide(msg: Message): void {
    super.onAfterHide(msg);
    if (this._model) {
      this._model.isActive = false;
    }
  }

  protected onBeforeShow(msg: Message): void {
    super.onBeforeShow(msg);
    if (this._model) {
      this._model.isActive = true;
    }
  }

  private _onTitleChanged(): void {
    this._title.setTitle(
      this._model?.title ?? this._trans.__('Table of Contents')
    );
  }

  private _model: TableOfContents.Model | null;
  private _title: Private.Header;
  private _treeview: TableOfContentsWidget;
}

/**
 * Private helpers namespace
 */
namespace Private {
  /**
   * Panel header
   */
  export class Header extends Widget {
    /**
     * Constructor
     *
     * @param title - Title text
     */
    constructor(title: string) {
      const node = document.createElement('h2');
      node.textContent = title;
      node.classList.add('jp-text-truncated');
      super({ node });
      this._title = node;
    }

    /**
     * Set the header title.
     */
    setTitle(title: string): void {
      this._title.textContent = title;
    }

    private _title: HTMLElement;
  }
}
