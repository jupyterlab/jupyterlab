/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  ILayoutRestorer, JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  ICommandPalette, InstanceTracker, MainAreaWidget
} from '@jupyterlab/apputils';

import {
  IEditorServices
} from '@jupyterlab/codeeditor';

import {
  ISettingRegistry, IStateDB
} from '@jupyterlab/coreutils';

import {
  IRenderMimeRegistry
} from '@jupyterlab/rendermime';

import {
  ISettingEditorTracker, SettingEditor
} from '@jupyterlab/settingeditor';


/**
 * The command IDs used by the setting editor.
 */
namespace CommandIDs {
  export
  const debug = 'settingeditor:debug';

  export
  const open = 'settingeditor:open';

  export
  const revert = 'settingeditor:revert';

  export
  const save = 'settingeditor:save';
}


/**
 * The default setting editor extension.
 */
const plugin: JupyterLabPlugin<ISettingEditorTracker> = {
  id: '@jupyterlab/settingeditor-extension:plugin',
  requires: [
    ILayoutRestorer,
    ISettingRegistry,
    IEditorServices,
    IStateDB,
    IRenderMimeRegistry,
    ICommandPalette
  ],
  autoStart: true,
  provides: ISettingEditorTracker,
  activate
};


/**
 * Activate the setting editor extension.
 */
function activate(app: JupyterLab, restorer: ILayoutRestorer, registry: ISettingRegistry, editorServices: IEditorServices, state: IStateDB, rendermime: IRenderMimeRegistry, palette: ICommandPalette): ISettingEditorTracker {
  const { commands, shell } = app;
  const namespace = 'setting-editor';
  const factoryService = editorServices.factoryService;
  const editorFactory = factoryService.newInlineEditor;
  const tracker = new InstanceTracker<MainAreaWidget<SettingEditor>>({ namespace });
  let editor: SettingEditor;

  // Handle state restoration.
  restorer.restore(tracker, {
    command: CommandIDs.open,
    args: widget => ({ }),
    name: widget => namespace
  });

  commands.addCommand(CommandIDs.debug, {
    execute: () => { tracker.currentWidget.content.toggleDebug(); },
    iconClass: 'jp-MaterialIcon jp-BugIcon',
    label: 'Debug User Settings In Inspector',
    isToggled: () => tracker.currentWidget.content.isDebugVisible
  });

  commands.addCommand(CommandIDs.open, {
    execute: () => {
      if (tracker.currentWidget) {
        shell.activateById(tracker.currentWidget.id);
        return;
      }

      const key = plugin.id;
      const when = app.restored;

      editor = new SettingEditor({
        commands: {
          registry: commands,
          debug: CommandIDs.debug,
          revert: CommandIDs.revert,
          save: CommandIDs.save
        },
        editorFactory, key, registry, rendermime, state, when
      });

      // Notify the command registry when the visibility status of the setting
      // editor's commands change. The setting editor toolbar listens for this
      // signal from the command registry.
      editor.commandsChanged.connect((sender: any, args: string[]) => {
        args.forEach(id => { commands.notifyCommandChanged(id); });
      });

      editor.id = namespace;
      editor.title.label = 'Settings';
      editor.title.iconClass = 'jp-SettingsIcon';

      let main = new MainAreaWidget({ content: editor });
      tracker.add(main);
      shell.addToMainArea(main);
    },
    label: 'Advanced Settings Editor'
  });
  palette.addItem({ category: 'Settings', command: CommandIDs.open });

  commands.addCommand(CommandIDs.revert, {
    execute: () => { tracker.currentWidget.content.revert(); },
    iconClass: 'jp-MaterialIcon jp-UndoIcon',
    label: 'Revert User Settings',
    isEnabled: () => tracker.currentWidget.content.canRevertRaw
  });

  commands.addCommand(CommandIDs.save, {
    execute: () => tracker.currentWidget.content.save(),
    iconClass: 'jp-MaterialIcon jp-SaveIcon',
    label: 'Save User Settings',
    isEnabled: () => tracker.currentWidget.content.canSaveRaw
  });

  return tracker;
}
export default plugin;
