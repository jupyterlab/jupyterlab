/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import {
  DEFAULT_CONTENT,
  initNotebookContext
} from '@jupyterlab/notebook/lib/testutils';
import { ServiceManagerMock } from '@jupyterlab/services/lib/testutils';
import type { ServiceManager } from '@jupyterlab/services';

describe('Context#ready', () => {
  let manager: ServiceManager.IManager;

  beforeAll(() => {
    manager = new ServiceManagerMock();
    return manager.ready;
  });

  it('should initialize the model when the file is saved for the first time', async () => {
    const context = await initNotebookContext({ manager });
    context.model.fromJSON(DEFAULT_CONTENT);
    expect(context.model.sharedModel.canUndo()).toBe(true);
    await context.initialize(true);
    await context.ready;
    expect(context.model.sharedModel.canUndo()).toBe(false);
  });

  it('should initialize the model when the file is reverted for the first time', async () => {
    const context = await initNotebookContext({ manager });
    await manager.contents.save(context.path, {
      type: 'notebook',
      format: 'json',
      content: DEFAULT_CONTENT
    });
    context.model.fromJSON(DEFAULT_CONTENT);
    expect(context.model.sharedModel.canUndo()).toBe(true);
    await context.initialize(false);
    await context.ready;
    expect(context.model.sharedModel.canUndo()).toBe(false);
  });
});

describe('Context#save', () => {
  let manager: ServiceManager.IManager;

  beforeAll(() => {
    manager = new ServiceManagerMock();
    return manager.ready;
  });

  it('should keep the notebook dirty if a cell changes during the save', async () => {
    const context = await initNotebookContext({ manager });
    context.model.fromJSON(DEFAULT_CONTENT);
    await context.initialize(true);
    const cell = context.model.sharedModel.cells[0];
    cell.updateSource(0, 0, 'a = 1\n');
    expect(context.model.dirty).toBe(true);

    const save = manager.contents.save.bind(manager.contents);
    jest
      .mocked(manager.contents.save)
      .mockImplementationOnce((path, options) => {
        // The content to save was read before this edit.
        cell.updateSource(0, 0, '# edited\n');
        return save(path, options);
      });
    await context.save();

    const opts = { type: 'notebook', format: 'json', content: true } as const;
    expect(
      JSON.stringify((await manager.contents.get(context.path, opts)).content)
    ).not.toContain('# edited');
    expect(context.model.dirty).toBe(true);

    await context.save();
    expect(
      JSON.stringify((await manager.contents.get(context.path, opts)).content)
    ).toContain('# edited');
    expect(context.model.dirty).toBe(false);
  });
});
