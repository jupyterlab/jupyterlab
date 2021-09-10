// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { AccordionPanel } from '@lumino/widgets';
import { Title, Widget } from '@lumino/widgets';
import { Breakpoints } from './breakpoints';
import { Callstack } from './callstack';
import { Sources } from './sources';
import { Variables } from './variables';
import { caretDownEmptyIcon } from '@jupyterlab/ui-components';

export type DebuggerPanelWidget = Breakpoints | Callstack | Sources | Variables;

export class PanelBody extends AccordionPanel {
  constructor(options: AccordionPanel.IOptions = {}) {
    super({ ...options, renderer: new DebuggerPanelBody.Renderer() });
  }

  /**
   * Check the clicked element before propagating click event.
   */
  handleEvent(event: Event): void {

    switch (event.type) {
      case 'click': {
        const target = event.target as HTMLElement | null;
        console.log('target', target, target!.nodeName );
        
        if (!target || !['DIV', 'H2', 'H3', 'SPAN'].includes(target.nodeName)) {
          return;
        }
        super.handleEvent(event);
        break;
      }
      default:
        super.handleEvent(event);
    }
  }
}

export namespace DebuggerPanelBody {
  export class Renderer extends AccordionPanel.Renderer {
    /**
     * Render the collapse indicator for a section title.
     *
     * @param data - The data to use for rendering the section title.
     *
     * @returns A element representing the collapse indicator.
     */
    createCollapseIcon(data: Title<Widget>): HTMLElement {
      const iconDiv = document.createElement('div');
      caretDownEmptyIcon.element({
        container: iconDiv
      });
      return iconDiv;
    }

    /**
     * Render the element for a section title.
     *
     * @param data - The data to use for rendering the section title.
     *
     * @returns A element representing the section title.
     */
    createSectionTitle(data: Title<Widget>): HTMLElement {
      const header: Widget = (data.owner as DebuggerPanelWidget).header;
      const handle = super.createSectionTitle(data);
      handle.classList.add('jp-AccordionPanel-title');
      if (header) {
        handle.appendChild(header.node);
      }
      return handle;
    }
  }
}
