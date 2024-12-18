// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module fileeditor-extension
 */

import {
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import {
  createToolbarFactory,
  ICommandPalette,
  ISanitizer,
  ISessionContextDialogs,
  IToolbarWidgetRegistry,
  MainAreaWidget,
  Sanitizer,
  SessionContextDialogs,
  WidgetTracker
} from '@jupyterlab/apputils';
import {
  CodeViewerWidget,
  IEditorServices,
  IPositionModel
} from '@jupyterlab/codeeditor';
import {
  IEditorExtensionRegistry,
  IEditorLanguageRegistry,
  IEditorThemeRegistry
} from '@jupyterlab/codemirror';
import { ICompletionProviderManager } from '@jupyterlab/completer';
import { IConsoleTracker } from '@jupyterlab/console';
import { DocumentRegistry, IDocumentWidget } from '@jupyterlab/docregistry';
import { ISearchProviderRegistry } from '@jupyterlab/documentsearch';
import { IDefaultFileBrowser } from '@jupyterlab/filebrowser';
import {
  FileEditor,
  FileEditorAdapter,
  FileEditorFactory,
  FileEditorSearchProvider,
  IEditorTracker,
  IEditorWidgetFactory,
  LaTeXTableOfContentsFactory,
  MarkdownTableOfContentsFactory,
  PythonTableOfContentsFactory,
  TabSpaceStatus
} from '@jupyterlab/fileeditor';
import { ILauncher } from '@jupyterlab/launcher';
import {
  ILSPCodeExtractorsManager,
  ILSPDocumentConnectionManager,
  ILSPFeatureManager,
  IWidgetLSPAdapterTracker,
  WidgetLSPAdapterTracker
} from '@jupyterlab/lsp';
import { IMainMenu } from '@jupyterlab/mainmenu';
import { IObservableList } from '@jupyterlab/observables';
import { IRenderMime } from '@jupyterlab/rendermime-interfaces';
import { Session } from '@jupyterlab/services';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { IStatusBar } from '@jupyterlab/statusbar';
import { ITableOfContentsRegistry } from '@jupyterlab/toc';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { IFormRendererRegistry, MenuSvg } from '@jupyterlab/ui-components';
import { find } from '@lumino/algorithm';
import { JSONObject } from '@lumino/coreutils';
import { Widget } from '@lumino/widgets';

import { CommandIDs, Commands, FACTORY, IFileTypeData } from './commands';
import { editorSyntaxStatus } from './syntaxstatus';

export { Commands } from './commands';

/**
 * The editor tracker extension.
 */
const plugin: JupyterFrontEndPlugin<IEditorTracker> = {
  activate,
  id: '@jupyterlab/fileeditor-extension:plugin',
  description: 'Provides the file editor widget tracker.',
  requires: [
    IEditorWidgetFactory,
    IEditorServices,
    IEditorExtensionRegistry,
    IEditorLanguageRegistry,
    IEditorThemeRegistry,
    IDefaultFileBrowser,
    ISettingRegistry
  ],
  optional: [
    IConsoleTracker,
    ICommandPalette,
    ILauncher,
    IMainMenu,
    ILayoutRestorer,
    ISessionContextDialogs,
    ITableOfContentsRegistry,
    ITranslator,
    IFormRendererRegistry
  ],
  provides: IEditorTracker,
  autoStart: true
};

/**
 * The widget factory extension.
 */
const widgetFactory: JupyterFrontEndPlugin<FileEditorFactory.IFactory> = {
  id: '@jupyterlab/fileeditor-extension:widget-factory',
  description: 'Provides the factory for creating file editors.',
  autoStart: true,
  requires: [IEditorServices, ISettingRegistry],
  optional: [IToolbarWidgetRegistry, ITranslator],
  provides: IEditorWidgetFactory,
  activate: (
    app: JupyterFrontEnd,
    editorServices: IEditorServices,
    settingRegistry: ISettingRegistry,
    toolbarRegistry: IToolbarWidgetRegistry | null,
    translator_: ITranslator | null
  ) => {
    const id = plugin.id;
    const translator = translator_ ?? nullTranslator;
    const trans = translator.load('jupyterlab');

    let toolbarFactory:
      | ((
          widget: IDocumentWidget<FileEditor>
        ) => IObservableList<DocumentRegistry.IToolbarItem>)
      | undefined;

    if (toolbarRegistry) {
      toolbarFactory = createToolbarFactory(
        toolbarRegistry,
        settingRegistry,
        FACTORY,
        id,
        translator
      );
    }
    const factory = new FileEditorFactory({
      editorServices,
      factoryOptions: {
        name: FACTORY,
        label: trans.__('Editor'),
        fileTypes: ['markdown', '*'], // Explicitly add the markdown fileType so
        defaultFor: ['markdown', '*'], // it outranks the defaultRendered viewer.
        toolbarFactory,
        translator
      }
    });
    app.docRegistry.addWidgetFactory(factory);

    return factory;
  }
};

/**
 * A plugin that provides a status item allowing the user to
 * switch tabs vs spaces and tab widths for text editors.
 */
export const tabSpaceStatus: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/fileeditor-extension:tab-space-status',
  description: 'Adds a file editor indentation status widget.',
  autoStart: true,
  requires: [
    IEditorTracker,
    IEditorExtensionRegistry,
    ISettingRegistry,
    ITranslator
  ],
  optional: [IStatusBar],
  activate: (
    app: JupyterFrontEnd,
    editorTracker: IEditorTracker,
    extensions: IEditorExtensionRegistry,
    settingRegistry: ISettingRegistry,
    translator: ITranslator,
    statusBar: IStatusBar | null
  ) => {
    const trans = translator.load('jupyterlab');
    if (!statusBar) {
      // Automatically disable if statusbar missing
      return;
    }
    // Create a menu for switching tabs vs spaces.
    const menu = new MenuSvg({ commands: app.commands });
    const command = 'fileeditor:change-tabs';
    const { shell } = app;
    const args: JSONObject = {
      name: trans.__('Indent with Tab')
    };
    menu.addItem({ command, args });
    for (const size of ['1', '2', '4', '8']) {
      const args: JSONObject = {
        size,
        // Use a context to differentiate with string set as plural in 3.x
        name: trans._p('v4', 'Spaces: %1', size)
      };
      menu.addItem({ command, args });
    }

    // Create the status item.
    const item = new TabSpaceStatus({ menu, translator });

    // Keep a reference to the code editor config from the settings system.
    const updateIndentUnit = (settings: ISettingRegistry.ISettings): void => {
      item.model!.indentUnit =
        (settings.get('editorConfig').composite as any)?.indentUnit ??
        extensions.baseConfiguration.indentUnit ??
        null;
    };

    void Promise.all([
      settingRegistry.load('@jupyterlab/fileeditor-extension:plugin'),
      app.restored
    ]).then(([settings]) => {
      updateIndentUnit(settings);
      settings.changed.connect(updateIndentUnit);
    });

    // Add the status item.
    statusBar.registerStatusItem(
      '@jupyterlab/fileeditor-extension:tab-space-status',
      {
        item,
        align: 'right',
        rank: 1,
        isActive: () => {
          return (
            !!shell.currentWidget && editorTracker.has(shell.currentWidget)
          );
        }
      }
    );
  }
};

