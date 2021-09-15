// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { AccordionPanel, Title, Widget } from '@lumino/widgets';
import { caretDownEmptyIcon } from '@jupyterlab/ui-components';
import { PanelWithToolbar } from './panelwithtoolbar';

/**
 * Debugger accordion panel customization
 */
export namespace DebuggerAccordionPanel {
  /**
   * Custom renderer for the debugger sidebar
   */
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
      const toolbar = (data.owner as PanelWithToolbar).toolbar;
      const handle = super.createSectionTitle(data);
      handle.classList.add('jp-AccordionPanel-title');
      if (toolbar) {
        handle.appendChild(toolbar.node);
      }
      return handle;
    }
  }
}
