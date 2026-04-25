/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import type { INotebookCellExecutor } from '@jupyterlab/notebook';
import { RuleBasedOptimizer } from '@jupyterlab/code-optimizer';
import type { OptimizedCode } from '@jupyterlab/code-optimizer';

/**
 * Custom cell executor that optimizes code before execution.
 */
export class OptimizingCellExecutor implements INotebookCellExecutor {
  constructor(private defaultExecutor: INotebookCellExecutor) {}

  /**
   * Execute a cell with code optimization.
   */
  async runCell(
    options: INotebookCellExecutor.IRunCellOptions
  ): Promise<boolean> {
    const { cell } = options;

    // Only optimize code cells
    if (cell.model.type !== 'code') {
      return this.defaultExecutor.runCell(options);
    }

    const originalCode = cell.model.sharedModel.getSource();

    // Skip optimization for empty code
    if (!originalCode.trim()) {
      return this.defaultExecutor.runCell(options);
    }

    // Optimize code
    const optimizer = new RuleBasedOptimizer();
    const optimized: OptimizedCode = optimizer.optimize(originalCode, 'python');

    // Apply optimization if code changed
    if (optimized.code !== originalCode) {
      cell.model.sharedModel.transact(() => {
        cell.model.sharedModel.setSource(optimized.code);
      });
    }

    // Execute with default executor
    return this.defaultExecutor.runCell(options);
  }
}
