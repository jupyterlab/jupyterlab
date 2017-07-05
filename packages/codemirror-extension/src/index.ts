// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JSONObject
} from '@phosphor/coreutils';

import {
  Menu
} from '@phosphor/widgets';

import {
  JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  ICommandPalette, IMainMenu
} from '@jupyterlab/apputils';

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
  IEditorTracker
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
};


/* tslint:disable */
/**
 * The commands plugin setting schema.
 *
 * #### Notes
 * This will eventually reside in its own settings file.
 */
const schema = {
  "jupyter.lab.setting-icon-class": "jp-TextEditorIcon",
  "jupyter.lab.setting-icon-label": "CodeMirror",
  "title": "CodeMirror",
  "description": "Text editor settings for all CodeMirror editors.",
  "properties": {
    "keyMap": { "type": "string", "title": "Key Map", "default": "default" },
    "theme": { "type": "string", "title": "Theme", "default": "default" }
  },
  "type": "object"
};
/* tslint:enable */

/**
 * The editor services.
 */
export
const servicesPlugin: JupyterLabPlugin<IEditorServices> = {
  id: IEditorServices.name,
  provides: IEditorServices,
  activate: (): IEditorServices => editorServices
};


/**
 * The editor commands.
 */
export
const commandsPlugin: JupyterLabPlugin<void> = {
  id: 'jupyter.services.codemirror-commands',
  requires: [IEditorTracker, IMainMenu, ICommandPalette, IStateDB, ISettingRegistry],
  activate: activateEditorCommands,
  autoStart: true
};


/**
 * Export the plugins as default.
 */
const plugins: JupyterLabPlugin<any>[] = [commandsPlugin, servicesPlugin];
export default plugins;


/**
 * Set up the editor widget menu and commands.
 */
function activateEditorCommands(app: JupyterLab, tracker: IEditorTracker, mainMenu: IMainMenu, palette: ICommandPalette, state: IStateDB, settingRegistry: ISettingRegistry): void {
  const { commands, restored } = app;
  const { id } = commandsPlugin;
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

  // Preload the settings schema into the registry. This is deprecated.
  settingRegistry.preload(id, schema);

  // Fetch the initial state of the settings.
  Promise.all([settingRegistry.load(id), restored]).then(([settings]) => {
    updateSettings(settings);
    updateTracker();
    settings.changed.connect(() => {
      updateSettings(settings);
      updateTracker();
    });
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

  // Update the command registry when the codemirror state changes.
  tracker.currentChanged.connect(() => {
    if (tracker.size <= 1) {
      commands.notifyCommandChanged(CommandIDs.changeKeyMap);
    }
  });

  /**
   * A test for whether the tracker has an active widget.
   */
  function hasWidget(): boolean {
    return tracker.currentWidget !== null;
  }

  /**
   * Create a menu for the editor.
   */
  function createMenu(): Menu {
    const menu = new Menu({ commands });
    const themeMenu = new Menu({ commands });
    const keyMapMenu = new Menu({ commands });
    const modeMenu = new Menu({ commands });
    const tabMenu = new Menu({ commands });

    menu.title.label = 'Editor';
    themeMenu.title.label = 'Theme';
    keyMapMenu.title.label = 'Key Map';
    modeMenu.title.label = 'Language';
    tabMenu.title.label = 'Tabs';

    commands.addCommand(CommandIDs.changeTheme, {
      label: args => args['theme'] as string,
      execute: args => {
        theme = args['theme'] as string || theme;
        tracker.forEach(widget => {
          if (widget.editor instanceof CodeMirrorEditor) {
            let cm = widget.editor.editor;
            cm.setOption('theme', theme);
          }
        });
        return settingRegistry.set(id, 'theme', theme);
      },
      isEnabled: hasWidget,
      isToggled: args => args['theme'] === theme
    });

    commands.addCommand(CommandIDs.changeKeyMap, {
      label: args => {
        let title = args['keyMap'] as string;
        return title === 'sublime' ? 'Sublime Text' : title;
      },
      execute: args => {
        keyMap = args['keyMap'] as string || keyMap;
        tracker.forEach(widget => {
          if (widget.editor instanceof CodeMirrorEditor) {
            let cm = widget.editor.editor;
            cm.setOption('keyMap', keyMap);
          }
        });
        return settingRegistry.set(id, 'keyMap', keyMap);
      },
      isEnabled: hasWidget,
      isToggled: args => args['keyMap'] === keyMap
    });

    commands.addCommand(CommandIDs.changeMode, {
      label: args => args['name'] as string,
      execute: args => {
        let mode = args['mode'] as string;
        if (mode) {
          let widget = tracker.currentWidget;
          let spec = Mode.findByName(mode);
          if (spec) {
            widget.model.mimeType = spec.mime;
          }
        }
      },
      isEnabled: hasWidget,
      isToggled: args => {
        let widget = tracker.currentWidget;
        if (!widget) {
          return false;
        }
        let mime = widget.model.mimeType;
        let spec = Mode.findByMIME(mime);
        let mode = spec && spec.mode;
        return args['mode'] === mode;
      }
    });

    Mode.getModeInfo().sort((a, b) => {
      return a.name.localeCompare(b.name);
    }).forEach(spec => {
      modeMenu.addItem({
        command: CommandIDs.changeMode,
        args: {...spec}
      });
    });

    [
     'jupyter', 'default', 'abcdef', 'base16-dark', 'base16-light',
     'hopscotch', 'material', 'mbo', 'mdn-like', 'seti', 'the-matrix',
     'xq-light', 'zenburn'
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

    let args: JSONObject = {
      insertSpaces: false, size: 4, name: 'Indent with Tab'
    };
    let command = 'fileeditor:change-tabs';
    tabMenu.addItem({ command, args });
    palette.addItem({ command, args, category: 'Editor' });

    for (let size of [1, 2, 4, 8]) {
      let args: JSONObject = {
        insertSpaces: true, size, name: `Spaces: ${size} `
      };
      tabMenu.addItem({ command, args });
      palette.addItem({ command, args, category: 'Editor' });
    }

    menu.addItem({ type: 'submenu', submenu: modeMenu });
    menu.addItem({ type: 'submenu', submenu: tabMenu });
    menu.addItem({ type: 'separator' });
    menu.addItem({ command: 'fileeditor:toggle-line-numbers' });
    menu.addItem({ command: 'fileeditor:toggle-line-wrap' });
    menu.addItem({ command: 'fileeditor:toggle-match-brackets' });
    menu.addItem({ command: 'fileeditor:toggle-autoclosing-brackets' });
    menu.addItem({ type: 'submenu', submenu: keyMapMenu });
    menu.addItem({ type: 'submenu', submenu: themeMenu });

    return menu;
  }

  mainMenu.addMenu(createMenu(), { rank: 30 });

  [
    'editor:line-numbers',
    'editor:line-wrap',
    'editor:match-brackets',
    'editor-autoclosing-brackets',
    'editor:create-console',
    'editor:run-code'
  ].forEach(command => palette.addItem({ command, category: 'Editor' }));

}
