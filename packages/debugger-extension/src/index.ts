// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module debugger-extension
 */

import {
  ILabShell,
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import {
  Clipboard,
  Dialog,
  ICommandPalette,
  InputDialog,
  ISanitizer,
  ISessionContextDialogs,
  IThemeManager,
  MainAreaWidget,
  SessionContextDialogs,
  showDialog
} from '@jupyterlab/apputils';
import { IEditorServices } from '@jupyterlab/codeeditor';
import { ConsolePanel, IConsoleTracker } from '@jupyterlab/console';
import { PageConfig, PathExt } from '@jupyterlab/coreutils';
import {
  Debugger,
  DebuggerDisplayRegistry,
  IDebugger,
  IDebuggerConfig,
  IDebuggerDisplayRegistry,
  IDebuggerHandler,
  IDebuggerSidebar,
  IDebuggerSources,
  IDebuggerSourceViewer
} from '@jupyterlab/debugger';
import { DocumentWidget } from '@jupyterlab/docregistry';
import { FileEditor, IEditorTracker } from '@jupyterlab/fileeditor';
import {
  INotebookTracker,
  NotebookActions,
  NotebookPanel
} from '@jupyterlab/notebook';
import {
  standardRendererFactories as initialFactories,
  IRenderMime,
  IRenderMimeRegistry,
  RenderMimeRegistry
} from '@jupyterlab/rendermime';
import { Session } from '@jupyterlab/services';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import {
  ITranslator,
  NullTranslator,
  nullTranslator
} from '@jupyterlab/translation';
import { ICompletionProviderManager } from '@jupyterlab/completer';
import type { CommandRegistry } from '@lumino/commands';
import { WidgetTracker } from '@jupyterlab/apputils';
import { DebugConsoleCellExecutor } from './debug-console-executor';
import { DebuggerCompletionProvider } from './debugger-completion-provider';
import { isCodeCellModel } from '@jupyterlab/cells';

function notifyCommands(commands: CommandRegistry): void {
  Object.values(Debugger.CommandIDs).forEach(command => {
    if (commands.hasCommand(command)) {
      commands.notifyCommandChanged(command);
    }
  });
}

function updateState(commands: CommandRegistry, debug: IDebugger): void {
  const hasStoppedThreads = debug.hasStoppedThreads();
  if (hasStoppedThreads) {
    document.body.dataset.jpDebuggerStoppedThreads = 'true';
  } else {
    delete document.body.dataset.jpDebuggerStoppedThreads;
  }
  notifyCommands(commands);
}

/**
 * A plugin that provides visual debugging support for consoles.
 */
const consoles: JupyterFrontEndPlugin<void> = {
  // FIXME This should be in @jupyterlab/console-extension
  id: '@jupyterlab/debugger-extension:consoles',
  description: 'Add debugger capability to the consoles.',
  autoStart: true,
  requires: [IDebugger, IConsoleTracker],
  optional: [
    ILabShell,
    ISettingRegistry,
    ITranslator,
    IDebuggerDisplayRegistry
  ],
  activate: async (
    app: JupyterFrontEnd,
    debug: IDebugger,
    consoleTracker: IConsoleTracker,
    labShell: ILabShell | null,
    settingRegistry: ISettingRegistry | null,
    translator: ITranslator | NullTranslator,
    displayRegistry: IDebuggerDisplayRegistry | null
  ) => {
    if (settingRegistry) {
      const settings = await settingRegistry?.load(main.id);

      const updateOverlaySetting = (): void => {
        const showOverlay = settings.composite['showPausedOverlay'] ?? true;
        document.body.dataset.showPausedOverlay = showOverlay
          ? 'true'
          : 'false';
      };

      updateOverlaySetting();
      settings.changed.connect(updateOverlaySetting);
    }
    const handler = new Debugger.Handler({
      type: 'console',
      shell: app.shell,
      service: debug,
      translator: translator
    });

    const updateHandlerAndCommands = async (
      widget: ConsolePanel
    ): Promise<void> => {
      const { sessionContext } = widget;
      await sessionContext.ready;
      await handler.updateContext(widget, sessionContext);
      updateState(app.commands, debug);
    };

    if (labShell) {
      labShell.currentChanged.connect((_, update) => {
        const widget = update.newValue;
        if (widget instanceof ConsolePanel) {
          void updateHandlerAndCommands(widget);
        }
      });
    } else {
      consoleTracker.currentChanged.connect((_, consolePanel) => {
        if (consolePanel) {
          void updateHandlerAndCommands(consolePanel);
        }
      });
    }

    if (displayRegistry) {
      displayRegistry.register({
        canHandle(source: IDebugger.Source): boolean {
          return source.path?.includes('ipykernel_') ?? false;
        },
        getDisplayName(source: IDebugger.Source): string {
          let displayName = source.path ?? '';

          consoleTracker.forEach(panel => {
            for (const cell of panel.console.cells) {
              const model = cell.model;
              if (!isCodeCellModel(model)) {
                continue;
              }
              const code = model.sharedModel.getSource();
              const codeId = debug.getCodeId(code);

              if (codeId && codeId === source.path) {
                const exec = model.executionCount ?? null;
                const state = model.executionState ?? null;

                if (state === 'running') {
                  displayName = 'In [*]';
                } else if (exec === null) {
                  displayName = 'In [ ]';
                } else {
                  displayName = `In [${exec}]`;
                }
                return;
              }
            }
          });

          return displayName;
        }
      });
    }
  }
};

/**
 * A plugin that provides visual debugging support for file editors.
 */
const files: JupyterFrontEndPlugin<void> = {
  // FIXME This should be in @jupyterlab/fileeditor-extension
  id: '@jupyterlab/debugger-extension:files',
  description: 'Adds debugger capabilities to files.',
  autoStart: true,
  requires: [IDebugger, IEditorTracker],
  optional: [ILabShell, ISettingRegistry, ITranslator],
  activate: async (
    app: JupyterFrontEnd,
    debug: IDebugger,
    editorTracker: IEditorTracker,
    labShell: ILabShell | null,
    settingRegistry: ISettingRegistry | null,
    translator: ITranslator | NullTranslator
  ) => {
    if (settingRegistry) {
      const settings = await settingRegistry?.load(main.id);

      const updateOverlaySetting = (): void => {
        const showOverlay = settings.composite['showPausedOverlay'] ?? true;
        document.body.dataset.showPausedOverlay = showOverlay
          ? 'true'
          : 'false';
      };

      updateOverlaySetting();
      settings.changed.connect(updateOverlaySetting);
    }
    const handler = new Debugger.Handler({
      type: 'file',
      shell: app.shell,
      service: debug,
      translator: translator
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
        updateState(app.commands, debug);
      } catch {
        return;
      }
    };

    if (labShell) {
      labShell.currentChanged.connect((_, update) => {
        const widget = update.newValue;
        if (widget instanceof DocumentWidget) {
          const { content } = widget;
          if (content instanceof FileEditor) {
            void updateHandlerAndCommands(widget);
          }
        }
      });
    } else {
      editorTracker.currentChanged.connect((_, documentWidget) => {
        if (documentWidget) {
          void updateHandlerAndCommands(
            documentWidget as unknown as DocumentWidget
          );
        }
      });
    }
  }
};

/**
 * A plugin that provides visual debugging support for notebooks.
 */
const notebooks: JupyterFrontEndPlugin<IDebugger.IHandler> = {
  // FIXME This should be in @jupyterlab/notebook-extension
  id: '@jupyterlab/debugger-extension:notebooks',
  description:
    'Adds debugger capability to notebooks and provides the debugger notebook handler.',
  autoStart: true,
  requires: [IDebugger, INotebookTracker],
  optional: [
    ILabShell,
    ICommandPalette,
    ISessionContextDialogs,
    ISettingRegistry,
    ITranslator,
    IDebuggerDisplayRegistry
  ],
  provides: IDebuggerHandler,
  activate: async (
    app: JupyterFrontEnd,
    service: IDebugger,
    notebookTracker: INotebookTracker,
    labShell: ILabShell | null,
    palette: ICommandPalette | null,
    sessionDialogs_: ISessionContextDialogs | null,
    settingRegistry: ISettingRegistry | null,
    translator_: ITranslator | null,
    displayRegistry: IDebuggerDisplayRegistry | null
  ): Promise<Debugger.Handler> => {
    const translator = translator_ ?? nullTranslator;
    if (settingRegistry) {
      const settings = await settingRegistry?.load(main.id);

      const updateOverlaySetting = (): void => {
        const showOverlay = settings.composite['showPausedOverlay'] ?? true;
        document.body.dataset.showPausedOverlay = showOverlay
          ? 'true'
          : 'false';
      };

      updateOverlaySetting();
      settings.changed.connect(updateOverlaySetting);
    }
    const sessionDialogs =
      sessionDialogs_ ?? new SessionContextDialogs({ translator });
    const handler = new Debugger.Handler({
      type: 'notebook',
      shell: app.shell,
      service,
      translator: translator
    });

    const trans = translator.load('jupyterlab');
    app.commands.addCommand(Debugger.CommandIDs.restartDebug, {
      label: trans.__('Restart Kernel and Debug…'),
      caption: trans.__('Restart Kernel and Debug…'),
      isEnabled: () => service.isStarted,
      describedBy: {
        args: {
          type: 'object',
          properties: {}
        }
      },
      execute: async () => {
        const state = service.getDebuggerState();

        const widget = notebookTracker.currentWidget;
        if (!widget) {
          return;
        }

        const { content, sessionContext } = widget;
        const restarted = await sessionDialogs.restart(sessionContext, {
          onBeforeRestart: async (): Promise<void> => {
            await service.stop();
          }
        });
        if (!restarted) {
          return;
        }
        await service.start();
        await service.restoreDebuggerState(state);
        await handler.updateWidget(widget, sessionContext.session);
        await NotebookActions.runAll(
          content,
          sessionContext,
          sessionDialogs,
          translator
        );
      }
    });

    const updateHandlerAndCommands = async (
      widget: NotebookPanel
    ): Promise<void> => {
      if (widget) {
        const { sessionContext } = widget;
        await sessionContext.ready;
        await handler.updateContext(widget, sessionContext);
        await handler.updateWidget(widget, sessionContext.session);
      }
      updateState(app.commands, service);
    };

    if (labShell) {
      labShell.currentChanged.connect((_, update) => {
        const widget = update.newValue;
        if (widget instanceof NotebookPanel) {
          void updateHandlerAndCommands(widget);
        }
      });
    } else {
      notebookTracker.currentChanged.connect((_, notebookPanel) => {
        if (notebookPanel) {
          void updateHandlerAndCommands(notebookPanel);
        }
      });
    }

    if (palette) {
      palette.addItem({
        category: 'Notebook Operations',
        command: Debugger.CommandIDs.restartDebug
      });
    }

    if (displayRegistry) {
      displayRegistry.register({
        canHandle(source: IDebugger.Source): boolean {
          return source.path?.includes('ipykernel_') ?? false;
        },
        getDisplayName(source: IDebugger.Source): string {
          let displayName = source.path ?? '';

          notebookTracker.forEach(panel => {
            for (const cell of panel.content.widgets) {
              const model = cell.model;
              if (!isCodeCellModel(model)) {
                continue;
              }
              const code = model.sharedModel.getSource();
              const codeId = service.getCodeId(code);

              if (codeId === source.path) {
                const exec = model.executionCount;
                if (model.executionState === 'running') {
                  displayName = 'Cell [*]';
                } else {
                  displayName = exec == null ? 'Cell [ ]' : `Cell [${exec}]`;
                }
                // Stop iteration once we found the matching cell
                return;
              }
            }
          });

          return displayName;
        }
      });
    }

    return handler;
  }
};

/**
 * A plugin that provides a debugger service.
 */
const service: JupyterFrontEndPlugin<IDebugger> = {
  id: '@jupyterlab/debugger-extension:service',
  description: 'Provides the debugger service.',
  autoStart: true,
  provides: IDebugger,
  requires: [IDebuggerConfig],
  optional: [
    IDebuggerDisplayRegistry,
    IDebuggerSources,
    ITranslator,
    IEditorServices
  ],
  activate: (
    app: JupyterFrontEnd,
    config: IDebugger.IConfig,
    displayRegistry: IDebuggerDisplayRegistry | null,
    debuggerSources: IDebugger.ISources | null,
    translator: ITranslator | null,
    editorServices: IEditorServices | null
  ) =>
    new Debugger.Service({
      config,
      displayRegistry,
      debuggerSources,
      specsManager: app.serviceManager.kernelspecs,
      translator,
      mimeTypeService: editorServices?.mimeTypeService ?? null
    })
};

/**
 * A plugin providing the debugger display registry.
 */
const displayRegistry: JupyterFrontEndPlugin<IDebuggerDisplayRegistry> = {
  id: '@jupyterlab/debugger-extension:display-registry',
  description:
    'Provides the debugger display registry for cell/file display names.',
  provides: IDebuggerDisplayRegistry,
  autoStart: true,
  activate: () => new DebuggerDisplayRegistry()
};

/**
 * A plugin that provides a configuration with hash method.
 */
const configuration: JupyterFrontEndPlugin<IDebugger.IConfig> = {
  id: '@jupyterlab/debugger-extension:config',
  description: 'Provides the debugger configuration',
  provides: IDebuggerConfig,
  autoStart: true,
  activate: () => new Debugger.Config()
};

/**
 * A plugin that provides source/editor functionality for debugging.
 */
const sources: JupyterFrontEndPlugin<IDebugger.ISources> = {
  id: '@jupyterlab/debugger-extension:sources',
  description: 'Provides the source feature for debugging',
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

/**
 * A plugin to open detailed views for variables.
 */
const variables: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/debugger-extension:variables',
  description:
    'Adds variables renderer and inspection in the debugger variable panel.',
  autoStart: true,
  requires: [IDebugger, IDebuggerHandler, ITranslator],
  optional: [IThemeManager, IRenderMimeRegistry],
  activate: (
    app: JupyterFrontEnd,
    service: IDebugger,
    handler: Debugger.Handler,
    translator: ITranslator,
    themeManager: IThemeManager | null,
    rendermime: IRenderMimeRegistry | null
  ) => {
    const trans = translator.load('jupyterlab');
    const { commands, shell } = app;
    const tracker = new WidgetTracker<MainAreaWidget<Debugger.VariablesGrid>>({
      namespace: 'debugger/inspect-variable'
    });
    const trackerMime = new WidgetTracker<Debugger.VariableRenderer>({
      namespace: 'debugger/render-variable'
    });
    const CommandIDs = Debugger.CommandIDs;

    // Add commands
    commands.addCommand(CommandIDs.inspectVariable, {
      label: trans.__('Inspect Variable'),
      caption: trans.__('Inspect Variable'),
      isEnabled: args =>
        !!service.session?.isStarted &&
        Number(
          args.variableReference ??
            service.model.variables.selectedVariable?.variablesReference ??
            0
        ) > 0,
      describedBy: {
        args: {
          type: 'object',
          properties: {
            variableReference: {
              type: 'number',
              description: trans.__('The variable reference to inspect')
            },
            name: {
              type: 'string',
              description: trans.__('The name of the variable to inspect')
            }
          }
        }
      },
      execute: async args => {
        let { variableReference, name } = args as {
          variableReference?: number;
          name?: string;
        };

        if (!variableReference) {
          variableReference =
            service.model.variables.selectedVariable?.variablesReference;
        }
        if (!name) {
          name = service.model.variables.selectedVariable?.name;
        }

        const id = `jp-debugger-variable-${name}`;
        if (
          !name ||
          !variableReference ||
          tracker.find(widget => widget.id === id)
        ) {
          return;
        }

        const variables = await service.inspectVariable(
          variableReference as number
        );
        if (!variables || variables.length === 0) {
          return;
        }

        const model = service.model.variables;
        const widget = new MainAreaWidget<Debugger.VariablesGrid>({
          content: new Debugger.VariablesGrid({
            model,
            commands,
            scopes: [{ name, variables }],
            themeManager
          })
        });
        widget.addClass('jp-DebuggerVariables');
        widget.id = id;
        widget.title.icon = Debugger.Icons.variableIcon;
        widget.title.label = `${service.session?.connection?.name} - ${name}`;
        void tracker.add(widget);
        const disposeWidget = () => {
          widget.dispose();
          model.changed.disconnect(disposeWidget);
        };
        model.changed.connect(disposeWidget);
        shell.add(widget, 'main', {
          mode: tracker.currentWidget ? 'split-right' : 'split-bottom',
          activate: false,
          type: 'Debugger Variables'
        });
      }
    });

    commands.addCommand(CommandIDs.renderMimeVariable, {
      label: trans.__('Render Variable'),
      caption: trans.__('Render variable according to its mime type'),
      isEnabled: () => !!service.session?.isStarted,
      isVisible: () =>
        service.model.hasRichVariableRendering &&
        (rendermime !== null || handler.activeWidget instanceof NotebookPanel),
      describedBy: {
        args: {
          type: 'object',
          properties: {
            frameId: {
              type: 'number',
              description: trans.__('The frame ID')
            },
            name: {
              type: 'string',
              description: trans.__('The name of the variable to render')
            }
          }
        }
      },
      execute: args => {
        let { name, frameId } = args as {
          frameId?: number;
          name?: string;
        };

        if (!name) {
          name = service.model.variables.selectedVariable?.name;
        }
        if (!frameId) {
          frameId = service.model.callstack.frame?.id;
        }

        const activeWidget = handler.activeWidget;
        let activeRendermime =
          activeWidget instanceof NotebookPanel
            ? activeWidget.content.rendermime
            : rendermime;

        if (!activeRendermime) {
          return;
        }

        const id = `jp-debugger-variable-mime-${name}-${service.session?.connection?.path.replace(
          '/',
          '-'
        )}`;
        if (
          !name || // Name is mandatory
          trackerMime.find(widget => widget.id === id) || // Widget already exists
          (!frameId && service.hasStoppedThreads()) // frame id missing on breakpoint
        ) {
          return;
        }

        const variablesModel = service.model.variables;

        const widget = new Debugger.VariableRenderer({
          dataLoader: () => service.inspectRichVariable(name!, frameId),
          rendermime: activeRendermime,
          translator
        });
        widget.addClass('jp-DebuggerRichVariable');
        widget.id = id;
        widget.title.icon = Debugger.Icons.variableIcon;
        widget.title.label = `${name} - ${service.session?.connection?.name}`;
        widget.title.caption = `${name} - ${service.session?.connection?.path}`;
        void trackerMime.add(widget);
        const disposeWidget = () => {
          widget.dispose();
          variablesModel.changed.disconnect(refreshWidget);
          activeWidget?.disposed.disconnect(disposeWidget);
        };
        const refreshWidget = () => {
          // Refresh the widget only if the active element is the same.
          if (handler.activeWidget === activeWidget) {
            void widget.refresh();
          }
        };
        widget.disposed.connect(disposeWidget);
        variablesModel.changed.connect(refreshWidget);
        activeWidget?.disposed.connect(disposeWidget);

        shell.add(widget, 'main', {
          mode: trackerMime.currentWidget ? 'split-right' : 'split-bottom',
          activate: false,
          type: 'Debugger Variables'
        });
      }
    });

    commands.addCommand(CommandIDs.copyToClipboard, {
      label: trans.__('Copy to Clipboard'),
      caption: trans.__('Copy text representation of the value to clipboard'),
      isEnabled: () => {
        return (
          !!service.session?.isStarted &&
          !!service.model.variables.selectedVariable?.value
        );
      },
      isVisible: () => handler.activeWidget instanceof NotebookPanel,
      describedBy: {
        args: {
          type: 'object',
          properties: {}
        }
      },
      execute: async () => {
        const value = service.model.variables.selectedVariable!.value;
        if (value) {
          Clipboard.copyToSystem(value);
        }
      }
    });

    commands.addCommand(CommandIDs.copyToGlobals, {
      label: trans.__('Copy Variable to Globals'),
      caption: trans.__('Copy variable to globals scope'),
      isEnabled: () => !!service.session?.isStarted,
      isVisible: () =>
        handler.activeWidget instanceof NotebookPanel &&
        service.model.supportCopyToGlobals,
      describedBy: {
        args: {
          type: 'object',
          properties: {}
        }
      },
      execute: async args => {
        const name = service.model.variables.selectedVariable!.name;
        await service.copyToGlobals(name);
      }
    });
  }
};

/**
 * Debugger sidebar provider plugin.
 */
const sidebar: JupyterFrontEndPlugin<IDebugger.ISidebar> = {
  id: '@jupyterlab/debugger-extension:sidebar',
  description: 'Provides the debugger sidebar.',
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
      stepOut: CommandIDs.stepOut,
      evaluate: CommandIDs.evaluate
    };

    const breakpointsCommands = {
      registry: commands,
      pauseOnExceptions: CommandIDs.pauseOnExceptions
    };

    const sidebar = new Debugger.Sidebar({
      service,
      callstackCommands,
      breakpointsCommands,
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

        service.model.kernelSources.hideNativeSources = setting.get(
          'hideNativeFilteredKernelSources'
        ).composite as boolean;

        const kernelSourcesFilter = setting.get('defaultKernelSourcesFilter')
          .composite as string;
        sidebar.kernelSources.filter = kernelSourcesFilter;
      };
      updateSettings();
      setting.changed.connect(updateSettings);
      service.sessionChanged.connect(updateSettings);
    }

    return sidebar;
  }
};

