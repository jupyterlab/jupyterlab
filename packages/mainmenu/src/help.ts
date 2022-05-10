// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IRankedMenu, RankedMenu } from '@jupyterlab/ui-components';
import { SemanticCommand } from '@jupyterlab/apputils';

/**
 * An interface for a Help menu.
 */
export interface IHelpMenu extends IRankedMenu {
  /**
   * A semantic command to get the kernel for the help menu.
   * This is used to populate additional help
   * links provided by the kernel of a widget.
   *
   * #### Note
   * The command must return a Kernel.IKernelConnection object
   */
  readonly getKernel: SemanticCommand;
}

/**
 * An extensible Help menu for the application.
 */
export class HelpMenu extends RankedMenu implements IHelpMenu {
  /**
   * Construct the help menu.
   */
  constructor(options: IRankedMenu.IOptions) {
    super(options);
    this.getKernel = new SemanticCommand();
  }

  /**
   * A semantic command to get the kernel for the help menu.
   * This is used to populate additional help
   * links provided by the kernel of a widget.
   *
   * #### Note
   * The command must return a Kernel.IKernelConnection object
   */
  readonly getKernel: SemanticCommand;
}
