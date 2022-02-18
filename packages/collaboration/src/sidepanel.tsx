// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { caretDownIcon } from '@jupyterlab/ui-components';
import { AccordionPanel, Title, Widget } from '@lumino/widgets';

/**
 * RTC accordion panel customization
 */
export namespace RTCPanel {
  /**
   * Custom renderer for the RTC sidebar
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
      caretDownIcon.element({
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
      const handle = super.createSectionTitle(data);
      handle.classList.add('jp-AccordionPanel-title');
      return handle;
    }
  }
}
