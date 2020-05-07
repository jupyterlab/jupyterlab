// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ILabShell,
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import {
  ICommandPalette,
  IThemeManager,
  MainAreaWidget,
  WidgetTracker
} from '@jupyterlab/apputils';

import { IEditorServices } from '@jupyterlab/codeeditor';

import { ConsolePanel, IConsoleTracker } from '@jupyterlab/console';

import { ISettingRegistry } from '@jupyterlab/settingregistry';

import { DocumentWidget } from '@jupyterlab/docregistry';

import { FileEditor, IEditorTracker } from '@jupyterlab/fileeditor';

import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';

import { Session } from '@jupyterlab/services';

import {
  continueIcon,
  stepIntoIcon,
  stepOutIcon,
  stepOverIcon,
  terminateIcon,
  variableIcon
} from './icons';

import { Debugger } from './debugger';

import { TrackerHandler } from './handlers/tracker';

import { DebuggerService } from './service';

import { DebuggerHandler } from './handler';

import { IDebugger } from './tokens';

import { DebuggerModel } from './model';

import { VariablesBodyGrid } from './variables/grid';

/**
 * The command IDs used by the debugger plugin.
 */
export namespace CommandIDs {
  export const start = 'debugger:start';

  export const stop = 'debugger:stop';

  export const debugContinue = 'debugger:continue';

  export const terminate = 'debugger:terminate';

  export const next = 'debugger:next';

  export const stepIn = 'debugger:stepIn';

  export const stepOut = 'debugger:stepOut';

  export const inspectVariable = 'debugger:inspect-variable';
}

/**
 * A plugin that provides visual debugging support for consoles.
 */
const consoles: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/debugger:consoles',
  autoStart: true,
  requires: [IDebugger, IConsoleTracker],
  optional: [ILabShell],
  activate: (
    app: JupyterFrontEnd,
    debug: IDebugger,
    consoleTracker: IConsoleTracker,
    labShell: ILabShell
  ) => {
    const handler = new DebuggerHandler({
      type: 'console',
      shell: app.shell,
      service: debug
    });
    debug.model.disposed.connect(() => {
      handler.disposeAll(debug);
    });

    const updateHandlerAndCommands = async (widget: ConsolePanel) => {
      const { sessionContext } = widget;
      await sessionContext.ready;
      await handler.updateContext(widget, sessionContext);
      app.commands.notifyCommandChanged();
    };

    if (labShell) {
      labShell.currentChanged.connect(async (_, update) => {
        const widget = update.newValue;
        if (!(widget instanceof ConsolePanel)) {
          return;
        }
        await updateHandlerAndCommands(widget);
      });
      return;
    }

    consoleTracker.currentChanged.connect(async (_, consolePanel) => {
      await updateHandlerAndCommands(consolePanel);
    });
  }
};

/**
 * A plugin that provides visual debugging support for file editors.
 */
const files: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/debugger:files',
  autoStart: true,
  requires: [IDebugger, IEditorTracker],
  optional: [ILabShell],
  activate: (
    app: JupyterFrontEnd,
    debug: IDebugger,
    editorTracker: IEditorTracker,
    labShell: ILabShell
  ) => {
    const handler = new DebuggerHandler({
      type: 'file',
      shell: app.shell,
      service: debug
    });
    debug.model.disposed.connect(() => {
      handler.disposeAll(debug);
    });

    const activeSessions: {
      [id: string]: Session.ISessionConnection;
    } = {};

    const updateHandlerAndCommands = async (widget: DocumentWidget) => {
      const sessions = app.serviceManager.sessions;
      try {
        const model = await sessions.findByPath(widget.context.path);
        let session = activeSessions[model.id];
        if (!session) {
          // Use `connectTo` only if the session does not exist.
          // `connectTo` sends a kernel_info_request on the shell
          // channel, which blocks the debug session restore when waiting
          // for the kernel to be ready
          session = sessions.connectTo({ model });
          activeSessions[model.id] = session;
        }
        await handler.update(widget, session);
        app.commands.notifyCommandChanged();
      } catch {
        return;
      }
    };

    if (labShell) {
      labShell.currentChanged.connect(async (_, update) => {
        const widget = update.newValue;
        if (!(widget instanceof DocumentWidget)) {
          return;
        }

        const content = widget.content;
        if (!(content instanceof FileEditor)) {
          return;
        }
        await updateHandlerAndCommands(widget);
      });
    }

    editorTracker.currentChanged.connect(async (_, documentWidget) => {
      await updateHandlerAndCommands(
        (documentWidget as unknown) as DocumentWidget
      );
    });
  }
};

