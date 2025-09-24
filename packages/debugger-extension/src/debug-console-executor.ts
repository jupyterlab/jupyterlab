// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import { IConsoleCellExecutor } from '@jupyterlab/console';
import { IDebugger } from '@jupyterlab/debugger';
import { ExecutionCount, IDisplayData } from '@jupyterlab/nbformat';

/**
 * Custom console cell executor that uses debugger evaluation.
 */
export class DebugConsoleCellExecutor implements IConsoleCellExecutor {
  constructor(debuggerService: IDebugger) {
    this._debuggerService = debuggerService;
  }

  async evaluateWithDebugger(options: {
    code: string;
    executionCount: ExecutionCount;
  }): Promise<IDisplayData | null> {
    const { code, executionCount } = options;

    try {
      // Check if debugger has stopped threads (required for evaluation)
      if (!this._debuggerService.hasStoppedThreads()) {
        console.warn(
          'Debugger does not have stopped threads - cannot evaluate'
        );
        return null;
      }

      // Evaluate the code using the debugger service
      const reply = await this._debuggerService.evaluate(code);

      if (!reply) {
        return null;
      }

      // Convert reply to IDisplayData format
      return {
        output_type: 'display_data',
        data: {
          'text/plain': reply.result
        },
        metadata: {
          execution_count: executionCount
        }
      };
    } catch (error) {
      console.error('Error evaluating code with debugger:', error);
      return {
        output_type: 'display_data',
        data: {
          'text/plain': `Error: ${error}`
        },
        metadata: {
          execution_count: executionCount
        }
      };
    }
  }

  /**
   * Execute a cell using debugger evaluation.
   */
  async runCell(
    options: IConsoleCellExecutor.IRunCellOptions
  ): Promise<boolean> {
    const { cell } = options;

    const code = cell.model.sharedModel.getSource();
    const executionCount = cell.model.sharedModel.execution_count;
    const outputDisplayData = await this.evaluateWithDebugger({
      code,
      executionCount
    });

    if (!outputDisplayData) {
      console.warn('Could not display output data');
      return false;
    }

    cell.model.outputs.add(outputDisplayData);
    return true;
  }

  private _debuggerService: IDebugger;
}
