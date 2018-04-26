// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as CodeMirror
  from 'codemirror';

import {
  Menu
} from '@phosphor/widgets';

import {
  JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  IMainMenu, IEditMenu
} from '@jupyterlab/mainmenu';

import {
  IEditorServices
} from '@jupyterlab/codeeditor';

import {
  editorServices, CodeMirrorEditor, Mode
} from '@jupyterlab/codemirror';

import {
  ISettingRegistry, IStateDB
} from '@jupyterlab/coreutils';

import {
  IEditorTracker, FileEditor
} from '@jupyterlab/fileeditor';


/**
 * The command IDs used by the codemirror plugin.
 */
namespace CommandIDs {
  export
  const changeKeyMap = 'codemirror:change-keymap';

  export
  const changeTheme = 'codemirror:change-theme';

  export
  const changeMode = 'codemirror:change-mode';

  export
  const find = 'codemirror:find';

  export
  const findAndReplace = 'codemirror:find-and-replace';
}


/**
 * The editor services.
 */
const services: JupyterLabPlugin<IEditorServices> = {
  id: '@jupyterlab/codemirror-extension:services',
  provides: IEditorServices,
  activate: activateEditorServices
};



/**
 * The editor commands.
 */
const commands: JupyterLabPlugin<void> = {
  id: '@jupyterlab/codemirror-extension:commands',
  requires: [
    IEditorTracker,
    IMainMenu,
    IStateDB,
    ISettingRegistry
  ],
  activate: activateEditorCommands,
  autoStart: true
};


/**
 * Export the plugins as default.
 */
const plugins: JupyterLabPlugin<any>[] = [commands, services];
export default plugins;


/**
 * The plugin ID used as the key in the setting registry.
 */
const id = commands.id;


/**
 * Set up the editor services.
 */
function activateEditorServices(app: JupyterLab): IEditorServices {
  CodeMirror.prototype.save = () => {
    app.commands.execute('docmanager:save');
  };
  return editorServices;
}


/**
 * Set up the editor widget menu and commands.
 */