/**
 * A plugin that provides visual debugging support for notebooks.
 */
const notebooks: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/debugger:notebooks',
  autoStart: true,
  requires: [IDebugger, INotebookTracker],
  optional: [ILabShell],
  activate: (
    app: JupyterFrontEnd,
    debug: IDebugger,
    notebookTracker: INotebookTracker,
    labShell: ILabShell
  ) => {
    const handler = new DebuggerHandler({
      type: 'notebook',
      shell: app.shell,
      service: debug
    });
    debug.model.disposed.connect(() => {
      handler.disposeAll(debug);
    });
    const updateHandlerAndCommands = async (widget: NotebookPanel) => {
      const { sessionContext } = widget;
      await sessionContext.ready;
      await handler.updateContext(widget, sessionContext);
      app.commands.notifyCommandChanged();
    };

    if (labShell) {
      labShell.currentChanged.connect(async (_, update) => {
        const widget = update.newValue;
        if (!(widget instanceof NotebookPanel)) {
          return;
        }
        await updateHandlerAndCommands(widget);
      });
      return;
    }

    notebookTracker.currentChanged.connect(
      async (_, notebookPanel: NotebookPanel) => {
        await updateHandlerAndCommands(notebookPanel);
      }
    );
  }
};

/**
 * A plugin that tracks notebook, console and file editors used for debugging.
 */
const tracker: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/debugger:tracker',
  autoStart: true,
  requires: [IDebugger, IEditorServices],
  optional: [INotebookTracker, IConsoleTracker, IEditorTracker],
  activate: (
    app: JupyterFrontEnd,
    debug: IDebugger,
    editorServices: IEditorServices,
    notebookTracker: INotebookTracker,
    consoleTracker: IConsoleTracker,
    editorTracker: IEditorTracker
  ) => {
    new TrackerHandler({
      shell: app.shell,
      editorServices,
      debuggerService: debug,
      notebookTracker,
      consoleTracker,
      editorTracker
    });
  }
};

/*
 * A plugin to open detailed views for variables.
 */
const variables: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/debugger:variables',
  autoStart: true,
  requires: [IDebugger],
  optional: [IThemeManager],
  activate: (
    app: JupyterFrontEnd,
    service: IDebugger,
    themeManager: IThemeManager
  ) => {
    const { commands, shell } = app;
    const tracker = new WidgetTracker<MainAreaWidget<VariablesBodyGrid>>({
      namespace: 'debugger/inspect-variable'
    });

    commands.addCommand(CommandIDs.inspectVariable, {
      label: 'Inspect Variable',
      caption: 'Inspect Variable',
      execute: async args => {
        const { variableReference } = args;
        if (!variableReference || variableReference === 0) {
          return;
        }
        const variables = await service.inspectVariable(
          variableReference as number
        );

        const title = args.title as string;
        const id = `jp-debugger-variable-${title}`;
        if (
          !variables ||
          variables.length === 0 ||
          tracker.find(widget => widget.id === id)
        ) {
          return;
        }

        const model = (service.model as DebuggerModel).variables;
        const widget = new MainAreaWidget<VariablesBodyGrid>({
          content: new VariablesBodyGrid({
            model,
            commands,
            scopes: [{ name: title, variables }]
          })
        });
        widget.addClass('jp-DebuggerVariables');
        widget.id = id;
        widget.title.icon = variableIcon;
        widget.title.label = `${service.session?.connection?.name} - ${title}`;
        void tracker.add(widget);

        model.changed.connect(() => widget.dispose());

        if (themeManager) {
          const updateStyle = () => {
            const isLight = themeManager?.theme
              ? themeManager.isLight(themeManager.theme)
              : true;
            widget.content.theme = isLight ? 'light' : 'dark';
          };
          themeManager.themeChanged.connect(updateStyle);
          widget.disposed.connect(() =>
            themeManager.themeChanged.disconnect(updateStyle)
          );
          updateStyle();
        }

        shell.add(widget, 'main', {
          mode: tracker.currentWidget ? 'split-right' : 'split-bottom'
        });
      }
    });
  }
};

