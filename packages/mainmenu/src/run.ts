// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Menu, Widget
} from '@phosphor/widgets';

import {
  IJupyterLabMenu, IMenuExtender, JupyterLabMenu
} from './labmenu';

/**
 * An interface for a Run menu.
 */
export
interface IRunMenu extends IJupyterLabMenu {
  /**
   * A map storing ICodeRunner for the Run menu.
   *
   * ### Notes
   * The key for the map may be used in menu labels.
   */
  readonly codeRunners: Map<string, IRunMenu.ICodeRunner<Widget>>;
}

/**
 * An extensible Run menu for the application.
 */
export
class RunMenu extends JupyterLabMenu implements IRunMenu {
  /**
   * Construct the run menu.
   */
  constructor(options: Menu.IOptions) {
    super(options);
    this.title.label = 'Run';

    this.codeRunners =
      new Map<string, IRunMenu.ICodeRunner<Widget>>();
  }

  /**
   * A map storing ICodeRunner for the Run menu.
   *
   * ### Notes
   * The key for the map may be used in menu labels.
   */
  readonly codeRunners: Map<string, IRunMenu.ICodeRunner<Widget>>;
}

/**
 * A namespace for RunMenu statics.
 */
export
namespace IRunMenu {
  /**
   * An object that runs code, which may be
   * registered with the Run menu.
   */
  export
  interface ICodeRunner<T extends Widget> extends IMenuExtender<T> {
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
     * A function to run all code above the currently selected
     * point (exclusive).
     */
    runAbove?: (widget: T) => Promise<void>;

    /**
     * A function to run all code above the currently selected
     * point (inclusive).
     */
    runBelow?: (widget: T) => Promise<void>;
  }
}
