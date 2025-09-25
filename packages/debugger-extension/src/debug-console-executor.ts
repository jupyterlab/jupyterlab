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

  /**
   * Create an IDisplayData object with the given text content.
   */
  private createDisplayData(
    text: string,
    executionCount: ExecutionCount
  ): IDisplayData {
    return {
      output_type: 'display_data',
      data: {
        'text/plain': text
      },
      metadata: {
        execution_count: executionCount
      }
    };
  }

  async evaluateWithDebugger(options: {
    code: string;
    executionCount: ExecutionCount;
  }): Promise<IDisplayData | null> {
    const { code, executionCount } = options;

    try {
      // Check if debugger has stopped threads (required for evaluation)
      if (!this._debuggerService.hasStoppedThreads()) {
        return this.createDisplayData(
          'Debugger does not have stopped threads - cannot evaluate',
          executionCount
        );
      }

      // Evaluate the code using the debugger service
      const reply = await this._debuggerService.evaluate(code);

      if (!reply) {
        return this.createDisplayData(
          'Evaluation resulted in an error',
          executionCount
        );
      }

      // Convert reply to IDisplayData format
      return this.createDisplayData(reply.result, executionCount);
    } catch (error) {
      console.error('Error evaluating code with debugger:', error);
      return this.createDisplayData(`Error: ${error}`, executionCount);
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
      const errorOutputData = this.createDisplayData(
        'Could not display output data',
        executionCount
      );
      cell.model.outputs.add(errorOutputData);
      return false;
    }

    cell.model.outputs.add(outputDisplayData);
    return true;
  }

  private _debuggerService: IDebugger;
}
