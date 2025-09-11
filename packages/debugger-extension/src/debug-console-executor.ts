// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import { IConsoleCellExecutor } from '@jupyterlab/console';
import { IDebugger } from '@jupyterlab/debugger';
import { ExecutionCount, IDisplayData } from '@jupyterlab/nbformat';

/**
 * Custom console cell executor that uses debugger evaluation.
 */
export class DebugConsoleCellExecutor implements IConsoleCellExecutor {
  _debuggerService: IDebugger;

  constructor(debuggerService: IDebugger) {
    this._debuggerService = debuggerService;
  }

  /**
   * Extract the debugger evaluate logic into a reusable function.
   */
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
      const result = reply.result;
      const resultStr =
        typeof result === 'string' ? result : JSON.stringify(result, null, 2);

      return {
        output_type: 'display_data',
        data: {
          'text/plain': resultStr
          // 'text/html': `<pre>${resultStr}</pre>`
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
          // 'text/html': `<pre>Error: ${error}</pre>`
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
    const ouputDisplayData = await this.evaluateWithDebugger({
      code,
      executionCount
    });

    if (!ouputDisplayData) {
      console.warn('Could not display output data');
      return false;
    }

    cell.model.outputs.add(ouputDisplayData);
    return true;
  }
}
