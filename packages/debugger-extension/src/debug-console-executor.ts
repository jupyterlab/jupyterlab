// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import { CodeCell } from '@jupyterlab/cells';
import { CodeConsole, IConsoleCellExecutor } from '@jupyterlab/console';
import { IDebugger } from '@jupyterlab/debugger';
import { ExecutionCount, IDisplayData } from '@jupyterlab/nbformat';

/**
 * Custom console cell executor that uses debugger evaluation.
 */
export class DebugConsoleCellExecutor implements IConsoleCellExecutor {
  private _debuggerService: IDebugger;
  private _codeConsole: CodeConsole;
  private _currentPromptCell: CodeCell;

  constructor(debuggerService: IDebugger) {
    this._debuggerService = debuggerService;
  }

  get codeConsole(): CodeConsole {
    return this._codeConsole;
  }

  set codeConsole(value: CodeConsole) {
    this._codeConsole = value;

    // Prompt cell gets recreated every execution
    this._codeConsole.promptCellCreated.connect((_, promptCell) => {
      this._currentPromptCell = promptCell;

      // TODO debounce
      // Capture typing
      this._currentPromptCell.model.sharedModel.changed.connect(() => {
        this.evalForCompletion();
      });
    });
  }

  async evalForCompletion() {
    console.log('evaling for completion');
    const input = this._currentPromptCell.model.sharedModel.getSource();
    const code = `get_ipython().completer('${input}')`;
    console.log('code', code);
    const results = await this._debuggerService.evaluate(code);
    this._currentPromptCell.editor?.injectExtension;
    console.log('results', results);
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
