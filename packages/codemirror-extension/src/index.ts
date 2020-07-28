// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import CodeMirror from 'codemirror';

import { Menu } from '@lumino/widgets';

import {
  ILabShell,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { IEditMenu, IMainMenu } from '@jupyterlab/mainmenu';

import { Cell } from '@jupyterlab/cells';

import { IEditorServices } from '@jupyterlab/codeeditor';

import {
  editorServices,
  EditorSyntaxStatus,
  CodeMirrorEditor,
  Mode
} from '@jupyterlab/codemirror';

import { IDocumentWidget } from '@jupyterlab/docregistry';

import { IEditorTracker, FileEditor } from '@jupyterlab/fileeditor';

import { INotebookTracker } from '@jupyterlab/notebook';

import { ISettingRegistry } from '@jupyterlab/settingregistry';

import { IStatusBar } from '@jupyterlab/statusbar';

/**
 * The command IDs used by the codemirror plugin.
 */
namespace CommandIDs {
  export const changeKeyMap = 'codemirror:change-keymap';

  export const changeTheme = 'codemirror:change-theme';

  export const changeMode = 'codemirror:change-mode';

  export const find = 'codemirror:find';

  export const goToLine = 'codemirror:go-to-line';
}

/**
 * The editor services.
 */
const services: JupyterFrontEndPlugin<IEditorServices> = {
  id: '@jupyterlab/codemirror-extension:services',
  provides: IEditorServices,
  activate: activateEditorServices
};

/**
 * The editor commands.
 */
const commands: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/codemirror-extension:commands',
  requires: [IEditorTracker, INotebookTracker, ISettingRegistry],
  optional: [IMainMenu],
  activate: activateEditorCommands,
  autoStart: true
};

/**
 * The JupyterLab plugin for the EditorSyntax status item.
 */
export const editorSyntaxStatus: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/codemirror-extension:editor-syntax-status',
  autoStart: true,
  requires: [IEditorTracker, ILabShell],
  optional: [IStatusBar],
  activate: (
    app: JupyterFrontEnd,
    tracker: IEditorTracker,
    labShell: ILabShell,
    statusBar: IStatusBar | null
  ) => {
    if (!statusBar) {
      // Automatically disable if statusbar missing
      return;
    }
    const item = new EditorSyntaxStatus({ commands: app.commands });
    labShell.currentChanged.connect(() => {
      const current = labShell.currentWidget;
      if (current && tracker.has(current) && item.model) {
        item.model.editor = (current as IDocumentWidget<
          FileEditor
        >).content.editor;
      }
    });
    statusBar.registerStatusItem(
      '@jupyterlab/codemirror-extension:editor-syntax-status',
      {
        item,
        align: 'left',
        rank: 0,
        isActive: () =>
          !!labShell.currentWidget &&
          !!tracker.currentWidget &&
          labShell.currentWidget === tracker.currentWidget
      }
    );
  }
};

/**
 * Export the plugins as default.
 */
const plugins: JupyterFrontEndPlugin<any>[] = [
  commands,
  services,
  editorSyntaxStatus
];
export default plugins;

/**
 * The plugin ID used as the key in the setting registry.
 */
const id = commands.id;

/**
 * Set up the editor services.
 */
function activateEditorServices(app: JupyterFrontEnd): IEditorServices {
  CodeMirror.prototype.save = () => {
    void app.commands.execute('docmanager:save');
  };
  return editorServices;
}

/**
 * Set up the editor widget menu and commands.
 */
