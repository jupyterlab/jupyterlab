// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ICommandPalette, WidgetTracker } from '@jupyterlab/apputils';

import { CodeEditor, IEditorServices } from '@jupyterlab/codeeditor';

import { IConsoleTracker } from '@jupyterlab/console';

import { ISettingRegistry } from '@jupyterlab/coreutils';

import { IDocumentWidget } from '@jupyterlab/docregistry';

import { IFileBrowserFactory } from '@jupyterlab/filebrowser';

import {
  FileEditor,
  FileEditorFactory,
  IEditorTracker,
  TabSpaceStatus
} from '@jupyterlab/fileeditor';

import { ILauncher } from '@jupyterlab/launcher';

import { IMainMenu } from '@jupyterlab/mainmenu';

import { IStatusBar } from '@jupyterlab/statusbar';

import { JSONObject } from '@phosphor/coreutils';

import { Menu } from '@phosphor/widgets';

import Commands, { EDITOR_ICON_CLASS } from './commands';

/**
 * The name of the factory that creates editor widgets.
 */
const FACTORY = 'Editor';

/**
 * The command IDs used by the fileeditor plugin.
 */
export namespace CommandIDs {
  export const createNew = 'fileeditor:create-new';

  export const createNewMarkdown = 'fileeditor:create-new-markdown-file';

  export const changeFontSize = 'fileeditor:change-font-size';

  export const lineNumbers = 'fileeditor:toggle-line-numbers';

  export const lineWrap = 'fileeditor:toggle-line-wrap';

  export const changeTabs = 'fileeditor:change-tabs';

  export const matchBrackets = 'fileeditor:toggle-match-brackets';

  export const autoClosingBrackets = 'fileeditor:toggle-autoclosing-brackets';

  export const createConsole = 'fileeditor:create-console';

  export const runCode = 'fileeditor:run-code';

  export const runAllCode = 'fileeditor:run-all';

  export const markdownPreview = 'fileeditor:markdown-preview';
}

/**
 * The editor tracker extension.
 */
const plugin: JupyterFrontEndPlugin<IEditorTracker> = {
  activate,
  id: '@jupyterlab/fileeditor-extension:plugin',
  requires: [
    IConsoleTracker,
    IEditorServices,
    IFileBrowserFactory,
    ISettingRegistry
  ],
  optional: [ICommandPalette, ILauncher, IMainMenu, ILayoutRestorer],
  provides: IEditorTracker,
  autoStart: true
};

/**
 * A plugin that provides a status item allowing the user to
 * switch tabs vs spaces and tab widths for text editors.
 */
export const tabSpaceStatus: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/fileeditor-extension:tab-space-status',
  autoStart: true,
  requires: [IEditorTracker, ISettingRegistry],
  optional: [IStatusBar],
  activate: (
    app: JupyterFrontEnd,
    editorTracker: IEditorTracker,
    settingRegistry: ISettingRegistry,
    statusBar: IStatusBar | null
  ) => {
    if (!statusBar) {
      // Automatically disable if statusbar missing
      return;
    }
    // Create a menu for switching tabs vs spaces.
    const menu = new Menu({ commands: app.commands });
    const command = 'fileeditor:change-tabs';
    const { shell } = app;
    const args: JSONObject = {
      insertSpaces: false,
      size: 4,
      name: 'Indent with Tab'
    };
    menu.addItem({ command, args });
    for (let size of [1, 2, 4, 8]) {
      let args: JSONObject = {
        insertSpaces: true,
        size,
        name: `Spaces: ${size} `
      };
      menu.addItem({ command, args });
    }

    // Create the status item.
    const item = new TabSpaceStatus({ menu });

    // Keep a reference to the code editor config from the settings system.
    const updateSettings = (settings: ISettingRegistry.ISettings): void => {
      item.model!.config = {
        ...CodeEditor.defaultConfig,
        ...(settings.get('editorConfig').composite as JSONObject)
      };
    };
    void Promise.all([
      settingRegistry.load('@jupyterlab/fileeditor-extension:plugin'),
      app.restored
    ]).then(([settings]) => {
      updateSettings(settings);
      settings.changed.connect(updateSettings);
    });

    // Add the status item.
    statusBar.registerStatusItem(
      '@jupyterlab/fileeditor-extension:tab-space-status',
      {
        item,
        align: 'right',
        rank: 1,
        isActive: () => {
          return shell.currentWidget && editorTracker.has(shell.currentWidget);
        }
      }
    );
  }
};

