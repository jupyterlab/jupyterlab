// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { ICodeCellModel } from '@jupyterlab/cells';

import type { Context } from '@jupyterlab/docregistry';

import type { INotebookModel, NotebookPanel } from '@jupyterlab/notebook';
import { NBTestUtils } from '@jupyterlab/notebook/lib/testutils';

import { Debugger } from '../src/debugger';

import { NotebookHandler } from '../src/handlers/notebook';

import { DebuggerService } from '../src/service';

import { flushRequests, startTestSession } from './utils';

const CODE = 'def f():\n    return 1';

describe('NotebookHandler', () => {
  let context: Context<INotebookModel>;
  let panel: NotebookPanel;
  let service: DebuggerService;
  let handler: NotebookHandler;
  let kernel: Map<string, number[]>;

  /**
   * The model of the first cell.
   */
  function firstCell(): ICodeCellModel {
    return context.model.cells.get(0) as ICodeCellModel;
  }

  /**
   * Send a breakpoint on line 2 of the first cell, as its editor does a
   * second after an edit.
   */
  async function sendBreakpoint(): Promise<void> {
    const cellHandler = handler['_cellMap'].get(firstCell().id)!;
    cellHandler['_getBreakpointsFromEditor'] = () => [2];
    cellHandler['_sendEditorBreakpoints']();
    await flushRequests();
  }

  beforeEach(async () => {
    context = await NBTestUtils.createMockContext();
    panel = NBTestUtils.createNotebookPanel(context);
    context.model.sharedModel.insertCells(0, [
      { cell_type: 'code', source: CODE },
      { cell_type: 'code', source: 'x = 1' }
    ]);
    service = new DebuggerService({ config: new Debugger.Config() });
    kernel = startTestSession(service);
    handler = new NotebookHandler({ debuggerService: service, widget: panel });
    await sendBreakpoint();
  });

  afterEach(() => {
    handler.dispose();
    panel.dispose();
    context.dispose();
    service.dispose();
  });

  it('should keep the breakpoints of a moved cell', async () => {
    context.model.sharedModel.moveCell(0, 1);
    await flushRequests();

    expect(kernel.get(service.getCodeId(CODE))).toEqual([2]);
  });

  it('should clear the breakpoints of a deleted cell', async () => {
    context.model.sharedModel.deleteCell(0);
    await flushRequests();

    expect(kernel.has(service.getCodeId(CODE))).toBe(false);
  });

  it('should keep the breakpoints of a deleted cell whose code ran', async () => {
    const cell = firstCell();
    cell.executionState = 'running';
    cell.executionState = 'idle';
    context.model.sharedModel.deleteCell(0);
    await flushRequests();

    expect(kernel.get(service.getCodeId(CODE))).toEqual([2]);
  });

  it('should keep the breakpoints of code that ran when the cell is edited', async () => {
    const cell = firstCell();
    cell.executionState = 'running';
    cell.executionCount = 1;
    cell.executionState = 'idle';
    cell.sharedModel.setSource('def f():\n    return 2');
    await sendBreakpoint();

    expect(kernel.get(service.getCodeId(CODE))).toEqual([2]);
  });

  it('should keep the breakpoints of code that ran right after an edit', async () => {
    const cell = firstCell();
    const edited = 'def f():\n    return 2';
    cell.sharedModel.setSource(edited);
    cell.executionState = 'running';
    cell.executionCount = 1;
    cell.executionState = 'idle';
    await sendBreakpoint();
    cell.sharedModel.setSource('def f():\n    return 3');
    await sendBreakpoint();

    expect(kernel.get(service.getCodeId(edited))).toEqual([2]);
  });

  it('should keep the breakpoints of code that ran before debugging started', async () => {
    handler.dispose();
    firstCell().executionCount = 1;
    handler = new NotebookHandler({ debuggerService: service, widget: panel });
    await sendBreakpoint();
    firstCell().sharedModel.setSource('def f():\n    return 2');
    await sendBreakpoint();

    expect(kernel.get(service.getCodeId(CODE))).toEqual([2]);
  });
});
