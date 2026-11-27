// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { User } from '@jupyterlab/services';
import { userIcon } from '@jupyterlab/ui-components';
import type { VirtualElement } from '@lumino/virtualdom';
import { h } from '@lumino/virtualdom';
import { Menu, MenuBar } from '@lumino/widgets';

/**
 * Custom renderer for the user menu.
 */
export class RendererUserMenu extends MenuBar.Renderer {
  private _user: User.IManager;

  /**
   * Constructor of the class RendererUserMenu.
   *
   * @param user - Current user object.
   */
  constructor(user: User.IManager) {
    super();
    this._user = user;
  }

  /**
   * Render the virtual element for a menu bar item.
   *
   * @param data - The data to use for rendering the item.
   *
   * @returns A virtual element representing the item.
   */
  renderItem(data: MenuBar.IRenderData): VirtualElement {
    const className = this.createItemClass(data);
    const dataset = this.createItemDataset(data);
    const aria = this.createItemARIA(data);
    const displayName = this._user.identity?.display_name ?? '';
    return h.li(
      {
        className,
        dataset,
        tabindex: '0',
        onfocus: data.onfocus,
        title: displayName,
        ...aria,
        'aria-label': displayName
      },
      this._createUserIcon(),
      this.renderLabel(data),
      this.renderIcon(data)
    );
  }

  /**
   * Render the label element for a menu item.
   *
   * @param data - The data to use for rendering the label.
   *
   * @returns A virtual element representing the item label.
   */
  renderLabel(data: MenuBar.IRenderData): VirtualElement {
    const content = this.formatLabel(data);
    return h.div(
      { className: 'lm-MenuBar-itemLabel jp-MenuBar-label' },
      content
    );
  }

  /**
   * Render the user icon element for a menu item.
   *
   * @returns A virtual element representing the item label.
   */
  private _createUserIcon(): VirtualElement {
    const identity = this._user.identity;

    if (this._user.isReady && identity?.avatar_url) {
      return h.div(
        {
          className: 'lm-MenuBar-itemIcon jp-MenuBar-imageIcon'
        },
        h.img({
          src: identity.avatar_url,
          onerror: (event: Event) => {
            const img = event.currentTarget as HTMLImageElement;
            const parent = img.parentElement;

            if (parent) {
              // Clear broken image and fallback to initials with colors
              parent.textContent = '';

              parent.style.backgroundColor = identity.color || '';

              const span = document.createElement('span');
              span.textContent = identity.initials;
              parent.appendChild(span);

              parent.classList.remove('jp-MenuBar-imageIcon');
              parent.classList.add('jp-MenuBar-anonymousIcon');
            }
          }
        })
      );
    } else if (this._user.isReady && identity) {
      return h.div(
        {
          className: 'lm-MenuBar-itemIcon jp-MenuBar-anonymousIcon',
          style: { backgroundColor: identity.color }
        },
        h.span({}, identity.initials)
      );
    } else {
      return h.div(
        {
          className: 'lm-MenuBar-itemIcon jp-MenuBar-anonymousIcon'
        },
        userIcon
      );
    }
  }
}

/**
 * Custom lumino Menu for the user menu.
 */
export class UserMenu extends Menu {
  constructor(options: UserMenu.IOptions) {
    super(options);
  }
}

/**
 * Namespace of the UserMenu class.
 */
export namespace UserMenu {
  /**
   * User menu options interface
   */
  export interface IOptions extends Menu.IOptions {
    /**
     * Current user manager.
     */
    user: User.IManager;
  }
}