function activateEditorCommands(app: JupyterLab, tracker: IEditorTracker, mainMenu: IMainMenu, state: IStateDB, settingRegistry: ISettingRegistry): void {
  const { commands, restored } = app;
  let { theme, keyMap } = CodeMirrorEditor.defaultConfig;

  /**
   * Update the setting values.
   */
  function updateSettings(settings: ISettingRegistry.ISettings): void {
    keyMap = settings.get('keyMap').composite as string | null || keyMap;
    theme = settings.get('theme').composite as string | null || theme;
  }

  /**
   * Update the settings of the current tracker instances.
   */
  function updateTracker(): void {
    tracker.forEach(widget => {
      if (widget.editor instanceof CodeMirrorEditor) {
        let cm = widget.editor.editor;
        cm.setOption('keyMap', keyMap);
        cm.setOption('theme', theme);
      }
    });
  }

  // Fetch the initial state of the settings.
  Promise.all([settingRegistry.load(id), restored]).then(([settings]) => {
    updateSettings(settings);
    updateTracker();
    settings.changed.connect(() => {
      updateSettings(settings);
      updateTracker();
    });
  }).catch((reason: Error) => {
    console.error(reason.message);
    updateTracker();
  });

  /**
   * Handle the settings of new widgets.
   */
  tracker.widgetAdded.connect((sender, widget) => {
    if (widget.editor instanceof CodeMirrorEditor) {
      let cm = widget.editor.editor;
      cm.setOption('keyMap', keyMap);
      cm.setOption('theme', theme);
    }
  });

  /**
   * A test for whether the tracker has an active widget.
   */
  function isEnabled(): boolean {
    return tracker.currentWidget !== null &&
           tracker.currentWidget === app.shell.currentWidget;
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
    label: args => args['theme'] as string,
    execute: args => {
      const key = 'theme';
      const value = theme = args['theme'] as string || theme;

      updateTracker();
      return settingRegistry.set(id, key, value).catch((reason: Error) => {
        console.error(`Failed to set ${id}:${key} - ${reason.message}`);
      });
    },
    isToggled: args => args['theme'] === theme
  });

  commands.addCommand(CommandIDs.changeKeyMap, {
    label: args => {
      let title = args['keyMap'] as string;
      return title === 'sublime' ? 'Sublime Text' : title;
    },
    execute: args => {
      const key = 'keyMap';
      const value = keyMap = args['keyMap'] as string || keyMap;

      updateTracker();
      return settingRegistry.set(id, key, value).catch((reason: Error) => {
        console.error(`Failed to set ${id}:${key} - ${reason.message}`);
      });
    },
    isToggled: args => args['keyMap'] === keyMap
  });

  commands.addCommand(CommandIDs.find, {
    label: 'Find...',
    execute: () => {
      let widget = tracker.currentWidget;
      if (!widget) {
        return;
      }
      let editor = widget.editor as CodeMirrorEditor;
      editor.execCommand('find');
    },
    isEnabled
  });

  commands.addCommand(CommandIDs.findAndReplace, {
    label: 'Find and Replace...',
    execute: () => {
      let widget = tracker.currentWidget;
      if (!widget) {
        return;
      }
      let editor = widget.editor as CodeMirrorEditor;
      editor.execCommand('replace');
    },
    isEnabled
  });

  commands.addCommand(CommandIDs.changeMode, {
    label: args => args['name'] as string,
    execute: args => {
      let name = args['name'] as string;
      let widget = tracker.currentWidget;
      if (name && widget) {
        let spec = Mode.findByName(name);
        if (spec) {
          widget.model.mimeType = spec.mime;
        }
      }
    },
    isEnabled,
    isToggled: args => {
      let widget = tracker.currentWidget;
      if (!widget) {
        return false;
      }
      let mime = widget.model.mimeType;
      let spec = Mode.findByMIME(mime);
      let name = spec && spec.name;
      return args['name'] === name;
    }
  });

  Mode.getModeInfo().sort((a, b) => {
    let aName = a.name || '';
    let bName = b.name || '';
    return aName.localeCompare(bName);
  }).forEach(spec => {
    // Avoid mode name with a curse word.
    if (spec.mode.indexOf('brainf') === 0) {
      return;
    }
    modeMenu.addItem({
      command: CommandIDs.changeMode,
      args: {...spec}
    });
  });

  [
   'jupyter', 'default', 'abcdef', 'base16-dark', 'base16-light',
   'hopscotch', 'material', 'mbo', 'mdn-like', 'seti', 'solarized dark',
   'solarized light', 'the-matrix', 'xq-light', 'zenburn'
  ].forEach(name => themeMenu.addItem({
    command: CommandIDs.changeTheme,
    args: { theme: name }
  }));

  ['default', 'sublime', 'vim', 'emacs'].forEach(name => {
    keyMapMenu.addItem({
      command: CommandIDs.changeKeyMap,
      args: { keyMap: name }
    });
  });

  // Add some of the editor settings to the settings menu.
  mainMenu.settingsMenu.addGroup([
    { type: 'submenu' as Menu.ItemType, submenu: keyMapMenu },
    { type: 'submenu' as Menu.ItemType, submenu: themeMenu }
  ], 10);

  // Add the syntax highlighting submenu to the `View` menu.
  mainMenu.viewMenu.addGroup([{ type: 'submenu', submenu: modeMenu }], 40);

  // Add find-replace capabilities to the edit menu.
  mainMenu.editMenu.findReplacers.add({
    tracker,
    find: (widget: FileEditor) => {
      let editor = widget.editor as CodeMirrorEditor;
      editor.execCommand('find');
    },
    findAndReplace: (widget: FileEditor) => {
      let editor = widget.editor as CodeMirrorEditor;
      editor.execCommand('replace');
    }
  } as IEditMenu.IFindReplacer<FileEditor>);
}
