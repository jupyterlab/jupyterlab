// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module console-extension
 */

import {
  ILabStatus,
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import {
  Dialog,
  ICommandPalette,
  IKernelStatusModel,
  ISanitizer,
  ISessionContext,
  ISessionContextDialogs,
  Sanitizer,
  SessionContextDialogs,
  showDialog,
  WidgetTracker
} from '@jupyterlab/apputils';
import {
  CodeEditor,
  IEditorServices,
  IPositionModel
} from '@jupyterlab/codeeditor';
import { ICompletionProviderManager } from '@jupyterlab/completer';
import { ConsolePanel, IConsoleTracker } from '@jupyterlab/console';
import { IDefaultFileBrowser } from '@jupyterlab/filebrowser';
import { ILauncher } from '@jupyterlab/launcher';
import { IMainMenu } from '@jupyterlab/mainmenu';
import { IRenderMime, IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { consoleIcon, IFormRendererRegistry } from '@jupyterlab/ui-components';
import { find } from '@lumino/algorithm';
import {
  JSONExt,
  JSONObject,
  ReadonlyJSONValue,
  ReadonlyPartialJSONObject,
  UUID
} from '@lumino/coreutils';
import { DisposableSet } from '@lumino/disposable';
import { DockLayout, Widget } from '@lumino/widgets';
import foreign from './foreign';

/**
 * The command IDs used by the console plugin.
 */
namespace CommandIDs {
  export const autoClosingBrackets = 'console:toggle-autoclosing-brackets';

  export const create = 'console:create';

  export const clear = 'console:clear';

  export const runUnforced = 'console:run-unforced';

  export const runForced = 'console:run-forced';

  export const linebreak = 'console:linebreak';

  export const interrupt = 'console:interrupt-kernel';

  export const restart = 'console:restart-kernel';

  export const closeAndShutdown = 'console:close-and-shutdown';

  export const open = 'console:open';

  export const inject = 'console:inject';

  export const changeKernel = 'console:change-kernel';

  export const getKernel = 'console:get-kernel';

  export const enterToExecute = 'console:enter-to-execute';

  export const shiftEnterToExecute = 'console:shift-enter-to-execute';

  export const interactionMode = 'console:interaction-mode';

  export const replaceSelection = 'console:replace-selection';

  export const shutdown = 'console:shutdown';

  export const invokeCompleter = 'completer:invoke-console';

  export const selectCompleter = 'completer:select-console';
}

/**
 * The console widget tracker provider.
 */
const tracker: JupyterFrontEndPlugin<IConsoleTracker> = {
  id: '@jupyterlab/console-extension:tracker',
  description: 'Provides the console widget tracker.',
  provides: IConsoleTracker,
  requires: [
    ConsolePanel.IContentFactory,
    IEditorServices,
    IRenderMimeRegistry,
    ISettingRegistry
  ],
  optional: [
    ILayoutRestorer,
    IDefaultFileBrowser,
    IMainMenu,
    ICommandPalette,
    ILauncher,
    ILabStatus,
    ISessionContextDialogs,
    IFormRendererRegistry,
    ITranslator
  ],
  activate: activateConsole,
  autoStart: true
};

/**
 * The console widget content factory.
 */
const factory: JupyterFrontEndPlugin<ConsolePanel.IContentFactory> = {
  id: '@jupyterlab/console-extension:factory',
  description: 'Provides the console widget content factory.',
  provides: ConsolePanel.IContentFactory,
  requires: [IEditorServices],
  autoStart: true,
  activate: (app: JupyterFrontEnd, editorServices: IEditorServices) => {
    const editorFactory = editorServices.factoryService.newInlineEditor;
    return new ConsolePanel.ContentFactory({ editorFactory });
  }
};

/**
 * Kernel status indicator.
 */
const kernelStatus: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/console-extension:kernel-status',
  description: 'Adds the console to the kernel status indicator model.',
  autoStart: true,
  requires: [IConsoleTracker, IKernelStatusModel],
  activate: (
    app: JupyterFrontEnd,
    tracker: IConsoleTracker,
    kernelStatus: IKernelStatusModel
  ) => {
    const provider = (widget: Widget | null) => {
      let session: ISessionContext | null = null;

      if (widget && tracker.has(widget)) {
        return (widget as ConsolePanel).sessionContext;
      }

      return session;
    };

    kernelStatus.addSessionProvider(provider);
  }
};

/**
 * Cursor position.
 */
const lineColStatus: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/console-extension:cursor-position',
  description: 'Adds the console to the code editor cursor position model.',
  autoStart: true,
  requires: [IConsoleTracker, IPositionModel],
  activate: (
    app: JupyterFrontEnd,
    tracker: IConsoleTracker,
    positionModel: IPositionModel
  ) => {
    let previousWidget: ConsolePanel | null = null;

    const provider = async (widget: Widget | null) => {
      let editor: CodeEditor.IEditor | null = null;
      if (widget !== previousWidget) {
        previousWidget?.console.promptCellCreated.disconnect(
          positionModel.update
        );

        previousWidget = null;
        if (widget && tracker.has(widget)) {
          (widget as ConsolePanel).console.promptCellCreated.connect(
            positionModel.update
          );
          const promptCell = (widget as ConsolePanel).console.promptCell;
          editor = null;
          if (promptCell) {
            await promptCell.ready;
            editor = promptCell.editor;
          }
          previousWidget = widget as ConsolePanel;
        }
      } else if (widget) {
        const promptCell = (widget as ConsolePanel).console.promptCell;
        editor = null;
        if (promptCell) {
          await promptCell.ready;
          editor = promptCell.editor;
        }
      }
      return editor;
    };

    positionModel.addEditorProvider(provider);
  }
};

const completerPlugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/console-extension:completer',
  description: 'Adds completion to the console.',
  autoStart: true,
  requires: [IConsoleTracker],
  optional: [ICompletionProviderManager, ITranslator, ISanitizer],
  activate: activateConsoleCompleterService
};

/**
 * Export the plugins as the default.
 */
const plugins: JupyterFrontEndPlugin<any>[] = [
  factory,
  tracker,
  foreign,
  kernelStatus,
  lineColStatus,
  completerPlugin
];
export default plugins;

/**
 * Activate the console extension.
 */
async function activateConsole(
  app: JupyterFrontEnd,
  contentFactory: ConsolePanel.IContentFactory,
  editorServices: IEditorServices,
  rendermime: IRenderMimeRegistry,
  settingRegistry: ISettingRegistry,
  restorer: ILayoutRestorer | null,
  filebrowser: IDefaultFileBrowser | null,
  mainMenu: IMainMenu | null,
  palette: ICommandPalette | null,
  launcher: ILauncher | null,
  status: ILabStatus | null,
  sessionDialogs_: ISessionContextDialogs | null,
  formRegistry: IFormRendererRegistry | null,
  translator_: ITranslator | null
): Promise<IConsoleTracker> {
  const translator = translator_ ?? nullTranslator;
  const trans = translator.load('jupyterlab');
  const manager = app.serviceManager;
  const { commands, shell } = app;
  const category = trans.__('Console');
  const sessionDialogs =
    sessionDialogs_ ?? new SessionContextDialogs({ translator });

  // Create a widget tracker for all console panels.
  const tracker = new WidgetTracker<ConsolePanel>({
    namespace: 'console'
  });

  // Handle state restoration.
  if (restorer) {
    void restorer.restore(tracker, {
      command: CommandIDs.create,
      args: widget => {
        const { path, name, kernelPreference } = widget.console.sessionContext;
        return {
          path,
          name,
          kernelPreference: { ...kernelPreference }
        };
      },
      name: widget => widget.console.sessionContext.path ?? UUID.uuid4(),
      when: manager.ready
    });
  }

  // Add a launcher item if the launcher is available.
  if (launcher) {
    void manager.ready.then(() => {
      let disposables: DisposableSet | null = null;
      const onSpecsChanged = () => {
        if (disposables) {
          disposables.dispose();
          disposables = null;
        }
        const specs = manager.kernelspecs.specs;
        if (!specs) {
          return;
        }
        disposables = new DisposableSet();
        for (const name in specs.kernelspecs) {
          const rank = name === specs.default ? 0 : Infinity;
          const spec = specs.kernelspecs[name]!;
          const kernelIconUrl =
            spec.resources['logo-svg'] || spec.resources['logo-64x64'];
          disposables.add(
            launcher.add({
              command: CommandIDs.create,
              args: { isLauncher: true, kernelPreference: { name } },
              category: trans.__('Console'),
              rank,
              kernelIconUrl,
              metadata: {
                kernel: JSONExt.deepCopy(
                  spec.metadata || {}
                ) as ReadonlyJSONValue
              }
            })
          );
        }
      };
      onSpecsChanged();
      manager.kernelspecs.specsChanged.connect(onSpecsChanged);
    });
  }

  /**
   * The options used to create a widget.
   */
  interface ICreateOptions extends Partial<ConsolePanel.IOptions> {
    /**
     * Whether to activate the widget.  Defaults to `true`.
     */
    activate?: boolean;

    /**
     * The reference widget id for the insert location.
     *
     * The default is `null`.
     */
    ref?: string | null;

    /**
     * The tab insert mode.
     *
     * An insert mode is used to specify how a widget should be added
     * to the main area relative to a reference widget.
     */
    insertMode?: DockLayout.InsertMode;

    /**
     * Type of widget to open
     *
     * #### Notes
     * This is the key used to load user layout customization.
     * Its typical value is: a factory name or the widget id (if singleton)
     */
    type?: string;
  }

  /**
   * Create a console for a given path.
   */
  async function createConsole(options: ICreateOptions): Promise<ConsolePanel> {
    await manager.ready;

    const panel = new ConsolePanel({
      manager,
      contentFactory,
      mimeTypeService: editorServices.mimeTypeService,
      rendermime,
      sessionDialogs,
      translator,
      setBusy: (status && (() => status.setBusy())) ?? undefined,
      ...(options as Partial<ConsolePanel.IOptions>)
    });

    const interactionMode: string = (
      await settingRegistry.get(
        '@jupyterlab/console-extension:tracker',
        'interactionMode'
      )
    ).composite as string;
    panel.console.node.dataset.jpInteractionMode = interactionMode;

    // Add the console panel to the tracker. We want the panel to show up before
    // any kernel selection dialog, so we do not await panel.session.ready;
    await tracker.add(panel);
    panel.sessionContext.propertyChanged.connect(() => {
      void tracker.save(panel);
    });

    shell.add(panel, 'main', {
      ref: options.ref,
      mode: options.insertMode,
      activate: options.activate !== false,
      type: options.type ?? 'Console'
    });
    return panel;
  }

  const pluginId = '@jupyterlab/console-extension:tracker';
  let interactionMode: string;
  let promptCellConfig: JSONObject = {};

  /**
   * Update settings for one console or all consoles.
   *
   * @param panel Optional - single console to update.
   */
  async function updateSettings(panel?: ConsolePanel) {
    interactionMode = (await settingRegistry.get(pluginId, 'interactionMode'))
      .composite as string;
    promptCellConfig = (await settingRegistry.get(pluginId, 'promptCellConfig'))
      .composite as JSONObject;

    const setWidgetOptions = (widget: ConsolePanel) => {
      widget.console.node.dataset.jpInteractionMode = interactionMode;
      // Update future promptCells
      widget.console.editorConfig = promptCellConfig;
      // Update promptCell already on screen
      widget.console.promptCell?.editor?.setOptions(promptCellConfig);
    };

    if (panel) {
      setWidgetOptions(panel);
    } else {
      tracker.forEach(setWidgetOptions);
    }
  }

  settingRegistry.pluginChanged.connect((sender, plugin) => {
    if (plugin === pluginId) {
      void updateSettings();
    }
  });
  await updateSettings();

  if (formRegistry) {
    const CMRenderer = formRegistry.getRenderer(
      '@jupyterlab/codemirror-extension:plugin.defaultConfig'
    );
    if (CMRenderer) {
      formRegistry.addRenderer(
        '@jupyterlab/console-extension:tracker.promptCellConfig',
        CMRenderer
      );
    }
  }

  // Apply settings when a console is created.
  tracker.widgetAdded.connect((sender, panel) => {
    void updateSettings(panel);
  });

  commands.addCommand(CommandIDs.autoClosingBrackets, {
    execute: async args => {
      promptCellConfig.autoClosingBrackets = !!(
        args['force'] ?? !promptCellConfig.autoClosingBrackets
      );
      await settingRegistry.set(pluginId, 'promptCellConfig', promptCellConfig);
    },
    label: trans.__('Auto Close Brackets for Code Console Prompt'),
    isToggled: () => promptCellConfig.autoClosingBrackets as boolean
  });

  /**
   * Whether there is an active console.
   */
  function isEnabled(): boolean {
    return (
      tracker.currentWidget !== null &&
      tracker.currentWidget === shell.currentWidget
    );
  }

  /**
   * The options used to open a console.
   */
  interface IOpenOptions extends Partial<ConsolePanel.IOptions> {
    /**
     * Whether to activate the console.  Defaults to `true`.
     */
    activate?: boolean;
  }

  let command = CommandIDs.open;
  commands.addCommand(command, {
    label: trans.__('Open a console for the provided `path`.'),
    execute: (args: IOpenOptions) => {
      const path = args['path'];
      const widget = tracker.find(value => {
        return value.console.sessionContext.session?.path === path;
      });
      if (widget) {
        if (args.activate !== false) {
          shell.activateById(widget.id);
        }
        return widget;
      } else {
        return manager.ready.then(() => {
          const model = find(manager.sessions.running(), item => {
            return item.path === path;
          });
          if (model) {
            return createConsole(args);
          }
          return Promise.reject(`No running kernel session for path: ${path}`);
        });
      }
    }
  });

  command = CommandIDs.create;
  commands.addCommand(command, {
    label: args => {
      if (args['isPalette']) {
        return trans.__('New Console');
      } else if (args['isLauncher'] && args['kernelPreference']) {
        const kernelPreference = args[
          'kernelPreference'
        ] as ISessionContext.IKernelPreference;
        // TODO: Lumino command functions should probably be allowed to return undefined?
        return (
          manager.kernelspecs?.specs?.kernelspecs[kernelPreference.name || '']
            ?.display_name ?? ''
        );
      }
      return trans.__('Console');
    },
    icon: args => (args['isPalette'] ? undefined : consoleIcon),
    execute: args => {
      const basePath =
        ((args['basePath'] as string) ||
          (args['cwd'] as string) ||
          filebrowser?.model.path) ??
        '';
      return createConsole({ basePath, ...args });
    }
  });

  // Get the current widget and activate unless the args specify otherwise.
  function getCurrent(args: ReadonlyPartialJSONObject): ConsolePanel | null {
    const widget = tracker.currentWidget;
    const activate = args['activate'] !== false;
    if (activate && widget) {
      shell.activateById(widget.id);
    }
    return widget ?? null;
  }

  commands.addCommand(CommandIDs.clear, {
    label: trans.__('Clear Console Cells'),
    execute: args => {
      const current = getCurrent(args);
      if (!current) {
        return;
      }
      current.console.clear();
    },
    isEnabled
  });

  commands.addCommand(CommandIDs.runUnforced, {
    label: trans.__('Run Cell (unforced)'),
    execute: args => {
      const current = getCurrent(args);
      if (!current) {
        return;
      }
      return current.console.execute();
    },
    isEnabled
  });

  commands.addCommand(CommandIDs.runForced, {
    label: trans.__('Run Cell (forced)'),
    execute: args => {
      const current = getCurrent(args);
      if (!current) {
        return;
      }
      return current.console.execute(true);
    },
    isEnabled
  });

  commands.addCommand(CommandIDs.linebreak, {
    label: trans.__('Insert Line Break'),
    execute: args => {
      const current = getCurrent(args);
      if (!current) {
        return;
      }
      current.console.insertLinebreak();
    },
    isEnabled
  });

  commands.addCommand(CommandIDs.replaceSelection, {
    label: trans.__('Replace Selection in Console'),
    execute: args => {
      const current = getCurrent(args);
      if (!current) {
        return;
      }
      const text: string = (args['text'] as string) || '';
      current.console.replaceSelection(text);
    },
    isEnabled
  });

  commands.addCommand(CommandIDs.interrupt, {
    label: trans.__('Interrupt Kernel'),
    execute: args => {
      const current = getCurrent(args);
      if (!current) {
        return;
      }
      const kernel = current.console.sessionContext.session?.kernel;
      if (kernel) {
        return kernel.interrupt();
      }
    },
    isEnabled
  });

  commands.addCommand(CommandIDs.restart, {
    label: trans.__('Restart Kernel…'),
    execute: args => {
      const current = getCurrent(args);
      if (!current) {
        return;
      }
      return sessionDialogs.restart(current.console.sessionContext);
    },
    isEnabled
  });

  commands.addCommand(CommandIDs.shutdown, {
    label: trans.__('Shut Down'),
    execute: args => {
      const current = getCurrent(args);
      if (!current) {
        return;
      }

      return current.console.sessionContext.shutdown();
    }
  });

  commands.addCommand(CommandIDs.closeAndShutdown, {
    label: trans.__('Close and Shut Down…'),
    execute: args => {
      const current = getCurrent(args);
      if (!current) {
        return;
      }
      return showDialog({
        title: trans.__('Shut down the console?'),
        body: trans.__(
          'Are you sure you want to close "%1"?',
          current.title.label
        ),
        buttons: [Dialog.cancelButton(), Dialog.warnButton()]
      }).then(result => {
        if (result.button.accept) {
          return commands
            .execute(CommandIDs.shutdown, { activate: false })
            .then(() => {
              current.dispose();
              return true;
            });
        } else {
          return false;
        }
      });
    },
    isEnabled
  });

  commands.addCommand(CommandIDs.inject, {
    label: trans.__('Inject some code in a console.'),
    execute: args => {
      const path = args['path'];
      tracker.find(widget => {
        if (widget.console.sessionContext.session?.path === path) {
          if (args['activate'] !== false) {
            shell.activateById(widget.id);
          }
          void widget.console.inject(
            args['code'] as string,
            args['metadata'] as JSONObject
          );
          return true;
        }
        return false;
      });
    },
    isEnabled
  });

  commands.addCommand(CommandIDs.changeKernel, {
    label: trans.__('Change Kernel…'),
    execute: args => {
      const current = getCurrent(args);
      if (!current) {
        return;
      }
      return sessionDialogs.selectKernel(current.console.sessionContext);
    },
    isEnabled
  });

  commands.addCommand(CommandIDs.getKernel, {
    label: trans.__('Get Kernel'),
    execute: args => {
      const current = getCurrent({ activate: false, ...args });
      if (!current) {
        return;
      }
      return current.sessionContext.session?.kernel;
    },
    isEnabled
  });

  if (palette) {
    // Add command palette items
    [
      CommandIDs.create,
      CommandIDs.linebreak,
      CommandIDs.clear,
      CommandIDs.runUnforced,
      CommandIDs.runForced,
      CommandIDs.restart,
      CommandIDs.interrupt,
      CommandIDs.changeKernel,
      CommandIDs.closeAndShutdown
    ].forEach(command => {
      palette.addItem({ command, category, args: { isPalette: true } });
    });
  }

  if (mainMenu) {
    // Add a close and shutdown command to the file menu.
    mainMenu.fileMenu.closeAndCleaners.add({
      id: CommandIDs.closeAndShutdown,
      isEnabled
    });

    // Add a kernel user to the Kernel menu
    mainMenu.kernelMenu.kernelUsers.changeKernel.add({
      id: CommandIDs.changeKernel,
      isEnabled
    });
    mainMenu.kernelMenu.kernelUsers.clearWidget.add({
      id: CommandIDs.clear,
      isEnabled
    });
    mainMenu.kernelMenu.kernelUsers.interruptKernel.add({
      id: CommandIDs.interrupt,
      isEnabled
    });
    mainMenu.kernelMenu.kernelUsers.restartKernel.add({
      id: CommandIDs.restart,
      isEnabled
    });
    mainMenu.kernelMenu.kernelUsers.shutdownKernel.add({
      id: CommandIDs.shutdown,
      isEnabled
    });

    // Add a code runner to the Run menu.
    mainMenu.runMenu.codeRunners.run.add({
      id: CommandIDs.runForced,
      isEnabled
    });

    // Add a clearer to the edit menu
    mainMenu.editMenu.clearers.clearCurrent.add({
      id: CommandIDs.clear,
      isEnabled
    });

    // Add kernel information to the application help menu.
    mainMenu.helpMenu.getKernel.add({
      id: CommandIDs.getKernel,
      isEnabled
    });
  }

  // For backwards compatibility and clarity, we explicitly label the run
  // keystroke with the actual effected change, rather than the generic
  // "notebook" or "terminal" interaction mode. When this interaction mode
  // affects more than just the run keystroke, we can make this menu title more
  // generic.
  const runShortcutTitles: { [index: string]: string } = {
    notebook: trans.__('Execute with Shift+Enter'),
    terminal: trans.__('Execute with Enter')
  };

  // Add the execute keystroke setting submenu.
  commands.addCommand(CommandIDs.interactionMode, {
    label: args =>
      runShortcutTitles[args['interactionMode'] as string] ??
      'Set the console interaction mode.',
    execute: async args => {
      const key = 'keyMap';
      try {
        await settingRegistry.set(
          pluginId,
          'interactionMode',
          args['interactionMode'] as string
        );
      } catch (reason) {
        console.error(`Failed to set ${pluginId}:${key} - ${reason.message}`);
      }
    },
    isToggled: args => args['interactionMode'] === interactionMode
  });

  return tracker;
}