/**
 * Cursor position.
 */
const lineColStatus: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/fileeditor-extension:cursor-position',
  description: 'Adds a file editor cursor position status widget.',
  activate: (
    app: JupyterFrontEnd,
    tracker: IEditorTracker,
    positionModel: IPositionModel
  ) => {
    positionModel.addEditorProvider((widget: Widget | null) =>
      Promise.resolve(
        widget && tracker.has(widget)
          ? (widget as IDocumentWidget<FileEditor>).content.editor
          : null
      )
    );
  },
  requires: [IEditorTracker, IPositionModel],
  autoStart: true
};

const completerPlugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/fileeditor-extension:completer',
  description: 'Adds the completer capability to the file editor.',
  requires: [IEditorTracker],
  optional: [ICompletionProviderManager, ITranslator, ISanitizer],
  activate: activateFileEditorCompleterService,
  autoStart: true
};

/**
 * A plugin to search file editors
 */
const searchProvider: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/fileeditor-extension:search',
  description: 'Adds search capability to the file editor.',
  requires: [ISearchProviderRegistry],
  autoStart: true,
  activate: (app: JupyterFrontEnd, registry: ISearchProviderRegistry) => {
    registry.add('jp-fileeditorSearchProvider', FileEditorSearchProvider);
  }
};

const languageServerPlugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/fileeditor-extension:language-server',
  description: 'Adds Language Server capability to the file editor.',
  requires: [
    IEditorTracker,
    ILSPDocumentConnectionManager,
    ILSPFeatureManager,
    ILSPCodeExtractorsManager,
    IWidgetLSPAdapterTracker
  ],
  activate: activateFileEditorLanguageServer,
  autoStart: true
};

/**
 * Export the plugins as default.
 */
const plugins: JupyterFrontEndPlugin<any>[] = [
  widgetFactory,
  plugin,
  lineColStatus,
  completerPlugin,
  languageServerPlugin,
  searchProvider,
  editorSyntaxStatus,
  tabSpaceStatus
];
export default plugins;

/**
 * Activate the editor tracker plugin.
 */
function activate(
  app: JupyterFrontEnd,
  factory: FileEditorFactory.IFactory,
  editorServices: IEditorServices,
  extensions: IEditorExtensionRegistry,
  languages: IEditorLanguageRegistry,
  themes: IEditorThemeRegistry,
  fileBrowser: IDefaultFileBrowser,
  settingRegistry: ISettingRegistry,
  consoleTracker: IConsoleTracker | null,
  palette: ICommandPalette | null,
  launcher: ILauncher | null,
  menu: IMainMenu | null,
  restorer: ILayoutRestorer | null,
  sessionDialogs_: ISessionContextDialogs | null,
  tocRegistry: ITableOfContentsRegistry | null,
  translator_: ITranslator | null,
  formRegistry: IFormRendererRegistry | null
): IEditorTracker {
  const id = plugin.id;
  const translator = translator_ ?? nullTranslator;
  const sessionDialogs =
    sessionDialogs_ ?? new SessionContextDialogs({ translator });
  const trans = translator.load('jupyterlab');
  const namespace = 'editor';

  const { commands, restored, shell } = app;
  const tracker = new WidgetTracker<IDocumentWidget<FileEditor>>({
    namespace
  });
  const isEnabled = () =>
    tracker.currentWidget !== null &&
    tracker.currentWidget === shell.currentWidget;

  const commonLanguageFileTypeData = new Map<string, IFileTypeData[]>([
    [
      'python',
      [
        {
          fileExt: 'py',
          iconName: 'ui-components:python',
          launcherLabel: trans.__('Python File'),
          paletteLabel: trans.__('New Python File'),
          caption: trans.__('Create a new Python file')
        }
      ]
    ],
    [
      'julia',
      [
        {
          fileExt: 'jl',
          iconName: 'ui-components:julia',
          launcherLabel: trans.__('Julia File'),
          paletteLabel: trans.__('New Julia File'),
          caption: trans.__('Create a new Julia file')
        }
      ]
    ],
    [
      'R',
      [
        {
          fileExt: 'r',
          iconName: 'ui-components:r-kernel',
          launcherLabel: trans.__('R File'),
          paletteLabel: trans.__('New R File'),
          caption: trans.__('Create a new R file')
        }
      ]
    ]
  ]);

  // Use available kernels to determine which common file types should have 'Create New' options in the Launcher, File Editor palette, and File menu
  const getAvailableKernelFileTypes = async (): Promise<Set<IFileTypeData>> => {
    const specsManager = app.serviceManager.kernelspecs;
    await specsManager.ready;
    let fileTypes = new Set<IFileTypeData>();
    const specs = specsManager.specs?.kernelspecs ?? {};
    Object.keys(specs).forEach(spec => {
      const specModel = specs[spec];
      if (specModel) {
        const exts = commonLanguageFileTypeData.get(specModel.language);
        exts?.forEach(ext => fileTypes.add(ext));
      }
    });
    return fileTypes;
  };

  // Handle state restoration.
  if (restorer) {
    void restorer.restore(tracker, {
      command: 'docmanager:open',
      args: widget => ({ path: widget.context.path, factory: FACTORY }),
      name: widget => widget.context.path
    });
  }

  // Add a console creator to the File menu
  // Fetch the initial state of the settings.
  Promise.all([settingRegistry.load(id), restored])
    .then(([settings]) => {
      // As the menu are defined in the settings we must ensure they are loaded
      // before updating dynamically the submenu
      if (menu) {
        const languageMenu = menu.viewMenu.items.find(
          item =>
            item.type === 'submenu' &&
            item.submenu?.id === 'jp-mainmenu-view-codemirror-language'
        )?.submenu;

        if (languageMenu) {
          languages
            .getLanguages()
            .sort((a, b) => {
              const aName = a.name;
              const bName = b.name;
              return aName.localeCompare(bName);
            })
            .forEach(spec => {
              // Avoid mode name with a curse word.
              if (spec.name.toLowerCase().indexOf('brainf') === 0) {
                return;
              }
              languageMenu.addItem({
                command: CommandIDs.changeLanguage,
                args: { ...spec } as any // TODO: Casting to `any` until lumino typings are fixed
              });
            });
        }
        const themeMenu = menu.settingsMenu.items.find(
          item =>
            item.type === 'submenu' &&
            item.submenu?.id === 'jp-mainmenu-settings-codemirror-theme'
        )?.submenu;

        if (themeMenu) {
          for (const theme of themes.themes) {
            themeMenu.addItem({
              command: CommandIDs.changeTheme,
              args: {
                theme: theme.name,
                displayName: theme.displayName ?? theme.name
              }
            });
          }
        }

        // Add go to line capabilities to the edit menu.
        menu.editMenu.goToLiners.add({
          id: CommandIDs.goToLine,
          isEnabled: (w: Widget) =>
            tracker.currentWidget !== null && tracker.has(w)
        });
      }

      Commands.updateSettings(settings, commands);
      Commands.updateTracker(tracker);
      settings.changed.connect(() => {
        Commands.updateSettings(settings, commands);
        Commands.updateTracker(tracker);
      });
    })
    .catch((reason: Error) => {
      console.error(reason.message);
      Commands.updateTracker(tracker);
    });

  if (formRegistry) {
    const CMRenderer = formRegistry.getRenderer(
      '@jupyterlab/codemirror-extension:plugin.defaultConfig'
    );
    if (CMRenderer) {
      formRegistry.addRenderer(
        '@jupyterlab/fileeditor-extension:plugin.editorConfig',
        CMRenderer
      );
    }
  }

  factory.widgetCreated.connect((sender, widget) => {
    // Notify the widget tracker if restore data needs to update.
    widget.context.pathChanged.connect(() => {
      void tracker.save(widget);
    });
    void tracker.add(widget);
    Commands.updateWidget(widget.content);
  });

  // Handle the settings of new widgets.
  tracker.widgetAdded.connect((sender, widget) => {
    Commands.updateWidget(widget.content);
  });

  Commands.addCommands(
    app.commands,
    settingRegistry,
    trans,
    id,
    isEnabled,
    tracker,
    fileBrowser,
    extensions,
    languages,
    consoleTracker,
    sessionDialogs,
    app.shell
  );

  const codeViewerTracker = new WidgetTracker<MainAreaWidget<CodeViewerWidget>>(
    {
      namespace: 'codeviewer'
    }
  );

  // Handle state restoration for code viewers
  if (restorer) {
    void restorer.restore(codeViewerTracker, {
      command: CommandIDs.openCodeViewer,
      args: widget => ({
        content: widget.content.content,
        label: widget.content.title.label,
        mimeType: widget.content.mimeType,
        widgetId: widget.content.id
      }),
      name: widget => widget.content.id
    });
  }

  Commands.addOpenCodeViewerCommand(
    app,
    editorServices,
    codeViewerTracker,
    trans
  );

  // Add a launcher item if the launcher is available.
  if (launcher) {
    Commands.addLauncherItems(launcher, trans);
  }

  if (palette) {
    Commands.addPaletteItems(palette, trans);
  }

  if (menu) {
    Commands.addMenuItems(menu, tracker, consoleTracker, isEnabled);
  }

  getAvailableKernelFileTypes()
    .then(availableKernelFileTypes => {
      if (launcher) {
        Commands.addKernelLanguageLauncherItems(
          launcher,
          trans,
          availableKernelFileTypes
        );
      }

      if (palette) {
        Commands.addKernelLanguagePaletteItems(
          palette,
          trans,
          availableKernelFileTypes
        );
      }

      if (menu) {
        Commands.addKernelLanguageMenuItems(menu, availableKernelFileTypes);
      }
    })
    .catch((reason: Error) => {
      console.error(reason.message);
    });

  if (tocRegistry) {
    tocRegistry.add(new LaTeXTableOfContentsFactory(tracker));
    tocRegistry.add(new MarkdownTableOfContentsFactory(tracker));
    tocRegistry.add(new PythonTableOfContentsFactory(tracker));
  }

  return tracker;
}

