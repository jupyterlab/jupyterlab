// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module codemirror-extension
 */

import {
  ILabShell,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { CodeEditor, IPositionModel, LineCol } from '@jupyterlab/codeeditor';
import { IStatusBar } from '@jupyterlab/statusbar';
import { ITranslator } from '@jupyterlab/translation';
import { Widget } from '@lumino/widgets';
import { commandsPlugin } from './commands';
import {
  bindingPlugin,
  extensionPlugin,
  languagePlugin,
  servicesPlugin,
  themePlugin
} from './services';

/**
 * A plugin providing a line/column status item to the application.
 */
export const lineColItem: JupyterFrontEndPlugin<IPositionModel> = {
  id: '@jupyterlab/codemirror-extension:line-col-status',
  description: 'Provides the code editor cursor position model.',
  autoStart: true,
  requires: [ITranslator],
  optional: [ILabShell, IStatusBar],
  provides: IPositionModel,
  activate: (
    app: JupyterFrontEnd,
    translator: ITranslator,
    labShell: ILabShell | null,
    statusBar: IStatusBar | null
  ): IPositionModel => {
    const item = new LineCol(translator);

    const providers = new Set<
      (widget: Widget | null) => Promise<CodeEditor.IEditor | null>
    >();

    if (statusBar) {
      // Add the status item to the status bar.
      statusBar.registerStatusItem(lineColItem.id, {
        priority: 1,
        item,
        align: 'right',
        rank: 2,
        isActive: () => !!item.model.editor
      });
    }

    const addEditorProvider = (
      provider: (widget: Widget | null) => Promise<CodeEditor.IEditor | null>
    ): void => {
      providers.add(provider);

      if (app.shell.currentWidget) {
        updateEditor(app.shell, {
          newValue: app.shell.currentWidget,
          oldValue: null
        });
      }
    };

    const update = (): void => {
      updateEditor(app.shell, {
        oldValue: app.shell.currentWidget,
        newValue: app.shell.currentWidget
      });
    };

    function updateEditor(
      shell: JupyterFrontEnd.IShell,
      changes: ILabShell.IChangedArgs
    ) {
      Promise.all([...providers].map(provider => provider(changes.newValue)))
        .then(editors => {
          item.model.editor =
            editors.filter(editor => editor !== null)[0] ?? null;
        })
        .catch(reason => {
          console.error('Get editors', reason);
        });
    }

    if (labShell) {
      labShell.currentChanged.connect(updateEditor);
    }

    return { addEditorProvider, update };
  }
};

/**
 * Export the plugins as default.
 */
const plugins: JupyterFrontEndPlugin<any>[] = [
  commandsPlugin,
  languagePlugin,
  themePlugin,
  bindingPlugin,
  extensionPlugin,
  servicesPlugin,
  lineColItem
];
export default plugins;
