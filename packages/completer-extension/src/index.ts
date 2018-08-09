// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { JupyterLab, JupyterLabPlugin } from '@jupyterlab/application';

import {
  CompleterModel,
  Completer,
  CompletionConnector,
  CompletionHandler,
  ContextConnector,
  ICompletionManager
} from '@jupyterlab/completer';

import { IConsoleTracker } from '@jupyterlab/console';

import { IDataConnector } from '@jupyterlab/coreutils';

import { IEditorTracker } from '@jupyterlab/fileeditor';

import { INotebookTracker } from '@jupyterlab/notebook';

import { Widget } from '@phosphor/widgets';

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

/**
 * A plugin providing code completion for editors.
 */
const manager: JupyterLabPlugin<ICompletionManager> = {
  id: '@jupyterlab/completer-extension:manager',
  autoStart: true,
  provides: ICompletionManager,
  activate: (app: JupyterLab): ICompletionManager => {
    const handlers: { [id: string]: CompletionHandler } = {};

    app.commands.addCommand(CommandIDs.invoke, {
      execute: args => {
        let id = args && (args['id'] as string);
        if (!id) {
          return;
        }

        const handler = handlers[id];
        if (handler) {
          handler.invoke();
        }
      }
    });

    app.commands.addCommand(CommandIDs.select, {
      execute: args => {
        let id = args && (args['id'] as string);
        if (!id) {
          return;
        }

        const handler = handlers[id];
        if (handler) {
          handler.completer.selectActive();
        }
      }
    });

    return {
      register: (
        completable: ICompletionManager.ICompletable
      ): ICompletionManager.ICompletableAttributes => {
        const { connector, editor, parent } = completable;
        const model = new CompleterModel();
        const completer = new Completer({ editor, model });
        const handler = new CompletionHandler({ completer, connector });
        const id = parent.id;

        // Hide the widget when it first loads.
        completer.hide();

        // Associate the handler with the parent widget.
        handlers[id] = handler;

        // Set the handler's editor.
        handler.editor = editor;

        // Attach the completer widget.
        Widget.attach(completer, document.body);

        // Listen for parent disposal.
        parent.disposed.connect(() => {
          delete handlers[id];
          model.dispose();
          completer.dispose();
          handler.dispose();
        });

        return handler;
      }
    };
  }
};

/**
 * An extension that registers consoles for code completion.
 */
const consoles: JupyterLabPlugin<void> = {
  id: '@jupyterlab/completer-extension:consoles',
  requires: [ICompletionManager, IConsoleTracker],
  autoStart: true,
  activate: (
    app: JupyterLab,
    manager: ICompletionManager,
    consoles: IConsoleTracker
  ): void => {
    // Create a handler for each console that is created.
    consoles.widgetAdded.connect((sender, panel) => {
      const anchor = panel.console;
      const cell = anchor.promptCell;
      const editor = cell && cell.editor;
      const session = anchor.session;
      const parent = panel;
      const connector = new CompletionConnector({ session, editor });
      const handler = manager.register({ connector, editor, parent });

      // Listen for prompt creation.
      anchor.promptCellCreated.connect((sender, cell) => {
        const editor = cell && cell.editor;
        handler.editor = editor;
        handler.connector = new CompletionConnector({ session, editor });
      });
    });

    // Add console completer invoke command.
    app.commands.addCommand(CommandIDs.invokeConsole, {
      execute: () => {
        const id = consoles.currentWidget && consoles.currentWidget.id;

        if (id) {
          return app.commands.execute(CommandIDs.invoke, { id });
        }
      }
    });

    // Add console completer select command.
    app.commands.addCommand(CommandIDs.selectConsole, {
      execute: () => {
        const id = consoles.currentWidget && consoles.currentWidget.id;

        if (id) {
          return app.commands.execute(CommandIDs.select, { id });
        }
      }
    });

    // Set enter key for console completer select command.
    app.commands.addKeyBinding({
      command: CommandIDs.selectConsole,
      keys: ['Enter'],
      selector: `.jp-ConsolePanel .jp-mod-completer-active`
    });
  }
};

/**
 * An extension that registers notebooks for code completion.
 */