/**
 * Export the plugins as default.
 */
const plugins: JupyterFrontEndPlugin<any>[] = [plugin, tabSpaceStatus];
export default plugins;

/**
 * Activate the editor tracker plugin.
 */
function activate(
  app: JupyterFrontEnd,
  consoleTracker: IConsoleTracker,
  editorServices: IEditorServices,
  browserFactory: IFileBrowserFactory,
  settingRegistry: ISettingRegistry,
  palette: ICommandPalette | null,
  launcher: ILauncher | null,
  menu: IMainMenu | null,
  restorer: ILayoutRestorer | null
): IEditorTracker {
  const id = plugin.id;
  const namespace = 'editor';
  const factory = new FileEditorFactory({
    editorServices,
    factoryOptions: {
      name: FACTORY,
      fileTypes: ['markdown', '*'], // Explicitly add the markdown fileType so
      defaultFor: ['markdown', '*'] // it outranks the defaultRendered viewer.
    }
  });
  const { commands, restored, shell } = app;
  const tracker = new WidgetTracker<IDocumentWidget<FileEditor>>({
    namespace
  });
  const isEnabled = () =>
    tracker.currentWidget !== null &&
    tracker.currentWidget === shell.currentWidget;

  let config: CodeEditor.IConfig = { ...CodeEditor.defaultConfig };

  // Handle state restoration.
  if (restorer) {
    void restorer.restore(tracker, {
      command: 'docmanager:open',
      args: widget => ({ path: widget.context.path, factory: FACTORY }),
      name: widget => widget.context.path
    });
  }

  /**
   * Update the setting values.
   */
  function updateSettings(settings: ISettingRegistry.ISettings): void {
    config = {
      ...CodeEditor.defaultConfig,
      ...(settings.get('editorConfig').composite as JSONObject)
    };

    // Trigger a refresh of the rendered commands
    app.commands.notifyCommandChanged();
  }

  /**
   * Update the settings of the current tracker instances.
   */
  function updateTracker(): void {
    tracker.forEach(widget => {
      updateWidget(widget.content);
    });
  }

  /**
   * Update the settings of a widget.
   */
  function updateWidget(widget: FileEditor): void {
    const editor = widget.editor;
    Object.keys(config).forEach((key: keyof CodeEditor.IConfig) => {
      editor.setOption(key, config[key]);
    });
  }

  // Add a console creator to the File menu
  // Fetch the initial state of the settings.
  Promise.all([settingRegistry.load(id), restored])
    .then(([settings]) => {
      updateSettings(settings);
      updateTracker();
      settings.changed.connect(() => {
        updateSettings(settings);
        updateTracker();
      });
    })
    .catch((reason: Error) => {
      console.error(reason.message);
      updateTracker();
    });

  factory.widgetCreated.connect((sender, widget) => {
    widget.title.icon = EDITOR_ICON_CLASS;

    // Notify the widget tracker if restore data needs to update.
    widget.context.pathChanged.connect(() => {
      void tracker.save(widget);
    });
    void tracker.add(widget);
    updateWidget(widget.content);
  });
  app.docRegistry.addWidgetFactory(factory);

  // Handle the settings of new widgets.
  tracker.widgetAdded.connect((sender, widget) => {
    updateWidget(widget.content);
  });

  Commands.addCommands(
    commands,
    config,
    settingRegistry,
    id,
    isEnabled,
    tracker,
    browserFactory,
    factory
  );

  // Add a launcher item if the launcher is available.
  if (launcher) {
    Commands.addLauncherItems(launcher);
  }

  if (palette) {
    Commands.addPaletteItems(palette);
  }

  if (menu) {
    Commands.addMenuItems(menu, commands, tracker, consoleTracker);
  }

  Commands.addContextMenuItems(app);

  return tracker;
}
