// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Menu, Widget
} from '@phosphor/widgets';

import {
  IJupyterLabMenu, IMenuExtender, JupyterLabMenu, findExtender
} from './labmenu';

/**
 * An interface for a Run menu.
 */
export
interface IRunMenu extends IJupyterLabMenu {
  /**
   * Add an ICodeRunner to the Run menu.
   *
   * @param user - An ICodeRunner.
   */
  addRunner<T extends Widget>(user: IRunMenu.ICodeRunner<T>): void;

  /**
   * Given a widget, see if it belongs to
   * any of the ICodeRunners registered with
   * the run menu.
   *
   * @param widget: a widget.
   *
   * @returns an ICodeRunner, if any of the registered users own
   *   the widget, otherwise undefined.
   */
  findRunner(widget: Widget | null): IRunMenu.ICodeRunner<Widget> | undefined;
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
  }

  /**
   * Add an ICodeRunner to the Run menu.
   *
   * @param user - An ICodeRunner.
   */
  addRunner<T extends Widget>(runner: IRunMenu.ICodeRunner<T>): void {
    this._runners.push(runner);
  }

  /**
   * Given a widget, see if it belongs to
   * any of the ICodeRunner registered with
   * the run menu.
   *
   * @param widget: a widget.
   *
   * @returns an ICodeRunner, if any of the registered users own
   *   the widget, otherwise undefined.
   */
  findRunner(widget: Widget | null): IRunMenu.ICodeRunner<Widget> | undefined {
    return findExtender<Widget>(widget, this._runners);
  }

  private _runners: IRunMenu.ICodeRunner<Widget>[] = [];
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