/**
 * The source viewer UI plugin.
 */
const sourceViewer: JupyterFrontEndPlugin<IDebugger.ISourceViewer> = {
  id: '@jupyterlab/debugger-extension:source-viewer',
  description: 'Initialize the debugger sources viewer.',
  requires: [IDebugger, IEditorServices, IDebuggerSources, ITranslator],
  provides: IDebuggerSourceViewer,
  autoStart: true,
  activate: async (
    app: JupyterFrontEnd,
    service: IDebugger,
    editorServices: IEditorServices,
    debuggerSources: IDebugger.ISources,
    translator: ITranslator
  ): Promise<IDebugger.ISourceViewer> => {
    const readOnlyEditorFactory = new Debugger.ReadOnlyEditorFactory({
      editorServices
    });
    const { model } = service;

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
            void editor.reveal().then(() => {
              const edit = editor.get();
              if (edit) {
                Debugger.EditorHandler.showCurrentLine(edit, frame.line);
              }
            });
          });
        });
    };
    model.callstack.currentFrameChanged.connect(onCurrentFrameChanged);

    const openSource = (
      source: IDebugger.Source,
      breakpoint?: IDebugger.IBreakpoint
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
        if (breakpoint && typeof breakpoint.line !== 'undefined') {
          results.forEach(editor => {
            void editor.reveal().then(() => {
              editor.get()?.revealPosition({
                line: (breakpoint.line as number) - 1,
                column: breakpoint.column || 0
              });
            });
          });
        }
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
        editorReady: () => Promise.resolve(editor),
        getEditor: () => editor,
        path,
        src: editor.model.sharedModel
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

    const trans = translator.load('jupyterlab');

    app.commands.addCommand(Debugger.CommandIDs.openSource, {
      label: trans.__('Open Source'),
      caption: trans.__('Open Source'),
      isEnabled: () => !!sourceViewer,
      execute: async args => {
        const path = (args.path as string) || '';
        if (!path) {
          throw Error('Path to open is needed');
        }
        if (!service.isStarted) {
          const choice = await showDialog({
            title: trans.__('Start debugger?'),
            body: trans.__(
              'The debugger service is needed to open the source %1',
              path
            ),
            buttons: [
              Dialog.cancelButton({ label: trans.__('Cancel') }),
              Dialog.okButton({ label: trans.__('Start debugger') })
            ]
          });
          if (choice.button.accept) {
            await service.start();
          } else {
            return;
          }
        }
        const source = await service.getSource({
          path
        });
        return openSource(source);
      },
      describedBy: {
        args: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: trans.__('Path to the source file to open')
            }
          }
        }
      }
    });

    return Object.freeze({
      open: openSource
    });
  }
};