function activateEditorCommands(
  app: JupyterFrontEnd,
  fileEditorTracker: IEditorTracker,
  notebookTracker: INotebookTracker,
  settingRegistry: ISettingRegistry,
  mainMenu: IMainMenu | null
): void {
  const { commands, restored } = app;
  let {
    theme,
    keyMap,
    scrollPastEnd,
    styleActiveLine,
    styleSelectedText,
    selectionPointer,
    lineWiseCopyCut
  } = CodeMirrorEditor.defaultConfig;

  /**
   * Update the setting values.
   */
  async function updateSettings(
    settings: ISettingRegistry.ISettings
  ): Promise<void> {
    keyMap = (settings.get('keyMap').composite as string | null) || keyMap;

    // Lazy loading of vim mode
    if (keyMap === 'vim') {
      // @ts-expect-error
      await import('codemirror/keymap/vim.js');
      commands.addKeyBinding({
        selector: '.jp-Notebook.jp-mod-editMode',
        keys: ['Escape'],
        command: 'codemirror:leave-vim-insert-mode'
      });
      commands.addKeyBinding({
        selector: '.jp-Notebook.jp-mod-editMode',
        keys: ['Shift Escape'],
        command: 'notebook:enter-command-mode'
      });
    } else {
      commands.addKeyBinding({
        selector: '.jp-Notebook.jp-mod-editMode',
        keys: ['Escape'],
        command: 'notebook:enter-command-mode'
      });
    }

    theme = (settings.get('theme').composite as string | null) || theme;
    // Lazy loading of theme stylesheets
    if (theme !== 'jupyter' && theme !== 'default') {
      const filename =
        theme === 'solarized light' || theme === 'solarized dark'
          ? 'solarized'
          : theme;

      await import(`codemirror/theme/${filename}.css`);
    }

    scrollPastEnd =
      (settings.get('scrollPastEnd').composite as boolean | null) ??
      scrollPastEnd;
    styleActiveLine =
      (settings.get('styleActiveLine').composite as
        | boolean
        | CodeMirror.StyleActiveLine) ?? styleActiveLine;
    styleSelectedText =
      (settings.get('styleSelectedText').composite as boolean) ??
      styleSelectedText;
    selectionPointer =
      (settings.get('selectionPointer').composite as boolean | string) ??
      selectionPointer;
    lineWiseCopyCut =
      (settings.get('lineWiseCopyCut').composite as boolean) ?? lineWiseCopyCut;
  }

  /**
   * Update the settings of the current tracker instances.
   */
  function updateFileEditorTracker(): void {
    fileEditorTracker.forEach(widget => {
      if (widget.content.editor instanceof CodeMirrorEditor) {
        const cm = widget.content.editor.editor;
        cm.setOption('keyMap', keyMap);
        cm.setOption('theme', theme);
        cm.setOption('scrollPastEnd', scrollPastEnd);
        cm.setOption('styleActiveLine', styleActiveLine);
        cm.setOption('styleSelectedText', styleSelectedText);
        cm.setOption('selectionPointer', selectionPointer);
        cm.setOption('lineWiseCopyCut', lineWiseCopyCut);
      }
    });
  }

  /**
   * Update the settings of the current notebook tracker instances.
   */
  function updateNotebookTracker(): void {
    notebookTracker.forEach(widget => {
      widget.content.widgets.forEach(cell => {
        if (cell.inputArea.editor instanceof CodeMirrorEditor) {
          const cm = cell.inputArea.editor.editor;
          // Do not set scrollPastEnd option.
          cm.setOption('keyMap', keyMap);
          cm.setOption('theme', theme);
          cm.setOption('styleActiveLine', styleActiveLine);
          cm.setOption('styleSelectedText', styleSelectedText);
          cm.setOption('selectionPointer', selectionPointer);
          cm.setOption('lineWiseCopyCut', lineWiseCopyCut);
        }
      });
    });
  }

  // Fetch the initial state of the settings.
  Promise.all([settingRegistry.load(id), restored])
    .then(async ([settings]) => {
      await updateSettings(settings);
      updateFileEditorTracker();
      updateNotebookTracker();
      settings.changed.connect(async () => {
        await updateSettings(settings);
        updateFileEditorTracker();
        updateNotebookTracker();
      });
    })
    .catch((reason: Error) => {
      console.error(reason.message);
      updateFileEditorTracker();
      updateNotebookTracker();
    });

  /**
   * Handle the settings of new widgets.
   */
  fileEditorTracker.widgetAdded.connect((sender, widget) => {
    if (widget.content.editor instanceof CodeMirrorEditor) {
      const cm = widget.content.editor.editor;
      cm.setOption('keyMap', keyMap);
      cm.setOption('theme', theme);
      cm.setOption('scrollPastEnd', scrollPastEnd);
      cm.setOption('styleActiveLine', styleActiveLine);
      cm.setOption('styleSelectedText', styleSelectedText);
      cm.setOption('selectionPointer', selectionPointer);
      cm.setOption('lineWiseCopyCut', lineWiseCopyCut);
    }
  });

  /**
   * Handle the settings of new widgets.
   */
  notebookTracker.widgetAdded.connect((sender, widget) => {
    widget.content.widgets.forEach(cell => {
      if (cell.inputArea.editor instanceof CodeMirrorEditor) {
        const cm = cell.inputArea.editor.editor;
        // Do not set scrollPastEnd option.
        cm.setOption('keyMap', keyMap);
        cm.setOption('theme', theme);
        cm.setOption('styleActiveLine', styleActiveLine);
        cm.setOption('styleSelectedText', styleSelectedText);
        cm.setOption('selectionPointer', selectionPointer);
        cm.setOption('lineWiseCopyCut', lineWiseCopyCut);
      }
    });
  });

  notebookTracker.activeCellChanged.connect(onActiveCellChanged, this);

  let activeCell: Cell | null = null;

  commands.addCommand('codemirror:leave-vim-insert-mode', {
    label: 'Leave VIM Insert Mode',
    execute: args => {
      if (activeCell) {
        let editor = activeCell.editor as CodeMirrorEditor;
        (CodeMirror as any).Vim.handleKey(editor.editor, '<Esc>');
      }
    },
    isEnabled
  });

  function onActiveCellChanged(): void {
    if (keyMap === 'vim') {
      activeCell = notebookTracker.activeCell;
      if (activeCell) {
        // From https://github.com/axelfahy/jupyterlab-vim/blob/c4e43f940ef4be4c961608b6192412d2f3a33d1f/src/index.ts
        CodeMirror.prototype.save = () => {
          void commands.execute('docmanager:save');
        };
        const lvim = (CodeMirror as any).Vim as any;
        if (lvim) {
          lvim.defineEx('quit', 'q', function(cm: any) {
            void commands.execute('notebook:enter-command-mode');
          });
          lvim.defineAction('splitCell', (cm: any, actionArgs: any) => {
            void commands.execute('notebook:split-cell-at-cursor');
          });
          lvim.mapCommand('-', 'action', 'splitCell', {}, { extra: 'normal' });
        }
      }
    }
  }

  /**
   * A test for whether the tracker has an active widget.
   */
  function isEnabled(): boolean {
    return (
      (fileEditorTracker.currentWidget !== null &&
        fileEditorTracker.currentWidget === app.shell.currentWidget) ||
      (notebookTracker.currentWidget !== null &&
        notebookTracker.currentWidget === app.shell.currentWidget)
    );
  }

  /**
   * Create a menu for the editor.
   */
  const themeMenu = new Menu({ commands });
  const keyMapMenu = new Menu({ commands });
  const modeMenu = new Menu({ commands });

  themeMenu.title.label = 'Text Editor Theme';
  keyMapMenu.title.label = 'Text Editor Key Map';
  modeMenu.title.label = 'Text Editor Syntax Highlighting';

  commands.addCommand(CommandIDs.changeTheme, {
    label: args => {
      if (args['theme'] === 'default') {
        return 'codemirror';
      } else {
        return args['theme'] as string;
      }
    },
    execute: args => {
      const key = 'theme';
      const value = (theme = (args['theme'] as string) || theme);

      return settingRegistry.set(id, key, value).catch((reason: Error) => {
        console.error(`Failed to set ${id}:${key} - ${reason.message}`);
      });
    },
    isToggled: args => args['theme'] === theme
  });

  commands.addCommand(CommandIDs.changeKeyMap, {
    label: args => {
      const title = args['keyMap'] as string;
      return title === 'sublime' ? 'Sublime Text' : title;
    },
    execute: args => {
      const key = 'keyMap';
      const value = (keyMap = (args['keyMap'] as string) || keyMap);

      return settingRegistry.set(id, key, value).catch((reason: Error) => {
        console.error(`Failed to set ${id}:${key} - ${reason.message}`);
      });
    },
    isToggled: args => args['keyMap'] === keyMap
  });

  commands.addCommand(CommandIDs.find, {
    label: 'Find...',
    execute: () => {
      const widget = fileEditorTracker.currentWidget;
      if (!widget) {
        return;
      }
      const editor = widget.content.editor as CodeMirrorEditor;
      editor.execCommand('find');
    },
    isEnabled
  });

  commands.addCommand(CommandIDs.goToLine, {
    label: 'Go to Line...',
    execute: () => {
      const widget = fileEditorTracker.currentWidget;
      if (!widget) {
        return;
      }
      const editor = widget.content.editor as CodeMirrorEditor;
      editor.execCommand('jumpToLine');
    },
    isEnabled
  });

  commands.addCommand(CommandIDs.changeMode, {
    label: args => args['name'] as string,
    execute: args => {
      const name = args['name'] as string;
      const widget = fileEditorTracker.currentWidget;
      if (name && widget) {
        const spec = Mode.findByName(name);
        if (spec) {
          widget.content.model.mimeType = spec.mime;
        }
      }
    },
    isEnabled,
    isToggled: args => {
      const widget = fileEditorTracker.currentWidget;
      if (!widget) {
        return false;
      }
      const mime = widget.content.model.mimeType;
      const spec = Mode.findByMIME(mime);
      const name = spec && spec.name;
      return args['name'] === name;
    }
  });

  Mode.getModeInfo()
    .sort((a, b) => {
      const aName = a.name || '';
      const bName = b.name || '';
      return aName.localeCompare(bName);
    })
    .forEach(spec => {
      // Avoid mode name with a curse word.
      if (spec.mode.indexOf('brainf') === 0) {
        return;
      }
      modeMenu.addItem({
        command: CommandIDs.changeMode,
        args: { ...spec } as any // TODO: Casting to `any` until lumino typings are fixed
      });
    });

  [
    'jupyter',
    'default',
    'abcdef',
    'base16-dark',
    'base16-light',
    'hopscotch',
    'material',
    'mbo',
    'mdn-like',
    'seti',
    'solarized dark',
    'solarized light',
    'the-matrix',
    'xq-light',
    'zenburn'
  ].forEach(name =>
    themeMenu.addItem({
      command: CommandIDs.changeTheme,
      args: { theme: name }
    })
  );

  ['default', 'sublime', 'vim', 'emacs'].forEach(name => {
    keyMapMenu.addItem({
      command: CommandIDs.changeKeyMap,
      args: { keyMap: name }
    });
  });

  if (mainMenu) {
    // Add some of the editor settings to the settings menu.
    mainMenu.settingsMenu.addGroup(
      [
        { type: 'submenu' as Menu.ItemType, submenu: keyMapMenu },
        { type: 'submenu' as Menu.ItemType, submenu: themeMenu }
      ],
      10
    );

    // Add the syntax highlighting submenu to the `View` menu.
    mainMenu.viewMenu.addGroup([{ type: 'submenu', submenu: modeMenu }], 40);

    // Add go to line capabilities to the edit menu.
    mainMenu.editMenu.goToLiners.add({
      tracker: fileEditorTracker,
      goToLine: (widget: IDocumentWidget<FileEditor>) => {
        const editor = widget.content.editor as CodeMirrorEditor;
        editor.execCommand('jumpToLine');
      }
    } as IEditMenu.IGoToLiner<IDocumentWidget<FileEditor>>);
  }
}
