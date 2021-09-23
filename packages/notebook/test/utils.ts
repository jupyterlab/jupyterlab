// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Context, DocumentRegistry } from '@jupyterlab/docregistry';
import { NBTestUtils } from '@jupyterlab/testutils';
import {
  INotebookModel,
  Notebook,
  NotebookPanel,
  NotebookWidgetFactory
} from '..';

/**
 * Local versions of the NBTestUtils that import from `src` instead of `lib`.
 */

/**
 * Create a default notebook content factory.
 */
export function createNotebookFactory(): Notebook.IContentFactory {
  return NBTestUtils.createNotebookFactory();
}

/**
 * Create a default notebook panel content factory.
 */
export function createNotebookPanelFactory(): NotebookPanel.IContentFactory {
  return NBTestUtils.createNotebookPanelFactory();
}

/**
 * Create a notebook widget.
 */
export function createNotebook(): Notebook {
  return NBTestUtils.createNotebook();
}

/**
 * Create a notebook panel widget.
 */
export function createNotebookPanel(
  context: Context<INotebookModel>
): NotebookPanel {
  return NBTestUtils.createNotebookPanel(context);
}

/**
 * Populate a notebook with default content.
 */
export function populateNotebook(notebook: Notebook): void {
  NBTestUtils.populateNotebook(notebook);
}

export const DEFAULT_CONTENT = NBTestUtils.DEFAULT_CONTENT;
export const DEFAULT_CONTENT_45 = NBTestUtils.DEFAULT_CONTENT_45;
export const editorFactory = NBTestUtils.editorFactory;
export const mimeTypeService = NBTestUtils.mimeTypeService;
export const defaultEditorConfig = NBTestUtils.defaultEditorConfig;
export const clipboard = NBTestUtils.clipboard;

export function defaultRenderMime() {
  return NBTestUtils.defaultRenderMime();
}

export function createNotebookWidgetFactory(
  toolbarFactory?: (widget: NotebookPanel) => DocumentRegistry.IToolbarItem[]
): NotebookWidgetFactory {
  return NBTestUtils.createNotebookWidgetFactory(toolbarFactory);
}

/**
 * Create a context for a file.
 */
export async function createMockContext(
  startKernel = false
): Promise<Context<INotebookModel>> {
  return NBTestUtils.createMockContext(startKernel);
}