/**
 * The main debugger UI plugin.
 */
const main: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/debugger-extension:main',
  description: 'Initialize the debugger user interface.',
  requires: [
    IDebugger,
    IDebuggerSidebar,
    IEditorServices,
    ITranslator,
    ConsolePanel.IContentFactory,
    IConsoleTracker
  ],
  optional: [
    ICommandPalette,
    IDebuggerSourceViewer,
    ILabShell,
    ILayoutRestorer,
    ISettingRegistry
  ],
  autoStart: true,
  activate: async (
    app: JupyterFrontEnd,
    service: IDebugger,
    sidebar: IDebugger.ISidebar,
    editorServices: IEditorServices,
    translator: ITranslator,
    consolePanelContentFactory: ConsolePanel.IContentFactory,
    consoleTracker: IConsoleTracker,
    palette: ICommandPalette | null,
    sourceViewer: IDebugger.ISourceViewer | null,
    labShell: ILabShell | null,
    restorer: ILayoutRestorer | null,
    settingRegistry: ISettingRegistry | null
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
      label: () => {
        return service.hasStoppedThreads()
          ? trans.__('Continue')
          : trans.__('Pause');
      },
      caption: () => {
        return service.hasStoppedThreads()
          ? trans.__('Continue')
          : trans.__('Pause');
      },
      icon: () => {
        return service.hasStoppedThreads()
          ? Debugger.Icons.continueIcon
          : Debugger.Icons.pauseIcon;
      },
      isEnabled: () => service.session?.isStarted ?? false,
      execute: async () => {
        if (service.hasStoppedThreads()) {
          await service.continue();
        } else {
          await service.pause();
        }
        commands.notifyCommandChanged(CommandIDs.debugContinue);
      },
      describedBy: {
        args: {
          type: 'object',
          properties: {}
        }
      }
    });

    commands.addCommand(CommandIDs.terminate, {
      label: trans.__('Terminate'),
      caption: trans.__('Terminate'),
      icon: Debugger.Icons.terminateIcon,
      isEnabled: () => service.hasStoppedThreads(),
      execute: async () => {
        await service.restart();
        updateState(app.commands, service);
      },
      describedBy: {
        args: {
          type: 'object',
          properties: {}
        }
      }
    });

    commands.addCommand(CommandIDs.next, {
      label: trans.__('Next'),
      caption: trans.__('Next'),
      icon: Debugger.Icons.stepOverIcon,
      isEnabled: () => service.hasStoppedThreads(),
      execute: async () => {
        await service.next();
      },
      describedBy: {
        args: {
          type: 'object',
          properties: {}
        }
      }
    });

    commands.addCommand(CommandIDs.stepIn, {
      label: trans.__('Step In'),
      caption: trans.__('Step In'),
      icon: Debugger.Icons.stepIntoIcon,
      isEnabled: () => service.hasStoppedThreads(),
      execute: async () => {
        await service.stepIn();
      },
      describedBy: {
        args: {
          type: 'object',
          properties: {}
        }
      }
    });

    commands.addCommand(CommandIDs.stepOut, {
      label: trans.__('Step Out'),
      caption: trans.__('Step Out'),
      icon: Debugger.Icons.stepOutIcon,
      isEnabled: () => service.hasStoppedThreads(),
      execute: async () => {
        await service.stepOut();
      },
      describedBy: {
        args: {
          type: 'object',
          properties: {}
        }
      }
    });

    commands.addCommand(CommandIDs.pauseOnExceptions, {
      label: args => (args.filter as string) || 'Breakpoints on exception',
      caption: args => (args.description as string) ?? '',
      isToggled: args =>
        service.session?.isPausingOnException(args.filter as string) || false,
      isEnabled: () => service.pauseOnExceptionsIsValid(),
      execute: async args => {
        if (args?.filter) {
          let filter = args.filter as string;
          await service.pauseOnExceptionsFilter(filter as string);
        } else {
          let items: string[] = [];
          service.session?.exceptionBreakpointFilters?.forEach(
            availableFilter => {
              items.push(availableFilter.filter);
            }
          );
          const result = await InputDialog.getMultipleItems({
            title: trans.__('Select a filter for breakpoints on exception'),
            items: items,
            defaults: service.session?.currentExceptionFilters || []
          });

          let filters = result.button.accept ? result.value : null;
          if (filters !== null) {
            await service.pauseOnExceptions(filters);
          }
        }
      },
      describedBy: {
        args: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: trans.__('Exception filter to pause on')
            },
            description: {
              type: 'string',
              description: trans.__('Description of the exception filter')
            }
          }
        }
      }
    });

    let autoCollapseSidebar = false;

    if (settingRegistry) {
      const setting = await settingRegistry.load(main.id);
      const updateSettings = (): void => {
        autoCollapseSidebar = setting.get('autoCollapseDebuggerSidebar')
          .composite as boolean;
      };
      updateSettings();
      setting.changed.connect(updateSettings);
    }

    service.eventMessage.connect((_, event): void => {
      updateState(app.commands, service);
      if (labShell && event.event === 'initialized') {
        labShell.activateById(sidebar.id);
      } else if (
        labShell &&
        sidebar.isVisible &&
        event.event === 'terminated' &&
        autoCollapseSidebar
      ) {
        labShell.collapseRight();
      }
    });

    service.sessionChanged.connect(_ => {
      updateState(app.commands, service);
    });

    if (restorer) {
      restorer.add(sidebar, 'debugger-sidebar');
    }

    sidebar.node.setAttribute('role', 'region');
    sidebar.node.setAttribute('aria-label', trans.__('Debugger section'));

    sidebar.title.caption = trans.__('Debugger');

    shell.add(sidebar, 'right', { type: 'Debugger' });

    commands.addCommand(CommandIDs.showPanel, {
      label: trans.__('Debugger Panel'),
      execute: () => {
        shell.activateById(sidebar.id);
      },
      describedBy: {
        args: {
          type: 'object',
          properties: {}
        }
      }
    });

    if (palette) {
      const category = trans.__('Debugger');
      [
        CommandIDs.debugContinue,
        CommandIDs.terminate,
        CommandIDs.next,
        CommandIDs.stepIn,
        CommandIDs.stepOut,
        CommandIDs.evaluate,
        CommandIDs.pauseOnExceptions
      ].forEach(command => {
        palette.addItem({ command, category });
      });
    }

    if (sourceViewer) {
      const { model } = service;
      const onKernelSourceOpened = (
        _: IDebugger.Model.IKernelSources | null,
        source: IDebugger.Source,
        breakpoint?: IDebugger.IBreakpoint
      ): void => {
        if (!source) {
          return;
        }
        sourceViewer.open(source, breakpoint);
      };

      model.sources.currentSourceOpened.connect(
        (_: IDebugger.Model.ISources | null, source: IDebugger.Source) => {
          sourceViewer.open(source);
        }
      );
      model.kernelSources.kernelSourceOpened.connect(onKernelSourceOpened);
      model.breakpoints.clicked.connect(async (_, breakpoint) => {
        const path = breakpoint.source?.path;
        const source = await service.getSource({
          sourceReference: 0,
          path
        });
        sourceViewer.open(source, breakpoint);
      });
    }
  }
};

