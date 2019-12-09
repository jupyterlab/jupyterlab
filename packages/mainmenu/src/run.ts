// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Menu, Widget } from '@lumino/widgets';

import { IJupyterLabMenu, IMenuExtender, JupyterLabMenu } from './labmenu';

/**
 * An interface for a Run menu.
 */
export interface IRunMenu extends IJupyterLabMenu {
  /**
   * A set storing ICodeRunner for the Run menu.
   *
   * ### Notes
   * The key for the set may be used in menu labels.
   */
  readonly codeRunners: Set<IRunMenu.ICodeRunner<Widget>>;
}

/**
 * An extensible Run menu for the application.
 */
export class RunMenu extends JupyterLabMenu implements IRunMenu {
  /**
   * Construct the run menu.
   */
  constructor(options: Menu.IOptions) {
    super(options);
    this.menu.title.label = 'Run';

    this.codeRunners = new Set<IRunMenu.ICodeRunner<Widget>>();
  }

  /**
   * A set storing ICodeRunner for the Run menu.
   *
   * ### Notes
   * The key for the set may be used in menu labels.
   */
  readonly codeRunners: Set<IRunMenu.ICodeRunner<Widget>>;

  /**
   * Dispose of the resources held by the run menu.
   */
  dispose(): void {
    this.codeRunners.clear();
    super.dispose();
  }
}

/**
 * A namespace for RunMenu statics.
 */
export namespace IRunMenu {
  /**
   * An object that runs code, which may be
   * registered with the Run menu.
   */
  export interface ICodeRunner<T extends Widget> extends IMenuExtender<T> {
    /**
     * A string label for the thing that is being run,
     * which is used to populate the menu labels.
     */
    noun: string;

    /**
     * A function to run a chunk of code.
     */
    run?: (widget: T) => Promise<void>;

    /**
     * A function to run the entirety of the code hosted by the widget.
     */
    runAll?: (widget: T) => Promise<void>;

    /**
     * A function to restart and run all the code hosted by the widget, which
     * returns a promise of whether the action was performed.
     */
    restartAndRunAll?: (widget: T) => Promise<boolean>;
  }
}
