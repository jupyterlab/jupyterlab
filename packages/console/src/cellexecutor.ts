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
        const setNextInput = content.payload.find(isSetNextInputPayload);
        if (setNextInput) {
          // Ignore the `replace` value and always set the next cell.
          cell.model.sharedModel.setSource(setNextInput.text);
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

  const onFailure = (reason: unknown) => {
    onCellExecuted({
      cell,
      executionDate: new Date(),
      success: false,
      error: reason instanceof Error ? reason : new Error(String(reason))
    });
    return false;
  };

  return CodeCell.execute(cell, sessionContext).then(onSuccess, onFailure);
}

interface ISetNextInputPayload {
  source: 'set_next_input';
  text: string;
}

function isSetNextInputPayload(
  payload: unknown
): payload is ISetNextInputPayload {
  if (!payload || typeof payload !== 'object') {
    return false;
  }
  const candidate = payload as {
    source?: unknown;
    text?: unknown;
  };
  return (
    candidate.source === 'set_next_input' && typeof candidate.text === 'string'
  );
}
