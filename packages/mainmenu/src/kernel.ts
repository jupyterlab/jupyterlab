// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Menu, Widget } from '@lumino/widgets';

import { IJupyterLabMenu, JupyterLabMenu, IMenuExtender } from './labmenu';

/**
 * An interface for a Kernel menu.
 */
export interface IKernelMenu extends IJupyterLabMenu {
  /**
   * A set storing IKernelUsers for the Kernel menu.
   */
  readonly kernelUsers: Set<IKernelMenu.IKernelUser<Widget>>;
}

/**
 * An extensible Kernel menu for the application.
 */
export class KernelMenu extends JupyterLabMenu implements IKernelMenu {
  /**
   * Construct the kernel menu.
   */
  constructor(options: Menu.IOptions) {
    super(options);
    this.menu.title.label = 'Kernel';

    this.kernelUsers = new Set<IKernelMenu.IKernelUser<Widget>>();
  }

  /**
   * A set storing IKernelUsers for the Kernel menu.
   */
  readonly kernelUsers: Set<IKernelMenu.IKernelUser<Widget>>;

  /**
   * Dispose of the resources held by the kernel menu.
   */
  dispose(): void {
    this.kernelUsers.clear();
    super.dispose();
  }
}

/**
 * Namespace for IKernelMenu
 */
export namespace IKernelMenu {
  /**
   * Interface for a Kernel user to register itself
   * with the IKernelMenu's semantic extension points.
   */
  export interface IKernelUser<T extends Widget> extends IMenuExtender<T> {
    /**
     * A function to interrupt the kernel.
     */
    interruptKernel?: (widget: T) => Promise<void>;

    /**
     * A function to restart the kernel, which
     * returns a promise of whether the kernel was restarted.
     */
    restartKernel?: (widget: T) => Promise<boolean>;

    /**
     * A function to restart the kernel and clear the widget, which
     * returns a promise of whether the kernel was restarted.
     */
    restartKernelAndClear?: (widget: T) => Promise<boolean>;

    /**
     * A function to change the kernel.
     */
    changeKernel?: (widget: T) => Promise<void>;

    /**
     * A function to shut down the kernel.
     */
    shutdownKernel?: (widget: T) => Promise<void>;

    /**
     * A noun to use for the restart and clear all command.
     */
    noun?: string;
  }
}
