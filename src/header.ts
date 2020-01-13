// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { DebuggerService } from './service';

import { PanelLayout, Widget } from '@phosphor/widgets';

/**
 * The header for a Sidebar Debugger Panel.
 */
export class SidebarHeader extends Widget {
  /**
   * Instantiate a new SidebarHeader preview Panel.
   * @param service The debuggerService needed to Instantiate a new SidebarHeader.
   */
  constructor(service: DebuggerService) {
    super({ node: document.createElement('header') });

    const title = new Widget({ node: document.createElement('h2') });

    title.node.textContent = '-';
    title.addClass('jp-left-truncated');

    service.sessionChanged.connect((_, session) => {
      session.clientChanged.connect((_, client) => {
        title.node.textContent = client.name;
      });
    });

    const layout = new PanelLayout();
    this.layout = layout;
    layout.addWidget(title);
  }
}