/**
 * Activate the completer service for console.
 */
function activateConsoleCompleterService(
  app: JupyterFrontEnd,
  consoles: IConsoleTracker,
  manager: ICompletionProviderManager | null,
  translator: ITranslator | null,
  appSanitizer: IRenderMime.ISanitizer | null
): void {
  if (!manager) {
    return;
  }

  const trans = (translator ?? nullTranslator).load('jupyterlab');
  const sanitizer = appSanitizer ?? new Sanitizer();

  app.commands.addCommand(CommandIDs.invokeCompleter, {
    label: trans.__('Display the completion helper.'),
    execute: () => {
      const id = consoles.currentWidget && consoles.currentWidget.id;

      if (id) {
        return manager.invoke(id);
      }
    }
  });

  app.commands.addCommand(CommandIDs.selectCompleter, {
    label: trans.__('Select the completion suggestion.'),
    execute: () => {
      const id = consoles.currentWidget && consoles.currentWidget.id;

      if (id) {
        return manager.select(id);
      }
    }
  });

  app.commands.addKeyBinding({
    command: CommandIDs.selectCompleter,
    keys: ['Enter'],
    selector: '.jp-ConsolePanel .jp-mod-completer-active'
  });
  const updateCompleter = async (_: any, consolePanel: ConsolePanel) => {
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
        sanitzer: sanitizer
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
  consoles.widgetAdded.connect(updateCompleter);
  manager.activeProvidersChanged.connect(() => {
    consoles.forEach(consoleWidget => {
      updateCompleter(undefined, consoleWidget).catch(e => console.error(e));
    });
  });
}