/**
 * A plugin that provides debugger-based completions.
 */
const debuggerCompletions: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/debugger-extension:completions',
  description: 'Provides debugger-based completions.',
  autoStart: true,
  requires: [IDebugger, ICompletionProviderManager],
  optional: [ITranslator],
  activate: (
    app: JupyterFrontEnd,
    debuggerService: IDebugger,
    completionManager: ICompletionProviderManager,
    translator: ITranslator | null
  ): void => {
    // Create and register the debugger completion provider
    const provider = new DebuggerCompletionProvider({
      debuggerService: debuggerService,
      translator: translator || nullTranslator
    });

    // Register the provider with the completion manager
    completionManager.registerProvider(provider);
  }
};

/**
 * A plugin that provides the debug console functionality.
 */
const debugConsole: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/debugger-extension:debug-console',
  description: 'Debugger console to enable evaluation in debugger context.',
  autoStart: true,
  requires: [
    IDebugger,
    ConsolePanel.IContentFactory,
    IEditorServices,
    ICompletionProviderManager,
    ISanitizer,
    ITranslator
  ],
  optional: [ILabShell],
  activate: (
    app: JupyterFrontEnd,
    service: IDebugger,
    consolePanelContentFactory: ConsolePanel.IContentFactory,
    editorServices: IEditorServices,
    manager: ICompletionProviderManager,
    sanitizer: IRenderMime.ISanitizer,
    translator: ITranslator,
    labShell: ILabShell | null
  ) => {
    const CommandIDs = Debugger.CommandIDs;
    const trans = translator.load('jupyterlab');

    // Create our own tracker for debug consoles
    const debugConsoleTracker = new WidgetTracker<ConsolePanel>({
      namespace: 'debugger-debug-console'
    });

    // Global debug console widget variable for toggling
    let debugConsoleWidget: ConsolePanel | null = null;

    // Create the console
    const createDebugConsole = async () => {
      const rendermime = new RenderMimeRegistry({ initialFactories });
      const debugExecutor = new DebugConsoleCellExecutor({
        debuggerService: service,
        trans
      });

      debugConsoleWidget = new ConsolePanel({
        manager: app.serviceManager,
        name: trans.__('Debug Console'),
        contentFactory: consolePanelContentFactory,
        rendermime,
        executor: debugExecutor,
        mimeTypeService: editorServices.mimeTypeService,
        kernelPreference: { shouldStart: false, canStart: false }
      });

      debugConsoleWidget.title.label = trans.__('Debug Console');
      debugConsoleWidget.title.icon = Debugger.Icons.evaluateIcon;

      // Add a specific class to distinguish debug console from regular consoles
      debugConsoleWidget.addClass('jp-DebugConsole');
      debugConsoleWidget.console.addClass('jp-DebugConsole-widget');

      // Close console when debugger is terminated
      service.eventMessage.connect((_, event): void => {
        if (labShell && event.event === 'terminated') {
          debugConsoleWidget?.dispose();
        }
      });

      const notifyCommands = () => {
        app.commands.notifyCommandChanged(CommandIDs.evaluate);
        app.commands.notifyCommandChanged(CommandIDs.executeConsole);
        app.commands.notifyCommandChanged(CommandIDs.invokeConsole);
        app.commands.notifyCommandChanged(CommandIDs.selectConsole);
      };

      debugConsoleWidget.disposed.connect(() => {
        debugConsoleWidget = null;
      });

      app.shell.add(debugConsoleWidget, 'main', {
        mode: 'split-bottom',
        activate: true,
        type: 'Debugger Console'
      });

      void debugConsoleTracker.add(debugConsoleWidget);
      app.shell.activateById(debugConsoleWidget.id);

      await updateCompleter(undefined, debugConsoleWidget);
      debugConsoleWidget?.update();

      notifyCommands();
    };

    // Set up completer
    const updateCompleter = async (
      _: WidgetTracker<ConsolePanel> | undefined,
      consolePanel: ConsolePanel
    ) => {
      const completerContext = {
        editor: consolePanel.console.promptCell?.editor ?? null,
        session: consolePanel.console.sessionContext.session,
        widget: consolePanel
      };
      await manager.updateCompleter(completerContext);
      consolePanel.console.promptCellCreated.connect((codeConsole, cell) => {
        const newContext = {
          editor: cell.editor,
          session: codeConsole.sessionContext.session,
          widget: consolePanel,
          sanitizer: sanitizer
        };
        manager.updateCompleter(newContext).catch(console.error);
      });
      consolePanel.console.sessionContext.sessionChanged.connect(() => {
        const newContext = {
          editor: consolePanel.console.promptCell?.editor ?? null,
          session: consolePanel.console.sessionContext.session,
          widget: consolePanel,
          sanitizer: sanitizer
        };
        manager.updateCompleter(newContext).catch(console.error);
      });
    };

    debugConsoleTracker.widgetAdded.connect(updateCompleter);

    manager.activeProvidersChanged.connect(() => {
      debugConsoleTracker.forEach(consoleWidget => {
        updateCompleter(undefined, consoleWidget).catch(e => console.error(e));
      });
    });

    // Add commands
    app.commands.addCommand(CommandIDs.invokeConsole, {
      label: trans.__('Display the tab completion widget.'),
      execute: () => {
        const id =
          debugConsoleTracker.currentWidget &&
          debugConsoleTracker.currentWidget.id;

        if (id) {
          return manager.invoke(id);
        }
      },
      describedBy: {
        args: {
          type: 'object',
          properties: {}
        }
      }
    });

    app.commands.addCommand(CommandIDs.selectConsole, {
      label: trans.__('Select the completion suggestion.'),
      execute: () => {
        const id =
          debugConsoleTracker.currentWidget &&
          debugConsoleTracker.currentWidget.id;

        if (id) {
          return manager.select(id);
        }
      },
      describedBy: {
        args: {
          type: 'object',
          properties: {}
        }
      }
    });

    // Add the debugger console execute command
    app.commands.addCommand(CommandIDs.executeConsole, {
      label: trans.__('Execute the current line in debug console.'),
      execute: async () => {
        const currentWidget = debugConsoleTracker.currentWidget;
        if (currentWidget && currentWidget.console) {
          await currentWidget.console.execute(true);
          // Ensure focus stays on the console prompt after execution
          const promptCell = currentWidget.console.promptCell;
          if (promptCell && promptCell.editor) {
            promptCell.editor.focus();
          }
        }
      },
      describedBy: {
        args: {
          type: 'object',
          properties: {}
        }
      }
    });

    app.commands.addCommand(CommandIDs.evaluate, {
      label: trans.__('Evaluate Code'),
      caption: trans.__('Evaluate Code'),
      icon: Debugger.Icons.evaluateIcon,
      isEnabled: () => !!service.session?.isStarted,
      execute: async () => {
        if (debugConsoleWidget) {
          debugConsoleWidget.dispose();
        } else {
          void createDebugConsole();
        }
      },
      isToggled: () => {
        return debugConsoleWidget !== null;
      },
      describedBy: {
        args: {
          type: 'object',
          properties: {}
        }
      }
    });

    // Add the keybindings
    app.commands.addKeyBinding({
      command: CommandIDs.selectConsole,
      keys: ['Enter'],
      selector:
        '.jp-ConsolePanel.jp-DebugConsole .jp-DebugConsole-widget .jp-mod-completer-active'
    });

    app.commands.addKeyBinding({
      command: CommandIDs.invokeConsole,
      keys: ['Tab'],
      selector:
        '.jp-ConsolePanel.jp-DebugConsole .jp-DebugConsole-widget .jp-CodeConsole-promptCell .jp-mod-completer-enabled:not(.jp-mod-at-line-beginning)'
    });

    app.commands.addKeyBinding({
      command: CommandIDs.executeConsole,
      keys: ['Shift Enter'],
      selector:
        '.jp-ConsolePanel.jp-DebugConsole .jp-DebugConsole-widget .jp-CodeConsole-promptCell'
    });
  }
};

/**
 * Export the plugins as default.
 */
const plugins: JupyterFrontEndPlugin<any>[] = [
  service,
  displayRegistry,
  consoles,
  files,
  notebooks,
  variables,
  sidebar,
  main,
  sources,
  sourceViewer,
  configuration,
  debuggerCompletions,
  debugConsole
];

export default plugins;
