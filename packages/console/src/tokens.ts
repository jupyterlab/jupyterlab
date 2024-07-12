// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { type ISessionContext, IWidgetTracker } from '@jupyterlab/apputils';
import type { CodeCell } from '@jupyterlab/cells';
import { Token } from '@lumino/coreutils';
import { ConsolePanel } from './panel';

/**
 * The console tracker token.
 */
export const IConsoleTracker = new Token<IConsoleTracker>(
  '@jupyterlab/console:IConsoleTracker',
  `A widget tracker for code consoles.
  Use this if you want to be able to iterate over and interact with code consoles
  created by the application.`
);

/**
 * A class that tracks console widgets.
 */
export interface IConsoleTracker extends IWidgetTracker<ConsolePanel> {}

/**
 * Console cell executor namespace
 */
export namespace IConsoleCellExecutor {
  /**
   * Execution options for console cell executor.
   */
  export interface IRunCellOptions {
    /**
     * Cell to execute
     */
    cell: CodeCell;
    /**
     * A callback to notify a cell completed execution.
     */
    onCellExecuted: (args: {
      cell: CodeCell;
      executionDate: Date;
      success: boolean;
      error?: Error | null;
    }) => void;

    /**
     * Document session context
     */
    sessionContext: ISessionContext;
  }
}

/**
 * Console cell executor interface
 */
export interface IConsoleCellExecutor {
  /**
   * Execute a cell.
   *
   * @param options Cell execution options
   */
  runCell(options: IConsoleCellExecutor.IRunCellOptions): Promise<boolean>;
}

/**
 * The Console cell executor token.
 */
export const IConsoleCellExecutor = new Token<IConsoleCellExecutor>(
  '@jupyterlab/console:IConsoleCellExecutor',
  `The console cell executor`
);
