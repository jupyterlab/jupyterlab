// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IYText } from '@jupyter/ydoc';
import {
  CodeMirrorEditorFactory,
  CodeMirrorMimeTypeService,
  EditorExtensionRegistry,
  EditorLanguageRegistry,
  ybinding
} from '@jupyterlab/codemirror';
import { CodeConsole, ConsolePanel } from '@jupyterlab/console';
import { defaultRenderMime } from '@jupyterlab/rendermime/lib/testutils';

const languages = new EditorLanguageRegistry();
const extensions = (() => {
  const registry = new EditorExtensionRegistry();
  registry.addExtension({
    name: 'binding',
    factory: ({ model }) => {
      const sharedModel = model.sharedModel as IYText;
      return EditorExtensionRegistry.createImmutableExtension([
        ybinding({
          ytext: sharedModel.ysource,
          undoManager: sharedModel.undoManager ?? undefined
        })
      ]);
    }
  });

  return registry;
})();
const factoryService = new CodeMirrorEditorFactory({ extensions, languages });

export const editorFactory =
  factoryService.newInlineEditor.bind(factoryService);

export const mimeTypeService = new CodeMirrorMimeTypeService(languages);

export const rendermime = defaultRenderMime();

/**
 * Create a console content factory.
 */
export function createConsoleFactory(): CodeConsole.IContentFactory {
  return new CodeConsole.ContentFactory({ editorFactory });
}

/**
 * Create a panel content factory.
 */
export function createConsolePanelFactory(): ConsolePanel.IContentFactory {
  return new ConsolePanel.ContentFactory({ editorFactory });
}
