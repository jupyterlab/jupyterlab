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

import { PageConfig, PathExt } from '@jupyterlab/coreutils';

import {
  Debugger,
  IDebugger,
  IDebuggerConfig,
  IDebuggerSources,
  IDebuggerSidebar
} from '@jupyterlab/debugger';

import { DocumentWidget } from '@jupyterlab/docregistry';

import { FileEditor, IEditorTracker } from '@jupyterlab/fileeditor';

import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';

import { Session } from '@jupyterlab/services';

import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { ITranslator } from '@jupyterlab/translation';

/**
 * A plugin that provides visual debugging support for consoles.
 */
const consoles: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/debugger-extension:consoles',
  autoStart: true,
  requires: [IDebugger, IConsoleTracker],
  optional: [ILabShell],
  activate: (
    app: JupyterFrontEnd,
    debug: IDebugger,
    consoleTracker: IConsoleTracker,
    labShell: ILabShell | null
  ) => {
    const handler = new Debugger.Handler({
      type: 'console',
      shell: app.shell,
      service: debug
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
      if (consolePanel) {
        void updateHandlerAndCommands(consolePanel);
      }
    });
  }
};

/**
 * A plugin that provides visual debugging support for file editors.
 */
const files: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/debugger-extension:files',
  autoStart: true,
  requires: [IDebugger, IEditorTracker],
  optional: [ILabShell],
  activate: (
    app: JupyterFrontEnd,
    debug: IDebugger,
    editorTracker: IEditorTracker,
    labShell: ILabShell | null
  ) => {
    const handler = new Debugger.Handler({
      type: 'file',
      shell: app.shell,
      service: debug
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
        if (!model) {
          return;
        }
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
  id: '@jupyterlab/debugger-extension:notebooks',
  autoStart: true,
  requires: [IDebugger, INotebookTracker],
  optional: [ILabShell],
  activate: (
    app: JupyterFrontEnd,
    service: IDebugger,
    notebookTracker: INotebookTracker,
    labShell: ILabShell | null
  ) => {
    const handler = new Debugger.Handler({
      type: 'notebook',
      shell: app.shell,
      service
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
 * A plugin that provides a debugger service.
 */
const service: JupyterFrontEndPlugin<IDebugger> = {
  id: '@jupyterlab/debugger-extension:service',
  autoStart: true,
  provides: IDebugger,
  requires: [IDebuggerConfig],
  optional: [IDebuggerSources],
  activate: (
    app: JupyterFrontEnd,
    config: IDebugger.IConfig,
    debuggerSources: IDebugger.ISources | null
  ) =>
    new Debugger.Service({
      config,
      debuggerSources,
      specsManager: app.serviceManager.kernelspecs
    })
};

/**
 * A plugin that provides a configuration with hash method.
 */
const configuration: JupyterFrontEndPlugin<IDebugger.IConfig> = {
  id: '@jupyterlab/debugger-extension:config',
  provides: IDebuggerConfig,
  autoStart: true,
  activate: () => new Debugger.Config()
};

/**
 * A plugin that provides source/editor functionality for debugging.
 */
const sources: JupyterFrontEndPlugin<IDebugger.ISources> = {
  id: '@jupyterlab/debugger-extension:sources',
  autoStart: true,
  provides: IDebuggerSources,
  requires: [IDebuggerConfig, IEditorServices],
  optional: [INotebookTracker, IConsoleTracker, IEditorTracker],
  activate: (
    app: JupyterFrontEnd,
    config: IDebugger.IConfig,
    editorServices: IEditorServices,
    notebookTracker: INotebookTracker | null,
    consoleTracker: IConsoleTracker | null,
    editorTracker: IEditorTracker | null
  ): IDebugger.ISources => {
    return new Debugger.Sources({
      config,
      shell: app.shell,
      editorServices,
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
  id: '@jupyterlab/debugger-extension:variables',
  autoStart: true,
  requires: [IDebugger, ITranslator],
  optional: [IThemeManager],
  activate: (
    app: JupyterFrontEnd,
    service: IDebugger,
    translator: ITranslator,
    themeManager: IThemeManager | null
  ) => {
    const trans = translator.load('jupyterlab');
    const { commands, shell } = app;
    const tracker = new WidgetTracker<MainAreaWidget<Debugger.VariablesGrid>>({
      namespace: 'debugger/inspect-variable'
    });
    const CommandIDs = Debugger.CommandIDs;

    commands.addCommand(CommandIDs.inspectVariable, {
      label: trans.__('Inspect Variable'),
      caption: trans.__('Inspect Variable'),
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

        const model = service.model.variables;
        const widget = new MainAreaWidget<Debugger.VariablesGrid>({
          content: new Debugger.VariablesGrid({
            model,
            commands,
            scopes: [{ name: title, variables }],
            themeManager
          })
        });
        widget.addClass('jp-DebuggerVariables');
        widget.id = id;
        widget.title.icon = Debugger.Icons.variableIcon;
        widget.title.label = `${service.session?.connection?.name} - ${title}`;
        void tracker.add(widget);
        model.changed.connect(() => widget.dispose());
        shell.add(widget, 'main', {
          mode: tracker.currentWidget ? 'split-right' : 'split-bottom'
        });
      }
    });
  }
};

/**
 * Debugger sidebar provider plugin.
 */
const sidebar: JupyterFrontEndPlugin<IDebugger.ISidebar> = {
  id: '@jupyterlab/debugger-extension:sidebar',
  provides: IDebuggerSidebar,
  requires: [IDebugger, IEditorServices, ITranslator],
  optional: [IThemeManager, ISettingRegistry],
  autoStart: true,
  activate: async (
    app: JupyterFrontEnd,
    service: IDebugger,
    editorServices: IEditorServices,
    translator: ITranslator,
    themeManager: IThemeManager | null,
    settingRegistry: ISettingRegistry | null
  ): Promise<IDebugger.ISidebar> => {
    const { commands } = app;
    const CommandIDs = Debugger.CommandIDs;

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
      editorServices,
      themeManager,
      translator
    });

    if (settingRegistry) {
      const setting = await settingRegistry.load(main.id);
      const updateSettings = (): void => {
        const filters = setting.get('variableFilters').composite as {
          [key: string]: string[];
        };
        const kernel = service.session?.connection?.kernel?.name ?? '';
        if (kernel && filters[kernel]) {
          sidebar.variables.filter = new Set<string>(filters[kernel]);
        }
      };
      updateSettings();
      setting.changed.connect(updateSettings);
      service.sessionChanged.connect(updateSettings);
    }

    return sidebar;
  }
};

/**
 * The main debugger UI plugin.
 */
const main: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/debugger-extension:main',
  requires: [IDebugger, IEditorServices, ITranslator, IDebuggerSidebar],
  optional: [ILabShell, ILayoutRestorer, ICommandPalette, IDebuggerSources],
  autoStart: true,
  activate: async (
    app: JupyterFrontEnd,
    service: IDebugger,
    editorServices: IEditorServices,
    translator: ITranslator,
    sidebar: IDebugger.ISidebar,
    labShell: ILabShell | null,
    restorer: ILayoutRestorer | null,
    palette: ICommandPalette | null,
    debuggerSources: IDebugger.ISources | null
  ): Promise<void> => {
    const trans = translator.load('jupyterlab');
    const { commands, shell, serviceManager } = app;
    const { kernelspecs } = serviceManager;
    const CommandIDs = Debugger.CommandIDs;

    // First check if there is a PageConfig override for the extension visibility
    const alwaysShowDebuggerExtension =
      PageConfig.getOption('alwaysShowDebuggerExtension').toLowerCase() ===
      'true';
    if (!alwaysShowDebuggerExtension) {
      // hide the debugger sidebar if no kernel with support for debugging is available
      await kernelspecs.ready;
      const specs = kernelspecs.specs?.kernelspecs;
      if (!specs) {
        return;
      }
      const enabled = Object.keys(specs).some(
        name => !!(specs[name]?.metadata?.['debugger'] ?? false)
      );
      if (!enabled) {
        return;
      }
    }

    commands.addCommand(CommandIDs.debugContinue, {
      label: trans.__('Continue'),
      caption: trans.__('Continue'),
      icon: Debugger.Icons.continueIcon,
      isEnabled: () => {
        return service.hasStoppedThreads();
      },
      execute: async () => {
        await service.continue();
        commands.notifyCommandChanged();
      }
    });

    commands.addCommand(CommandIDs.terminate, {
      label: trans.__('Terminate'),
      caption: trans.__('Terminate'),
      icon: Debugger.Icons.terminateIcon,
      isEnabled: () => {
        return service.hasStoppedThreads();
      },
      execute: async () => {
        await service.restart();
        commands.notifyCommandChanged();
      }
    });

    commands.addCommand(CommandIDs.next, {
      label: trans.__('Next'),
      caption: trans.__('Next'),
      icon: Debugger.Icons.stepOverIcon,
      isEnabled: () => {
        return service.hasStoppedThreads();
      },
      execute: async () => {
        await service.next();
      }
    });

    commands.addCommand(CommandIDs.stepIn, {
      label: trans.__('Step In'),
      caption: trans.__('Step In'),
      icon: Debugger.Icons.stepIntoIcon,
      isEnabled: () => {
        return service.hasStoppedThreads();
      },
      execute: async () => {
        await service.stepIn();
      }
    });

    commands.addCommand(CommandIDs.stepOut, {
      label: trans.__('Step Out'),
      caption: trans.__('Step Out'),
      icon: Debugger.Icons.stepOutIcon,
      isEnabled: () => {
        return service.hasStoppedThreads();
      },
      execute: async () => {
        await service.stepOut();
      }
    });

    service.eventMessage.connect((_, event): void => {
      commands.notifyCommandChanged();
      if (labShell && event.event === 'initialized') {
        labShell.expandRight();
      }
    });

    service.sessionChanged.connect(_ => {
      commands.notifyCommandChanged();
    });

    if (restorer) {
      restorer.add(sidebar, 'debugger-sidebar');
    }

    shell.add(sidebar, 'right');

    if (palette) {
      const category = trans.__('Debugger');
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

    if (debuggerSources) {
      const { model } = service;
      const readOnlyEditorFactory = new Debugger.ReadOnlyEditorFactory({
        editorServices
      });

      const onCurrentFrameChanged = (
        _: IDebugger.Model.ICallstack,
        frame: IDebugger.IStackFrame
      ): void => {
        debuggerSources
          .find({
            focus: true,
            kernel: service.session?.connection?.kernel?.name ?? '',
            path: service.session?.connection?.path ?? '',
            source: frame?.source?.path ?? ''
          })
          .forEach(editor => {
            requestAnimationFrame(() => {
              Debugger.EditorHandler.showCurrentLine(editor, frame.line);
            });
          });
      };

      const onCurrentSourceOpened = (
        _: IDebugger.Model.ISources | null,
        source: IDebugger.Source
      ): void => {
        if (!source) {
          return;
        }
        const { content, mimeType, path } = source;
        const results = debuggerSources.find({
          focus: true,
          kernel: service.session?.connection?.kernel?.name ?? '',
          path: service.session?.connection?.path ?? '',
          source: path
        });
        if (results.length > 0) {
          return;
        }
        const editorWrapper = readOnlyEditorFactory.createNewEditor({
          content,
          mimeType,
          path
        });
        const editor = editorWrapper.editor;
        const editorHandler = new Debugger.EditorHandler({
          debuggerService: service,
          editor,
          path
        });
        editorWrapper.disposed.connect(() => editorHandler.dispose());

        debuggerSources.open({
          label: PathExt.basename(path),
          caption: path,
          editorWrapper
        });

        const frame = service.model.callstack.frame;
        if (frame) {
          Debugger.EditorHandler.showCurrentLine(editor, frame.line);
        }
      };

      model.callstack.currentFrameChanged.connect(onCurrentFrameChanged);
      model.sources.currentSourceOpened.connect(onCurrentSourceOpened);
      model.breakpoints.clicked.connect(async (_, breakpoint) => {
        const path = breakpoint.source?.path;
        const source = await service.getSource({
          sourceReference: 0,
          path
        });
        onCurrentSourceOpened(null, source);
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
  variables,
  sidebar,
  main,
  sources,
  configuration
];

export default plugins;
