// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Kernel
} from '@jupyterlab/services';

import {
  Menu, Widget
} from '@phosphor/widgets';

import {
  IJupyterLabMenu, JupyterLabMenu, IMenuExtender, findExtender
} from './labmenu';

/**
 * An interface for a Kernel menu.
 */
export
interface IKernelMenu extends IJupyterLabMenu {
  /**
   * Add an IKernelUser to the Kernel menu.
   *
   * @param user - An IKernelUser.
   */
  addUser<T extends Widget>(user: IKernelMenu.IKernelUser<T>): void;

  /**
   * Given a widget, see if it belongs to
   * any of the IKernelUsers registered with
   * the kernel menu.
   *
   * @param widget: a widget.
   *
   * @returns an IKernelUser, if any of the registered users own
   *   the widget, otherwise undefined.
   */
  findUser(widget: Widget | null): IKernelMenu.IKernelUser<Widget> | undefined;
}

/**
 * An extensible Kernel menu for the application.
 */
export
class KernelMenu extends JupyterLabMenu implements IKernelMenu {
  /**
   * Construct the kernel menu.
   */
  constructor(options: Menu.IOptions) {
    super(options);
    this.title.label = 'Kernel';
  }

  /**
   * Add a new KernelUser to the menu.
   *
   * @param user - the user to add.
   */
  addUser<T extends Widget>(user: IKernelMenu.IKernelUser<T>): void {
    this._users.push(user);
  }

  /**
   * Find a kernel user for a given widget.
   *
   * @param widget - A widget to check.
   *
   * @returns an IKernelUser if any of the registered users own the widget.
   *   Otherwise it returns undefined.
   */
  findUser(widget: Widget | null): IKernelMenu.IKernelUser<Widget> | undefined {
    return findExtender<Widget>(widget, this._users);
  }

  private _users: IKernelMenu.IKernelUser<Widget>[] = [];
}

/**
 * Namespace for IKernelMenu
 */
export
namespace IKernelMenu {
  /**
   * Interface for a Kernel user to register itself
   * with the IKernelMenu's semantic extension points.
   */
  export
  interface IKernelUser<T extends Widget> extends IMenuExtender<T> {
    /**
     * A function to interrupt the kernel.
     */
    interruptKernel?: (widget: T) => Promise<void>;

    /**
     * A function to restart the kernel.
     */
    restartKernel?: (widget: T) => Promise<Kernel.IKernelConnection>;

    /**
     * A function to change the kernel.
     */
    changeKernel?: (widget: T) => Promise<void>;
  }
}

