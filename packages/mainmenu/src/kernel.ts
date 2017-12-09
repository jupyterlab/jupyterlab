// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Kernel
} from '@jupyterlab/services';

import {
  Menu, Widget
} from '@phosphor/widgets';

import {
  IJupyterLabMenu, JupyterLabMenu, IMenuExtender
} from './labmenu';

/**
 * An interface for a Kernel menu.
 */
export
interface IKernelMenu extends IJupyterLabMenu {
  /**
   * A set storing IKernelUsers for the Kernel menu.
   */
  readonly kernelUsers: Set<IKernelMenu.IKernelUser<Widget>>;

  /**
   * A set storing IConsoleCreators for the Kernel menu.
   */
  readonly consoleCreators: Set<IKernelMenu.IConsoleCreator<Widget>>;
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
    this.menu.title.label = 'Kernel';

    this.kernelUsers =
      new Set<IKernelMenu.IKernelUser<Widget>>();
    this.consoleCreators =
      new Set<IKernelMenu.IConsoleCreator<Widget>>();
  }

  /**
   * A set storing IKernelUsers for the Kernel menu.
   */
  readonly kernelUsers: Set<IKernelMenu.IKernelUser<Widget>>;

  /**
   * A set storing IConsoleCreators for the Kernel menu.
   */
  readonly consoleCreators: Set<IKernelMenu.IConsoleCreator<Widget>>;

  /**
   * Dispose of the resources held by the kernel menu.
   */
  dispose(): void {
    this.kernelUsers.clear();
    this.consoleCreators.clear();
    super.dispose();
  }
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

    /**
     * A function to shut down the kernel.
     */
    shutdownKernel?: (widget: T) => Promise<void>;
  }

  /**
   * Interface for a command to create a console for an activity.
   */
  export
  interface IConsoleCreator<T extends Widget> extends IMenuExtender<T> {
    /**
     * The function to create the console.
     */
    createConsole: (widget: T) => Promise<void>;
  }
}
