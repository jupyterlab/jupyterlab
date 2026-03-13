/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { CodeCell } from '@jupyterlab/cells';
import type { KernelMessage } from '@jupyterlab/services';
import type { IConsoleCellExecutor } from './tokens';

/**
 * Run a console cell.
 *
 * @param options Cell execution options
 * @returns Execution status
 */
export async function runCell({
  cell,
  onCellExecuted,
  sessionContext
}: IConsoleCellExecutor.IRunCellOptions): Promise<boolean> {
  const onSuccess = (value: KernelMessage.IExecuteReplyMsg) => {
    if (value && value.content.status === 'ok') {
      const content = value.content;
      // Use deprecated payloads for backwards compatibility.
      if (content.payload && content.payload.length) {
        const setNextInput = content.payload.filter(i => {
          return (i as any).source === 'set_next_input';
        })[0];
        if (setNextInput) {
          const text = (setNextInput as any).text;
          // Ignore the `replace` value and always set the next cell.
          cell.model.sharedModel.setSource(text);
        }
      }

      onCellExecuted({
        cell,
        executionDate: new Date(),
        success: true
      });
      return true;
    } else if (value && value.content.status === 'error') {
      const errorName = value.content.ename;
      const errorValue = value.content.evalue;

      onCellExecuted({
        cell,
        executionDate: new Date(),
        success: false,
        error: new Error(`KernelReplyNotOK: ${errorName} ${errorValue}`)
      });
      return false;
    }

    onCellExecuted({
      cell,
      executionDate: new Date(),
      success: false
    });
    return false;
  };

  const onFailure = (reason: any) => {
    onCellExecuted({
      cell,
      executionDate: new Date(),
      success: false,
      error: new Error(reason)
    });
    return false;
  };

  return CodeCell.execute(cell, sessionContext).then(onSuccess, onFailure);
}
