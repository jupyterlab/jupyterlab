// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { editorServices } from '@jupyterlab/codemirror';

import { CodeEditorWrapper } from '@jupyterlab/codeeditor';

import { Clipboard } from '@jupyterlab/apputils';

import * as nbformat from '@jupyterlab/nbformat';

import { Context } from '@jupyterlab/docregistry';

import {
  INotebookModel,
  NotebookPanel,
  Notebook,
  NotebookModel,
  StaticNotebook
} from '@jupyterlab/notebook';

import { RenderMimeRegistry } from '@jupyterlab/rendermime';

import { Cell, CodeCellModel } from '@jupyterlab/cells';

import { defaultRenderMime as localRendermime } from './rendermime';

/**
 * Stub for the require() function.
 */
declare let require: any;

/**
 * The default notebook content.
 */
// tslint:disable-next-line

export namespace NBTestUtils {
  /**
   * The default outputs used for testing.
   */
  export const DEFAULT_OUTPUTS: nbformat.IOutput[] = [
    {
      name: 'stdout',
      output_type: 'stream',
      text: ['hello world\n', '0\n', '1\n', '2\n']
    },
    {
      name: 'stderr',
      output_type: 'stream',
      text: ['output to stderr\n']
    },
    {
      name: 'stderr',
      output_type: 'stream',
      text: ['output to stderr2\n']
    },
    {
      output_type: 'execute_result',
      execution_count: 1,
      data: { 'text/plain': 'foo' },
      metadata: {}
    },
    {
      output_type: 'display_data',
      data: { 'text/plain': 'hello, world' },
      metadata: {}
    },
    {
      output_type: 'error',
      ename: 'foo',
      evalue: 'bar',
      traceback: ['fizz', 'buzz']
    }
  ];

  export const DEFAULT_CONTENT: nbformat.INotebookContent = require('../default.json') as nbformat.INotebookContent;

  export const defaultEditorConfig = { ...StaticNotebook.defaultEditorConfig };

  export const editorFactory = editorServices.factoryService.newInlineEditor.bind(
    editorServices.factoryService
  );

  export const mimeTypeService = editorServices.mimeTypeService;

  /**
   * Get a copy of the default rendermime instance.
   */
  export function defaultRenderMime(): RenderMimeRegistry {
    return localRendermime();
  }

  export const clipboard = Clipboard.getInstance();

  /**
   * Create a base cell content factory.
   */
  export function createBaseCellFactory(): Cell.IContentFactory {
    return new Cell.ContentFactory({ editorFactory });
  }

  /**
   * Create a new code cell content factory.
   */
  export function createCodeCellFactory(): Cell.IContentFactory {
    return new Cell.ContentFactory({ editorFactory });
  }

  /**
   * Create a cell editor widget.
   */
  export function createCellEditor(model?: CodeCellModel): CodeEditorWrapper {
    return new CodeEditorWrapper({
      model: model || new CodeCellModel({}),
      factory: editorFactory
    });
  }

  /**
   * Create a default notebook content factory.
   */
  export function createNotebookFactory(): Notebook.IContentFactory {
    return new Notebook.ContentFactory({ editorFactory });
  }

  /**
   * Create a default notebook panel content factory.
   */
  export function createNotebookPanelFactory(): NotebookPanel.IContentFactory {
    return new NotebookPanel.ContentFactory({ editorFactory });
  }

  /**
   * Create a notebook widget.
   */
  export function createNotebook(): Notebook {
    return new Notebook({
      rendermime: defaultRenderMime(),
      contentFactory: createNotebookFactory(),
      mimeTypeService
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
    model.fromJSON(DEFAULT_CONTENT);
    notebook.model = model;
  }
}