const notebooks: JupyterLabPlugin<void> = {
  id: '@jupyterlab/completer-extension:notebooks',
  requires: [ICompletionManager, INotebookTracker],
  autoStart: true,
  activate: (
    app: JupyterLab,
    manager: ICompletionManager,
    notebooks: INotebookTracker
  ): void => {
    // Create a handler for each notebook that is created.
    notebooks.widgetAdded.connect((sender, panel) => {
      const cell = panel.content.activeCell;
      const editor = cell && cell.editor;
      const session = panel.session;
      const parent = panel;
      const connector = new CompletionConnector({ session, editor });
      const handler = manager.register({ connector, editor, parent });

      // Listen for active cell changes.
      panel.content.activeCellChanged.connect((sender, cell) => {
        const editor = cell && cell.editor;
        handler.editor = editor;
        handler.connector = new CompletionConnector({ session, editor });
      });
    });

    // Add notebook completer command.
    app.commands.addCommand(CommandIDs.invokeNotebook, {
      execute: () => {
        const panel = notebooks.currentWidget;
        if (panel && panel.content.activeCell.model.type === 'code') {
          return app.commands.execute(CommandIDs.invoke, { id: panel.id });
        }
      }
    });

    // Add notebook completer select command.
    app.commands.addCommand(CommandIDs.selectNotebook, {
      execute: () => {
        const id = notebooks.currentWidget && notebooks.currentWidget.id;

        if (id) {
          return app.commands.execute(CommandIDs.select, { id });
        }
      }
    });

    // Set enter key for notebook completer select command.
    app.commands.addKeyBinding({
      command: CommandIDs.selectNotebook,
      keys: ['Enter'],
      selector: `.jp-Notebook .jp-mod-completer-active`
    });
  }
};

/**
 * An extension that registers file editors for completion.
 */
const files: JupyterLabPlugin<void> = {
  id: '@jupyterlab/completer-extension:files',
  requires: [ICompletionManager, IConsoleTracker, IEditorTracker],
  autoStart: true,
  activate: (
    app: JupyterLab,
    manager: ICompletionManager,
    consoleTracker: IConsoleTracker,
    editorTracker: IEditorTracker
  ): void => {
    // Keep a list of active file completion handlers.
    const handlers: {
      [id: string]: ICompletionManager.ICompletableAttributes;
    } = {};

    // When an editor is created, check if there
    // is already a console associated with that path.
    // If so, make a CompletionConnector for it.
    // Otherwise, make the more limited ContextConnector
    editorTracker.widgetAdded.connect((sender, widget) => {
      const console = consoleTracker.find(
        c => c.session.path === widget.context.path
      );
      const editor = widget.content.editor;
      let handler: ICompletionManager.ICompletableAttributes;
      let connector: IDataConnector<
        CompletionHandler.IReply,
        void,
        CompletionHandler.IRequest
      >;
      if (console) {
        const session = console.session;
        connector = new CompletionConnector({ session, editor });
        session.terminated.connect(() => {
          if (!widget.isDisposed) {
            handler.connector = new ContextConnector({ editor });
          }
        });
      } else {
        connector = new ContextConnector({ editor });
      }
      handler = manager.register({
        connector,
        editor,
        parent: widget
      });
      handlers[widget.id] = handler;
      widget.disposed.connect(() => {
        delete handlers[widget.id];
      });
    });

    // When a console is created, check if it is associated with
    // a text editor. If so, make a completer for it.
    consoleTracker.widgetAdded.connect((sender, widget) => {
      const fileWidget = editorTracker.find(
        e => e.context.path === widget.session.path
      );
      if (fileWidget) {
        const handler = handlers[fileWidget.id];
        if (!handler) {
          return;
        }
        const session = widget.session;
        const editor = fileWidget.content.editor;
        const connector = new CompletionConnector({ session, editor });
        session.terminated.connect(() => {
          if (!fileWidget.isDisposed) {
            handler.connector = new ContextConnector({ editor });
          }
        });
        handler.connector = connector;
      }
    });

    // Add console completer invoke command.
    app.commands.addCommand(CommandIDs.invokeFile, {
      execute: () => {
        const id =
          editorTracker.currentWidget && editorTracker.currentWidget.id;

        if (id) {
          return app.commands.execute(CommandIDs.invoke, { id });
        }
      }
    });

    // Add console completer select command.
    app.commands.addCommand(CommandIDs.selectFile, {
      execute: () => {
        const id =
          editorTracker.currentWidget && editorTracker.currentWidget.id;

        if (id) {
          return app.commands.execute(CommandIDs.select, { id });
        }
      }
    });

    // Set enter key for console completer select command.
    app.commands.addKeyBinding({
      command: CommandIDs.selectFile,
      keys: ['Enter'],
      selector: `.jp-FileEditor .jp-mod-completer-active`
    });
  }
};

/**
 * Export the plugins as default.
 */
const plugins: JupyterLabPlugin<any>[] = [manager, consoles, notebooks, files];
export default plugins;
