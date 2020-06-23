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

import { EditorFinder, IDebuggerEditorFinder } from './editor-finder';

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

import { IDebuggerParametersMixer, ParametersMixer } from './parameters-mixer';

/**
 * The command IDs used by the debugger plugin.
 */
export namespace CommandIDs {
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
  requires: [IDebugger, IDebuggerEditorFinder, IConsoleTracker],
  optional: [ILabShell],
  activate: (
    app: JupyterFrontEnd,
    debug: IDebugger,
    editorFinder: IDebuggerEditorFinder,
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

    const updateHandlerAndCommands = async (
      widget: ConsolePanel
    ): Promise<void> => {
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

    const updateHandlerAndCommands = async (
      widget: DocumentWidget
    ): Promise<void> => {
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
    service: IDebugger,
    notebookTracker: INotebookTracker,
    labShell: ILabShell
  ) => {
    const handler = new DebuggerHandler({
      type: 'notebook',
      shell: app.shell,
      service
    });
    service.model.disposed.connect(() => {
      handler.disposeAll(service);
    });
    const updateHandlerAndCommands = async (
      widget: NotebookPanel
    ): Promise<void> => {
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
  requires: [IDebugger, IEditorServices, IDebuggerEditorFinder],
  activate: (
    app: JupyterFrontEnd,
    debug: IDebugger,
    editorServices: IEditorServices,
    editorFinder: IDebuggerEditorFinder
  ) => {
    new TrackerHandler({
      shell: app.shell,
      editorServices,
      debuggerService: debug,
      editorFinder
    });
  }
};

/**
 * A plugin that provides a debugger service.
 */
const service: JupyterFrontEndPlugin<IDebugger> = {
  id: '@jupyterlab/debugger:service',
  autoStart: true,
  provides: IDebugger,
  requires: [IDebuggerEditorFinder, IDebuggerParametersMixer],
  activate: (
    app: JupyterFrontEnd,
    editorFinder: IDebuggerEditorFinder,
    parametersMixer: IDebuggerParametersMixer
  ) =>
    new DebuggerService({
      specsManager: app.serviceManager.kernelspecs,
      editorFinder,
      parametersMixer
    })
};

/**
 * A plugin that provides a parameters mixer with hash method.
 */
const mixer: JupyterFrontEndPlugin<IDebuggerParametersMixer> = {
  id: '@jupyterlab/debugger:parameters-mixer',
  provides: IDebuggerParametersMixer,
  autoStart: true,
  activate: () => new ParametersMixer()
};

/**
 * A plugin that tracks editors, console and file editors used for debugging.
 */
const finder: JupyterFrontEndPlugin<IDebuggerEditorFinder> = {
  id: '@jupyterlab/debugger:editor-finder',
  autoStart: true,
  provides: IDebuggerEditorFinder,
  requires: [IEditorServices, IDebuggerParametersMixer],
  optional: [INotebookTracker, IConsoleTracker, IEditorTracker],
  activate: (
    app: JupyterFrontEnd,
    editorServices: IEditorServices,
    parametersMixer: IDebuggerParametersMixer,
    notebookTracker: INotebookTracker | null,
    consoleTracker: IConsoleTracker | null,
    editorTracker: IEditorTracker | null
  ): IDebuggerEditorFinder => {
    return new EditorFinder({
      shell: app.shell,
      editorServices,
      parametersMixer,
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
          const updateStyle = (): void => {
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
 * The main debugger UI plugin.
 */
const main: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/debugger:main',
  requires: [IDebugger, IEditorServices],
  optional: [
    ILabShell,
    ILayoutRestorer,
    ICommandPalette,
    ISettingRegistry,
    IThemeManager
  ],
  autoStart: true,
  activate: async (
    app: JupyterFrontEnd,
    service: IDebugger,
    editorServices: IEditorServices,
    labShell: ILabShell | null,
    restorer: ILayoutRestorer | null,
    palette: ICommandPalette | null,
    settingRegistry: ISettingRegistry | null,
    themeManager: IThemeManager | null
  ): Promise<void> => {
    const { commands, shell } = app;

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
      const updateVariableSettings = (): void => {
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
      const updateStyle = (): void => {
        const isLight = themeManager?.theme
          ? themeManager.isLight(themeManager.theme)
          : true;
        sidebar.variables.theme = isLight ? 'light' : 'dark';
      };
      themeManager.themeChanged.connect(updateStyle);
      updateStyle();
    }

    sidebar.service.eventMessage.connect((_, event): void => {
      commands.notifyCommandChanged();
      if (labShell && event.event === 'initialized') {
        labShell.expandRight();
      }
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
  }
};

/**
 * Export the plugins as default.
 */
const plugins: JupyterFrontEndPlugin<any>[] = [
  service,
  consoles,
  files,
  notebooks,
  tracker,
  variables,
  main,
  finder,
  mixer
];

export default plugins;
