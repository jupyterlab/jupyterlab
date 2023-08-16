// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { hpass, VirtualElement } from '@lumino/virtualdom';
import { DockPanel, TabBar, TabPanel, Widget } from '@lumino/widgets';
import { LabIconStyle } from '../../style';
import { classes } from '../../utils';
import { addIcon, closeIcon } from '../iconimports';

/**
 * a widget which displays titles as a single row or column of tabs.
 * Tweaked to use an inline svg as the close icon
 */
export class TabBarSvg<T> extends TabBar<T> {
  /**
   * Translator object
   */
  static translator: ITranslator | null = null;

  /**
   * Construct a new tab bar. Overrides the default renderer.
   *
   * @param options - The options for initializing the tab bar.
   */
  constructor(options: TabBar.IOptions<T> = {}) {
    super({ renderer: TabBarSvg.defaultRenderer, ...options });
    const trans = (TabBarSvg.translator ?? nullTranslator).load('jupyterlab');
    addIcon.element({
      container: this.addButtonNode,
      title: trans.__('New Launcher')
    });
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
      const trans = (TabBarSvg.translator ?? nullTranslator).load('jupyterlab');
      const title = data.title.label
        ? trans.__('Close %1', data.title.label)
        : trans.__('Close tab');
      const className = classes(
        'jp-icon-hover lm-TabBar-tabCloseIcon',
        LabIconStyle.styleClass({
          elementPosition: 'center',
          height: '16px',
          width: '16px'
        })
      );

      return hpass(
        'div',
        { className, title },
        closeIcon
      ) as unknown as VirtualElement;
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
    super({
      renderer: DockPanelSvg.defaultRenderer,
      ...options
    });
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

/**
 * A widget which combines a `TabBar` and a `StackedPanel`.
 * Tweaked to use an inline svg as the close icon
 */
export class TabPanelSvg extends TabPanel {
  /**
   * Construct a new tab panel.
   *
   * @param options - The options for initializing the tab panel.
   */
  constructor(options: TabPanel.IOptions = {}) {
    options.renderer = options.renderer || TabBarSvg.defaultRenderer;
    super(options);
  }
}