/**
 * Activate the completer service for file editor.
 */
function activateFileEditorCompleterService(
  app: JupyterFrontEnd,
  editorTracker: IEditorTracker,
  manager: ICompletionProviderManager | null,
  translator: ITranslator | null,
  appSanitizer: IRenderMime.ISanitizer | null
): void {
  if (!manager) {
    return;
  }

  Commands.addCompleterCommands(
    app.commands,
    editorTracker,
    manager,
    translator
  );
  const sessionManager = app.serviceManager.sessions;
  const sanitizer = appSanitizer ?? new Sanitizer();
  const _activeSessions = new Map<string, Session.ISessionConnection>();
  const updateCompleter = async (
    _: IEditorTracker,
    widget: IDocumentWidget<FileEditor>
  ) => {
    const completerContext = {
      editor: widget.content.editor,
      widget
    };

    await manager.updateCompleter(completerContext);
    const onRunningChanged = (
      _: Session.IManager,
      models: Session.IModel[]
    ) => {
      const oldSession = _activeSessions.get(widget.id);
      // Search for a matching path.
      const model = find(models, m => m.path === widget.context.path);
      if (model) {
        // If there is a matching path, but it is the same
        // session as we previously had, do nothing.
        if (oldSession && oldSession.id === model.id) {
          return;
        }
        // Otherwise, dispose of the old session and reset to
        // a new CompletionConnector.
        if (oldSession) {
          _activeSessions.delete(widget.id);
          oldSession.dispose();
        }
        const session = sessionManager.connectTo({ model });
        const newCompleterContext = {
          editor: widget.content.editor,
          widget,
          session,
          sanitizer
        };
        manager.updateCompleter(newCompleterContext).catch(console.error);
        _activeSessions.set(widget.id, session);
      } else {
        // If we didn't find a match, make sure
        // the connector is the contextConnector and
        // dispose of any previous connection.
        if (oldSession) {
          _activeSessions.delete(widget.id);
          oldSession.dispose();
        }
      }
    };

    onRunningChanged(sessionManager, Array.from(sessionManager.running()));
    sessionManager.runningChanged.connect(onRunningChanged);

    widget.disposed.connect(() => {
      sessionManager.runningChanged.disconnect(onRunningChanged);
      const session = _activeSessions.get(widget.id);
      if (session) {
        _activeSessions.delete(widget.id);
        session.dispose();
      }
    });
  };
  editorTracker.widgetAdded.connect(updateCompleter);
  manager.activeProvidersChanged.connect(() => {
    editorTracker.forEach(editorWidget => {
      updateCompleter(editorTracker, editorWidget).catch(console.error);
    });
  });
}

function activateFileEditorLanguageServer(
  app: JupyterFrontEnd,
  editors: IEditorTracker,
  connectionManager: ILSPDocumentConnectionManager,
  featureManager: ILSPFeatureManager,
  extractorManager: ILSPCodeExtractorsManager,
  adapterTracker: IWidgetLSPAdapterTracker
): void {
  editors.widgetAdded.connect(async (_, editor) => {
    const adapter = new FileEditorAdapter(editor, {
      connectionManager,
      featureManager,
      foreignCodeExtractorsManager: extractorManager,
      docRegistry: app.docRegistry
    });
    (adapterTracker as WidgetLSPAdapterTracker).add(adapter);
  });
}
