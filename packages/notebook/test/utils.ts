// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ISessionContext } from '@jupyterlab/apputils';
import { Context, DocumentRegistry } from '@jupyterlab/docregistry';
import { INotebookContent } from '@jupyterlab/nbformat';
import {
  INotebookModel,
  Notebook,
  NotebookPanel,
  NotebookWidgetFactory
} from '@jupyterlab/notebook';
import { NBTestUtils } from '@jupyterlab/notebook/lib/testutils';
import * as defaultContent45 from './default-45.json';
import * as emptyContent from './empty.json';

export { DEFAULT_CONTENT } from '@jupyterlab/notebook/lib/testutils';
export const DEFAULT_CONTENT_45: INotebookContent = defaultContent45;
export const EMPTY_CONTENT: INotebookContent = emptyContent;

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
export function createNotebook(sessionContext?: ISessionContext): Notebook {
  return NBTestUtils.createNotebook(sessionContext);
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

export const editorFactory = NBTestUtils.editorFactory;
export const mimeTypeService = NBTestUtils.mimeTypeService;
export const defaultEditorConfig = NBTestUtils.defaultEditorConfig;
export const clipboard = NBTestUtils.clipboard;

export function defaultRenderMime(): any {
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
