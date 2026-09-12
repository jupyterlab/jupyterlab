// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { ITranslator, TranslationBundle } from '@jupyterlab/translation';
import { nullTranslator } from '@jupyterlab/translation';
import type { VirtualElement } from '@lumino/virtualdom';
import { h } from '@lumino/virtualdom';
import { CommandPalette } from '@lumino/widgets';
import { LabIconStyle } from '../../style';
import { classes } from '../../utils';
import { checkIcon, filterListIcon } from '../iconimports';

const searchHeaderIcon = filterListIcon.bindprops({
  stylesheet: 'commandPaletteHeader',
  className: 'jp-icon-hoverShow-content'
});

export namespace CommandPaletteSvg {
  /**
   * a modified implementation of the CommandPalette Renderer
   */
  export class Renderer extends CommandPalette.Renderer {
    /**
     * Construct a new renderer.
     *
     * @param options - The options for initializing the renderer.
     */
    constructor(options: Renderer.IOptions = {}) {
      super();
      this.translator = options.translator ?? nullTranslator;
      this._isRecent = options.isRecent;
      this._trans = this.translator.load('jupyterlab');
    }

    /**
     * Render the virtual element for a command palette header.
     *
     * @param data - The data to use for rendering the header.
     *
     * @returns A virtual element representing the header.
     */
    renderHeader(data: CommandPalette.IHeaderRenderData): VirtualElement {
      const content = this.formatHeader(data);
      return h.li(
        { className: classes('lm-CommandPalette-header', 'jp-icon-hoverShow') },
        content,
        h.span(searchHeaderIcon)
      );
    }

    /**
     * Render the virtual element for a command palette item.
     *
     * @param data - The data to use for rendering the item.
     *
     * @returns A virtual element representing the item.
     */
    renderItem(data: CommandPalette.IItemRenderData): VirtualElement {
      const className = this.createItemClass(data);
      const dataset = this.createItemDataset(data);
      const recent = this._isRecent?.(data.item) ?? false;
      const content = [
        this.renderItemIcon(data),
        this.renderItemContent(data),
        recent ? this.renderRecentBadge() : null,
        this.renderItemShortcut(data)
      ];
      if (data.item.isToggleable) {
        return h.li(
          {
            className,
            dataset,
            role: 'menuitemcheckbox',
            'aria-checked': `${data.item.isToggled}`
          },
          ...content
        );
      }
      return h.li(
        {
          className,
          dataset,
          role: 'menuitem'
        },
        ...content
      );
    }

    /**
     * Render the badge for a recently executed command item.
     *
     * @returns A virtual element representing the badge.
     */
    renderRecentBadge(): VirtualElement {
      return h.div(
        { className: 'jp-CommandPalette-recentBadge' },
        this._trans.__('recently used')
      );
    }

    /**
     * Render the icon for a command palette item.
     *
     * @param data - The data to use for rendering the icon.
     *
     * @returns A virtual element representing the icon.
     */
    renderItemIcon(data: CommandPalette.IItemRenderData): VirtualElement {
      const className = this.createIconClass(data);

      if (data.item.isToggled) {
        // check mark icon takes precedence
        return h.div({ className }, checkIcon, data.item.iconLabel);
      }

      // if data.item.icon is undefined, it will be ignored
      return h.div({ className }, data.item.icon!, data.item.iconLabel);
    }

    /**
     * Create the class name for the command item icon.
     *
     * @param data - The data to use for the class name.
     *
     * @returns The full class name for the item icon.
     */
    createIconClass(data: CommandPalette.IItemRenderData): string {
      let name = 'lm-CommandPalette-itemIcon';

      return classes(
        LabIconStyle.styleClass({
          stylesheet: 'commandPaletteItem'
        }),
        data.item.iconClass,
        name
      );
    }

    protected translator: ITranslator;
    private _isRecent?: (item: CommandPalette.IItem) => boolean;
    private _trans: TranslationBundle;
  }

  /**
   * The namespace for the `Renderer` class statics.
   */
  export namespace Renderer {
    /**
     * An options object for initializing a command palette svg renderer.
     */
    export interface IOptions {
      /**
       * The application language translator.
       */
      translator?: ITranslator;

      /**
       * A function which tests whether a command item is a recently
       * executed command.
       *
       * #### Notes
       * A recently executed command item is rendered with a
       * `recently used` badge.
       *
       * If this function is not provided, no badge is rendered.
       */
      isRecent?: (item: CommandPalette.IItem) => boolean;
    }
  }

  export const defaultRenderer = new Renderer();
}