/**
 * A plugin providing a tracker code debuggers.
 */
const main: JupyterFrontEndPlugin<IDebugger> = {
  id: '@jupyterlab/debugger:main',
  requires: [IEditorServices],
  optional: [ILayoutRestorer, ICommandPalette, ISettingRegistry, IThemeManager],
  provides: IDebugger,
  autoStart: true,
  activate: async (
    app: JupyterFrontEnd,
    editorServices: IEditorServices,
    restorer: ILayoutRestorer | null,
    palette: ICommandPalette | null,
    settingRegistry: ISettingRegistry | null,
    themeManager: IThemeManager | null
  ): Promise<IDebugger> => {
    const { commands, shell } = app;

    const service = new DebuggerService();

    commands.addCommand(CommandIDs.debugContinue, {
      label: 'Continue',
      caption: 'Continue',
      icon: continueIcon,
      isEnabled: () => {
        return service.hasStoppedThreads();
      },
      execute: async () => {
        await service.continue();
        commands.notifyCommandChanged();
      }
    });

    commands.addCommand(CommandIDs.terminate, {
      label: 'Terminate',
      caption: 'Terminate',
      icon: terminateIcon,
      isEnabled: () => {
        return service.hasStoppedThreads();
      },
      execute: async () => {
        await service.restart();
        commands.notifyCommandChanged();
      }
    });

    commands.addCommand(CommandIDs.next, {
      label: 'Next',
      caption: 'Next',
      icon: stepOverIcon,
      isEnabled: () => {
        return service.hasStoppedThreads();
      },
      execute: async () => {
        await service.next();
      }
    });

    commands.addCommand(CommandIDs.stepIn, {
      label: 'StepIn',
      caption: 'Step In',
      icon: stepIntoIcon,
      isEnabled: () => {
        return service.hasStoppedThreads();
      },
      execute: async () => {
        await service.stepIn();
      }
    });

    commands.addCommand(CommandIDs.stepOut, {
      label: 'StepOut',
      caption: 'Step Out',
      icon: stepOutIcon,
      isEnabled: () => {
        return service.hasStoppedThreads();
      },
      execute: async () => {
        await service.stepOut();
      }
    });

    const callstackCommands = {
      registry: commands,
      continue: CommandIDs.debugContinue,
      terminate: CommandIDs.terminate,
      next: CommandIDs.next,
      stepIn: CommandIDs.stepIn,
      stepOut: CommandIDs.stepOut
    };

    const sidebar = new Debugger.Sidebar({
      service,
      callstackCommands,
      editorServices
    });

    if (settingRegistry) {
      const setting = await settingRegistry.load(main.id);
      const updateVariableSettings = () => {
        const filters = setting.get('variableFilters').composite as {
          [key: string]: string[];
        };
        const kernelName = service.session?.connection?.kernel?.name;
        const list = filters[kernelName];
        if (!list) {
          return;
        }
        sidebar.variables.filter = new Set<string>(list);
      };

      updateVariableSettings();
      setting.changed.connect(updateVariableSettings);
      sidebar.service.sessionChanged.connect(updateVariableSettings);
    }

    if (themeManager) {
      const updateStyle = () => {
        const isLight = themeManager?.theme
          ? themeManager.isLight(themeManager.theme)
          : true;
        sidebar.variables.theme = isLight ? 'light' : 'dark';
      };
      themeManager.themeChanged.connect(updateStyle);
      updateStyle();
    }

    sidebar.service.eventMessage.connect(_ => {
      commands.notifyCommandChanged();
    });

    sidebar.service.sessionChanged.connect(_ => {
      commands.notifyCommandChanged();
    });

    if (restorer) {
      restorer.add(sidebar, 'debugger-sidebar');
    }

    shell.add(sidebar, 'right');

    if (palette) {
      const category = 'Debugger';
      [
        CommandIDs.debugContinue,
        CommandIDs.terminate,
        CommandIDs.next,
        CommandIDs.stepIn,
        CommandIDs.stepOut
      ].forEach(command => {
        palette.addItem({ command, category });
      });
    }

    return service;
  }
};

/**
 * Export the plugins as default.
 */

const plugins: JupyterFrontEndPlugin<any>[] = [
  consoles,
  files,
  notebooks,
  tracker,
  variables,
  main
];

export default plugins;
