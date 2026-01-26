// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import { IConsoleCellExecutor } from '@jupyterlab/console';
import { IDebugger } from '@jupyterlab/debugger';
import { ExecutionCount, IDisplayData } from '@jupyterlab/nbformat';
import { TranslationBundle } from '@jupyterlab/translation';
/**
 * Custom console cell executor that uses debugger evaluation.
 */
export class DebugConsoleCellExecutor implements IConsoleCellExecutor {
  constructor(options: DebugConsoleCellExecutor.IOptions) {
    this._debuggerService = options.debuggerService;
    this._trans = options.trans;
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
          this._trans.__(
            'Debugger does not have stopped threads - cannot evaluate'
          ),
          executionCount
        );
      }

      // Evaluate the code using the debugger service
      const reply = await this._debuggerService.evaluate(code);

      if (!reply) {
        return this.createDisplayData(
          this._trans.__('Evaluation resulted in an error'),
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
        this._trans.__('Could not display output data'),
        executionCount
      );
      cell.model.outputs.add(errorOutputData);
      return false;
    }

    cell.model.outputs.add(outputDisplayData);
    return true;
  }

  private _debuggerService: IDebugger;
  private _trans: TranslationBundle;
}

/**
 * A namespace for DebugConsoleCellExecutor statics.
 */
export namespace DebugConsoleCellExecutor {
  /**
   * The instantiation options for a DebugConsoleCellExecutor.
   */
  export interface IOptions {
    /**
     * The debugger service for evaluating expressions in debug context.
     */
    debuggerService: IDebugger;

    /**
     * The translation bundle for internationalization.
     */
    trans: TranslationBundle;
  }
}
