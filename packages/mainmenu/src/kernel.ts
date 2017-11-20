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
   * A map storing IKernelUsers for the Kernel menu.
   *
   * ### Notes
   * The key for the map may be used in menu labels.
   */
  readonly kernelUsers: Map<string, IKernelMenu.IKernelUser<Widget>>;
  
  /**
   * A map storing IConsoleCreators for the Kernel menu.
   *
   * ### Notes
   * The key for the map may be used in menu labels.
   */
  readonly consoleCreators: Map<string, IKernelMenu.IConsoleCreator<Widget>>;
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

    this.kernelUsers =
      new Map<string, IKernelMenu.IKernelUser<Widget>>();
    this.consoleCreators =
      new Map<string, IKernelMenu.IConsoleCreator<Widget>>();
  }

  /**
   * A map storing IKernelUsers for the Kernel menu.
   *
   * ### Notes
   * The key for the map may be used in menu labels.
   */
  readonly kernelUsers: Map<string, IKernelMenu.IKernelUser<Widget>>;
  
  /**
   * A map storing IConsoleCreators for the Kernel menu.
   *
   * ### Notes
   * The key for the map may be used in menu labels.
   */
  readonly consoleCreators: Map<string, IKernelMenu.IConsoleCreator<Widget>>;
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

