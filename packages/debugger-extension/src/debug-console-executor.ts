// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IConsoleCellExecutor } from '@jupyterlab/console';
import { IDebugger } from '@jupyterlab/debugger';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { ILoggerRegistry } from '@jupyterlab/logconsole';
import { ILabShell } from '@jupyterlab/application';

/**
 * Extract the debugger evaluate logic into a reusable function.
 */
export async function evaluateWithDebugger(
  code: string,
  debuggerService: IDebugger,
  rendermime: IRenderMimeRegistry,
  loggerRegistry: ILoggerRegistry | null,
  shell: ILabShell | null
): Promise<boolean> {
  try {
    // Check if debugger has stopped threads (required for evaluation)
    if (!debuggerService.hasStoppedThreads()) {
      console.warn('Debugger does not have stopped threads - cannot evaluate');
      return false;
    }

    // Evaluate the code using the debugger service
    const reply = await debuggerService.evaluate(code);

    if (reply) {
      const data = reply.result;
      const path = debuggerService?.session?.connection?.path;
      const logger = path ? loggerRegistry?.getLogger?.(path) : undefined;

      if (logger) {
        // Print to log console of the notebook currently being debugged
        logger.log({ type: 'text', data, level: logger.level });
      } else {
        // Fallback to printing to devtools console
        console.debug('Debug evaluation result:', data);
      }
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error evaluating code with debugger:', error);
    return false;
  }
}

/**
 * Custom console cell executor that uses debugger evaluation.
 */
export class DebugConsoleCellExecutor implements IConsoleCellExecutor {
  constructor(
    private debuggerService: IDebugger,
    private rendermime: IRenderMimeRegistry,
    private loggerRegistry: ILoggerRegistry | null,
    private shell: ILabShell | null
  ) {}

  /**
   * Execute a cell using debugger evaluation.
   */
  async runCell(
    options: IConsoleCellExecutor.IRunCellOptions
  ): Promise<boolean> {
    const { cell, onCellExecuted } = options;

    // Get the source code from the cell
    const source = cell.model.sharedModel.getSource();

    // Handle special console commands
    if (source === 'clear' || source === '%clear') {
      // Let the console handle clear commands normally
      onCellExecuted({
        cell,
        executionDate: new Date(),
        success: true
      });
      return true;
    }

    // Use debugger evaluation for regular code
    const success = await evaluateWithDebugger(
      source,
      this.debuggerService,
      this.rendermime,
      this.loggerRegistry,
      this.shell
    );

    // Notify about execution completion
    onCellExecuted({
      cell,
      executionDate: new Date(),
      success,
      error: success ? null : new Error('Debugger evaluation failed')
    });

    return success;
  }
}
