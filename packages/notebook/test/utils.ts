// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Context } from '@jupyterlab/docregistry';

import {
  INotebookModel,
  NotebookPanel,
  Notebook,
  NotebookModel,
  NotebookModelFactory
} from '../src';

import { NBTestUtils, Mock } from '@jupyterlab/testutils';
import { UUID } from '@lumino/coreutils';

/**
 * Local versions of the NBTestUtils that import from `src` instead of `lib`.
 */

/**
 * Create a default notebook content factory.
 */
export function createNotebookFactory(): Notebook.IContentFactory {
  return new Notebook.ContentFactory({
    editorFactory: NBTestUtils.editorFactory
  });
}

/**
 * Create a default notebook panel content factory.
 */
export function createNotebookPanelFactory(): NotebookPanel.IContentFactory {
  return new NotebookPanel.ContentFactory({
    editorFactory: NBTestUtils.editorFactory
  });
}

/**
 * Create a notebook widget.
 */
export function createNotebook(): Notebook {
  return new Notebook({
    rendermime: NBTestUtils.defaultRenderMime(),
    contentFactory: createNotebookFactory(),
    mimeTypeService: NBTestUtils.mimeTypeService
  });
}

/**
 * Create a notebook panel widget.
 */
export function createNotebookPanel(
  context: Context<INotebookModel>
): NotebookPanel {
  return new NotebookPanel({
    content: createNotebook(),
    context
  });
}

/**
 * Populate a notebook with default content.
 */
export function populateNotebook(notebook: Notebook): void {
  const model = new NotebookModel();
  model.fromJSON(NBTestUtils.DEFAULT_CONTENT);
  notebook.model = model;
}

export const DEFAULT_CONTENT = NBTestUtils.DEFAULT_CONTENT;
export const editorFactory = NBTestUtils.editorFactory;
export const mimeTypeService = NBTestUtils.mimeTypeService;
export const defaultEditorConfig = NBTestUtils.defaultEditorConfig;
export const clipboard = NBTestUtils.clipboard;

export function defaultRenderMime() {
  return NBTestUtils.defaultRenderMime();
}

/**
 * Create a context for a file.
 */
export async function createMockContext(
  startKernel = false
): Promise<Context<INotebookModel>> {
  const path = UUID.uuid4() + '.txt';
  const manager = new Mock.ServiceManagerMock();
  const factory = new NotebookModelFactory({});

  const context = new Context({
    manager,
    factory,
    path,
    kernelPreference: {
      shouldStart: startKernel,
      canStart: startKernel,
      autoStartDefault: startKernel
    }
  });
  await context.initialize(true);
  await context.sessionContext.initialize();
  return context;
}
