// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  editorServices
} from '../../../lib/codemirror';

import {
  CodeConsole, ConsolePanel
} from '../../../lib/console';

import {
  defaultRenderMime
} from '../utils';


export
const editorFactory = editorServices.factoryService.newInlineEditor;

export
const mimeTypeService = editorServices.mimeTypeService;

export
const rendermime = defaultRenderMime();


/**
 * Create a console content factory.
 */
export
function createConsoleFactory(): CodeConsole.IContentFactory {
  return new CodeConsole.ContentFactory({ editorFactory });
}


/**
 * Create a panel content factory.
 */
export
function createConsolePanelFactory(): ConsolePanel.IContentFactory {
  const consoleContentFactory = createConsoleFactory();
  return new ConsolePanel.ContentFactory({ consoleContentFactory });
}
