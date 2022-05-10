// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IRankedMenu, RankedMenu } from '@jupyterlab/ui-components';
import { SemanticCommand } from '@jupyterlab/apputils';

/**
 * An interface for a Run menu.
 */
export interface IRunMenu extends IRankedMenu {
  /**
   * Semantic commands ICodeRunner for the Run menu.
   */
  readonly codeRunners: IRunMenu.ICodeRunner;
}

/**
 * An extensible Run menu for the application.
 */
export class RunMenu extends RankedMenu implements IRunMenu {
  /**
   * Construct the run menu.
   */
  constructor(options: IRankedMenu.IOptions) {
    super(options);
    this.codeRunners = {
      restart: new SemanticCommand(),
      run: new SemanticCommand(),
      runAll: new SemanticCommand()
    };
  }

  /**
   * Semantic commands ICodeRunner for the Run menu.
   */
  readonly codeRunners: IRunMenu.ICodeRunner;
}

/**
 * A namespace for RunMenu statics.
 */
export namespace IRunMenu {
  /**
   * An object that runs code, which may be
   * registered with the Run menu.
   */
  export interface ICodeRunner {
    /**
     * A semantic command to run a subpart of a document.
     */
    run: SemanticCommand;
    /**
     * A semantic command to run a whole document
     */
    runAll: SemanticCommand;
    /**
     * A semantic command to restart a kernel
     */
    restart: SemanticCommand;
  }
}
