// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Kernel } from '@jupyterlab/services';

import { Menu, Widget } from '@lumino/widgets';

import { IJupyterLabMenu, IMenuExtender, JupyterLabMenu } from './labmenu';

/**
 * An interface for a Help menu.
 */
export interface IHelpMenu extends IJupyterLabMenu {
  /**
   * A set of kernel users for the help menu.
   * This is used to populate additional help
   * links provided by the kernel of a widget.
   */
  readonly kernelUsers: Set<IHelpMenu.IKernelUser<Widget>>;
}

/**
 * An extensible Help menu for the application.
 */
export class HelpMenu extends JupyterLabMenu implements IHelpMenu {
  /**
   * Construct the help menu.
   */
  constructor(options: Menu.IOptions) {
    super(options);
    this.menu.title.label = 'Help';
    this.kernelUsers = new Set<IHelpMenu.IKernelUser<Widget>>();
  }

  /**
   * A set of kernel users for the help menu.
   * This is used to populate additional help
   * links provided by the kernel of a widget.
   */
  readonly kernelUsers: Set<IHelpMenu.IKernelUser<Widget>>;
}

/**
 * Namespace for IHelpMenu
 */
export namespace IHelpMenu {
  /**
   * Interface for a Kernel user to register itself
   * with the IHelpMenu's semantic extension points.
   */
  export interface IKernelUser<T extends Widget> extends IMenuExtender<T> {
    /**
     * A function to get the kernel for a widget.
     */
    getKernel: (widget: T) => Kernel.IKernelConnection | null;
  }
}
