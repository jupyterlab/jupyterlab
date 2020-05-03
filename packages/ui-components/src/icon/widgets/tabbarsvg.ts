// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { hpass, VirtualElement } from '@lumino/virtualdom';
import { DockPanel, TabBar, Widget } from '@lumino/widgets';

import { closeIcon } from '../iconimports';
import { LabIconStyle } from '../../style';
import { classes } from '../../utils';

/**
 * a widget which displays titles as a single row or column of tabs.
 * Tweaked to use an inline svg as the close icon
 */
export class TabBarSvg<T> extends TabBar<T> {
  /**
   * Construct a new tab bar. Overrides the default renderer.
   *
   * @param options - The options for initializing the tab bar.
   */
  constructor(options: TabBar.IOptions<T> = {}) {
    options.renderer = options.renderer || TabBarSvg.defaultRenderer;
    super(options);
  }
}

export namespace TabBarSvg {
  /**
   * A modified implementation of the TabBar Renderer.
   */
  export class Renderer extends TabBar.Renderer {
    /**
     * Render the close icon element for a tab.
     *
     * @param data - The data to use for rendering the tab.
     *
     * @returns A virtual element representing the tab close icon.
     */
    renderCloseIcon(data: TabBar.IRenderData<any>): VirtualElement {
      const className = classes(
        'jp-icon-hover lm-TabBar-tabCloseIcon',
        LabIconStyle.styleClass({
          elementPosition: 'center',
          height: '16px',
          width: '16px'
        })
      );

      return (hpass(
        'div',
        { className },
        closeIcon
      ) as unknown) as VirtualElement;
    }
  }

  export const defaultRenderer = new Renderer();
}

/**
 * a widget which provides a flexible docking area for widgets.
 * Tweaked to use an inline svg as the close icon
 */
export class DockPanelSvg extends DockPanel {
  /**
   * Construct a new dock panel.
   *
   * @param options - The options for initializing the panel.
   */
  constructor(options: DockPanel.IOptions = {}) {
    options.renderer = options.renderer || DockPanelSvg.defaultRenderer;
    super(options);
  }
}

export namespace DockPanelSvg {
  /**
   * A modified implementation of the DockPanel Renderer.
   */
  export class Renderer extends DockPanel.Renderer {
    /**
     * Create a new tab bar (with inline svg icons enabled
     * for use with a dock panel.
     *
     * @returns A new tab bar for a dock panel.
     */
    createTabBar(): TabBarSvg<Widget> {
      const bar = new TabBarSvg<Widget>();
      bar.addClass('lm-DockPanel-tabBar');
      return bar;
    }
  }

  export const defaultRenderer = new Renderer();
}
