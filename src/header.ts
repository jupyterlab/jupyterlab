// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import { Widget } from '@lumino/widgets';

import { ISignal } from '@lumino/signaling';

/**
 * The header for a Sidebar Debugger Panel.
 */
export class SidebarHeader extends Widget {
  /**
   * Instantiate a new SidebarHeader preview Panel.
   */
  constructor(options: SidebarHeader.IOptions) {
    super({ node: Private.createHeader() });
    options.titleChanged.connect((_, title) => {
      this.node.querySelector('h2').textContent = title;
    });
  }
}

export namespace SidebarHeader {
  export interface IOptions {
    titleChanged: ISignal<any, string>;
  }
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
