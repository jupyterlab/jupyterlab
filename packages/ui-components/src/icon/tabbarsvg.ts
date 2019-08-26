import { Message } from '@phosphor/messaging';

import { h, VirtualElement } from '@phosphor/virtualdom';

import { DockPanel, TabBar, Widget } from '@phosphor/widgets';

import { IconKindType } from '../style/icon';
import { defaultIconRegistry } from './iconregistry';

/**
 * A widget which displays titles as a single row or column of tabs. Tweaked
 * to enable the use of inline svgs as tab icons.
 */
export class TabBarSvg<T> extends TabBar<T> {
  /**
   * Construct a new tab bar. Sets the (icon) kind and overrides
   * the default renderer.
   *
   * @param options - The options for initializing the tab bar.
   */
  constructor(options: TabBarSvg.IOptions<T>) {
    options.renderer = options.renderer || TabBarSvg.defaultRenderer;
    super(options);

    this._kind = options.kind;
  }

  /**
   * A message handler invoked on an `'update-request'` message. Adds svg
   * nodes to icon nodes as appropriate
   */
  protected onUpdateRequest(msg: Message): void {
    super.onUpdateRequest(msg);

    for (let itab in this.contentNode.children) {
      let tab = this.contentNode.children[itab];
      let title = this.titles[itab];
      let iconNode = tab.children ? (tab.children[0] as HTMLElement) : null;

      if (iconNode) {
        // add the svg node, if not already present
        defaultIconRegistry.icon({
          name: title.iconClass,
          className: '',
          container: iconNode,
          center: true,
          kind: this._kind
        });
      }
    }
  }

  protected _kind: IconKindType;
}

export namespace TabBarSvg {
  export interface IOptions<T> extends TabBar.IOptions<T> {
    /**
     * The kind of icon this tab bar widget should render.
     * Adds preset styling to the icons.
     */
    kind?: IconKindType;
  }

  /**
   * A modified implementation of the TabBar Renderer.
   */
  export class Renderer extends TabBar.Renderer {
    /**
     * Render the icon element for a tab. This version avoids clobbering
     * the icon node's children.
     *
     * @param data - The data to use for rendering the tab.
     *
     * @returns A virtual element representing the tab icon.
     */
    renderIcon(data: TabBar.IRenderData<any>): VirtualElement {
      let className = this.createIconClass(data);
      return h.div({ className });
    }
  }

  export const defaultRenderer = new Renderer();
}

/**
 * A widget which provides a flexible docking area for widgets.Tweaked
 * to enable the use of inline svgs as tab icons.
 */
export class DockPanelSvg extends DockPanel {
  /**
   * Construct a new dock panel. Overrides the default renderer
   * and sets the (icon) kind
   *
   * @param options - The options for initializing the panel.
   */
  constructor(options: DockPanelSvg.IOptions) {
    if (!options.renderer) {
      options.renderer = new DockPanelSvg.Renderer(options.kind);
    }

    super(options);
  }
}

export namespace DockPanelSvg {
  export interface IOptions extends DockPanel.IOptions {
    /**
     * The kind of icon this dock panel widget should render.
     * Adds preset styling to the icons.
     */
    kind?: IconKindType;
  }

  /**
   * A modified implementation of the DockPanel Renderer.
   */
  export class Renderer extends DockPanel.Renderer {
    constructor(kind?: IconKindType) {
      super();
      this._kind = kind;
    }

    /**
     * Create a new tab bar (with inline svg icons enabled
     * for use with a dock panel.
     *
     * @returns A new tab bar for a dock panel.
     */
    createTabBar(): TabBarSvg<Widget> {
      let bar = new TabBarSvg<Widget>({
        kind: this._kind
      });
      bar.addClass('p-DockPanel-tabBar');
      return bar;
    }

    _kind: IconKindType;
  }
}
