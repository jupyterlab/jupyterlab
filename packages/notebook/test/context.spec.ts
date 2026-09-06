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
