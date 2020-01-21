// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import { PanelLayout, Widget } from '@lumino/widgets';

import { ISignal, Signal } from '@lumino/signaling';

/**
 * The header for a Sidebar Debugger Panel.
 */
export class SidebarHeader extends Widget {
  /**
   * Instantiate a new SidebarHeader preview Panel.
   * @param model The SidebarHeaderModel needed to Instantiate a new SidebarHeader.
   */
  constructor(model: SidebarHeaderModel) {
    super({ node: document.createElement('header') });

    const title = new Widget({
      node: document.createElement('h2')
    });
    title.node.textContent = '-';
    title.addClass('jp-left-truncated');

    model.changedTitle.connect((_, currentConnection) => {
      title.node.textContent = currentConnection;
    });

    const layout = new PanelLayout();
    this.layout = layout;
    layout.addWidget(title);
  }
}

/**
 * A model for Title of Sidebar header.
 */
export class SidebarHeaderModel {
  /**
   * Set title of header-show current enabled session.
   */
  set title(title: string) {
    this._title = title;
    this._changedTitle.emit(title);
  }

  /**
   * Get current title of header-show current enabled session.
   */
  get title() {
    return this._title;
  }

  /**
   * Signal emitted when title of header is changed.
   */
  get changedTitle(): ISignal<this, string> {
    return this._changedTitle;
  }

  private _title = '-';
  private _changedTitle = new Signal<this, string>(this);
}
