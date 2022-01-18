// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module completer-extension
 */

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import {
  CompletionHandler,
  CompletionProviderManager,
  DefaultCompletionProvider,
  ICompletionProvider,
  ICompletionProviderManager
} from '@jupyterlab/completer';
import { IEditorTracker } from '@jupyterlab/fileeditor';
import { INotebookTracker } from '@jupyterlab/notebook';
import { IConsoleTracker } from '@jupyterlab/console';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { DataConnector } from '@jupyterlab/statedb';
import { CompletionConnector } from '@jupyterlab/completer/src/default/connector';
import { ReadonlyPartialJSONValue } from '@lumino/coreutils';
/**
 * The command IDs used by the completer plugin.
 */
namespace CommandIDs {
  export const invoke = 'completer:invoke';

  export const invokeConsole = 'completer:invoke-console';

  export const invokeNotebook = 'completer:invoke-notebook';

  export const invokeFile = 'completer:invoke-file';

  export const select = 'completer:select';

  export const selectConsole = 'completer:select-console';

  export const selectNotebook = 'completer:select-notebook';

  export const selectFile = 'completer:select-file';
}

const COMPLETION_MANAGER_PLUGIN = '@jupyterlab/completer-extension:tracker';

const fooService: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/completer-extension:foo',
  requires: [ICompletionProviderManager],
  autoStart: true,
  activate: async (
    app: JupyterFrontEnd,
    serviceManager: ICompletionProviderManager
  ): Promise<void> => {
    class FooConnector extends DataConnector<
      CompletionHandler.ICompletionItemsReply,
      void,
      CompletionHandler.IRequest
    > {
      fetch(
        request: CompletionHandler.IRequest
      ): Promise<CompletionHandler.ICompletionItemsReply> {
        return Promise.resolve({
          start: 3,
          end: 3,
          items: [
            { label: 'fooModule', type: 'module' },
            { label: 'barFunction', type: 'function' }
          ]
        });
      }
    }
    class FooCompletionProvider implements ICompletionProvider {
      connectorFactory(
        options: CompletionConnector.IOptions
      ): CompletionHandler.ICompletionItemsConnector {
        return new FooConnector();
      }
      identifier = 'CompletionProvider:sample';
      renderer = null;
    }

    serviceManager.registerProvider(new FooCompletionProvider());
  }
};

const defaultProvider: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/completer-extension:base-service',
  requires: [ICompletionProviderManager],
  autoStart: true,
  activate: async (
    app: JupyterFrontEnd,
    serviceManager: ICompletionProviderManager
  ): Promise<void> => {
    serviceManager.registerProvider(new DefaultCompletionProvider());
  }
};

const manager: JupyterFrontEndPlugin<ICompletionProviderManager> = {
  id: COMPLETION_MANAGER_PLUGIN,
  requires: [
    INotebookTracker,
    IEditorTracker,
    IConsoleTracker,
    ISettingRegistry
  ],
  provides: ICompletionProviderManager,
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    notebooks: INotebookTracker,
    editorTracker: IEditorTracker,
    consoles: IConsoleTracker,
    settings: ISettingRegistry
  ): ICompletionProviderManager => {
    const manager = new CompletionProviderManager();

    const updateSetting = (
      selectedProviders: ReadonlyPartialJSONValue | undefined
    ): void => {
      let current: Array<string>;
      if (typeof selectedProviders === 'string') {
        current = [selectedProviders as string];
      } else {
        current = selectedProviders as Array<string>;
      }
      manager.activateProvider(current);
    };

    const settingsPromise = settings.load(COMPLETION_MANAGER_PLUGIN);

    Promise.all([settingsPromise, app.restored]).then(([settingValues]) => {
      const availableProviders = [...manager.getServices().keys()];
      settingValues.set('availableProviders', availableProviders);
      updateSetting(settingValues.get('selectedProviders').composite);

      settingValues.changed.connect(newSettings => {
        updateSetting(newSettings.get('selectedProviders').composite);
      });
    });

    app.commands.addCommand(CommandIDs.invokeNotebook, {
      execute: args => {
        const panel = notebooks.currentWidget;
        if (panel && panel.content.activeCell?.model.type === 'code') {
          manager.invoke(panel.id);
        }
      }
    });

    app.commands.addCommand(CommandIDs.selectNotebook, {
      execute: () => {
        const id = notebooks.currentWidget && notebooks.currentWidget.id;

        if (id) {
          return manager.select(id);
        }
      }
    });

    // Add console completer invoke command.
    app.commands.addCommand(CommandIDs.invokeFile, {
      execute: () => {
        const id =
          editorTracker.currentWidget && editorTracker.currentWidget.id;
        if (id) {
          return manager.invoke(id);
        }
      }
    });

    app.commands.addCommand(CommandIDs.selectFile, {
      execute: () => {
        const id =
          editorTracker.currentWidget && editorTracker.currentWidget.id;

        if (id) {
          return manager.select(id);
        }
      }
    });

    app.commands.addCommand(CommandIDs.invokeConsole, {
      execute: () => {
        const id = consoles.currentWidget && consoles.currentWidget.id;

        if (id) {
          return manager.invoke(id);
        }
      }
    });

    app.commands.addCommand(CommandIDs.selectConsole, {
      execute: () => {
        const id = consoles.currentWidget && consoles.currentWidget.id;

        if (id) {
          return manager.select(id);
        }
      }
    });

    const addKeyBinding = (command: string, selector: string): void => {
      app.commands.addKeyBinding({
        command,
        keys: ['Enter'],
        selector
      });
    };
    addKeyBinding(
      CommandIDs.selectNotebook,
      `.jp-Notebook .jp-mod-completer-active`
    );
    addKeyBinding(
      CommandIDs.selectFile,
      `.jp-FileEditor .jp-mod-completer-active`
    );
    addKeyBinding(
      CommandIDs.selectConsole,
      `.jp-ConsolePanel .jp-mod-completer-active`
    );

    notebooks.widgetAdded.connect((_, notebook) =>
      manager.attachPanel(notebook)
    );
    editorTracker.widgetAdded.connect((_, widget) =>
      manager.attachEditor(widget, app.serviceManager.sessions)
    );
    consoles.widgetAdded.connect((_, console) =>
      manager.attachConsole(console)
    );
    return manager;
  }
};

/**
 * Export the plugins as default.
 */
const plugins: JupyterFrontEndPlugin<any>[] = [
  manager,
  defaultProvider,
  fooService
];
export default plugins;
