// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import { Widget } from '@lumino/widgets';

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
    super({ node: Private.createHeader() });

    model.changedTitle.connect((_, currentConnection) => {
      this.node.querySelector('h2').textContent = currentConnection;
    });
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

/**
 * A namespace for private module data.
 */
namespace Private {
  export function createHeader(): HTMLElement {
    const header = document.createElement('header');
    const title = document.createElement('h2');

    title.textContent = '-';
    title.classList.add('jp-left-truncated');
    header.appendChild(title);

    return header;
  }
}
