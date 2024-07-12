// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IRankedMenu, RankedMenu } from '@jupyterlab/ui-components';
import { SemanticCommand } from '@jupyterlab/apputils';

/**
 * An interface for a Kernel menu.
 */
export interface IKernelMenu extends IRankedMenu {
  /**
   * Semantic commands IKernelUsers for the Kernel menu.
   */
  readonly kernelUsers: IKernelMenu.IKernelUser;
}

/**
 * An extensible Kernel menu for the application.
 */
export class KernelMenu extends RankedMenu implements IKernelMenu {
  /**
   * Construct the kernel menu.
   */
  constructor(options: IRankedMenu.IOptions) {
    super(options);
    this.kernelUsers = {
      changeKernel: new SemanticCommand(),
      clearWidget: new SemanticCommand(),
      interruptKernel: new SemanticCommand(),
      reconnectToKernel: new SemanticCommand(),
      restartKernel: new SemanticCommand(),
      shutdownKernel: new SemanticCommand()
    };
  }

  /**
   * Semantic commands IKernelUsers for the Kernel menu.
   */
  readonly kernelUsers: IKernelMenu.IKernelUser;
}

/**
 * Namespace for IKernelMenu
 */
export namespace IKernelMenu {
  /**
   * Interface for a Kernel user to register itself
   * with the IKernelMenu's semantic extension points.
   */
  export interface IKernelUser {
    /**
     * A semantic command to interrupt the kernel.
     */
    interruptKernel: SemanticCommand;

    /**
     * A semantic command to reconnect to the kernel
     */
    reconnectToKernel: SemanticCommand;

    /**
     * A semantic command to restart the kernel, which
     * returns a promise of whether the kernel was restarted.
     */
    restartKernel: SemanticCommand;

    /**
     * A semantic command to clear the widget.
     */
    clearWidget: SemanticCommand;

    /**
     * A semantic command to change the kernel.
     */
    changeKernel: SemanticCommand;

    /**
     * A semantic command to shut down the kernel.
     */
    shutdownKernel: SemanticCommand;
  }
}
