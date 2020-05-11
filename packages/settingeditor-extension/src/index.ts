/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
  ILabStatus
} from '@jupyterlab/application';
import {
  ICommandPalette,
  MainAreaWidget,
  WidgetTracker
} from '@jupyterlab/apputils';
import { IEditorServices } from '@jupyterlab/codeeditor';
import { IStateDB } from '@jupyterlab/statedb';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import {
  ISettingEditorTracker,
  SettingEditor
} from '@jupyterlab/settingeditor';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { saveIcon, settingsIcon, undoIcon } from '@jupyterlab/ui-components';
import { IDisposable } from '@lumino/disposable';

/**
 * The command IDs used by the setting editor.
 */
namespace CommandIDs {
  export const open = 'settingeditor:open';

  export const revert = 'settingeditor:revert';

  export const save = 'settingeditor:save';
}

/**
 * The default setting editor extension.
 */
const plugin: JupyterFrontEndPlugin<ISettingEditorTracker> = {
  id: '@jupyterlab/settingeditor-extension:plugin',
  requires: [
    ILayoutRestorer,
    ISettingRegistry,
    IEditorServices,
    IStateDB,
    IRenderMimeRegistry,
    ILabStatus
  ],
  optional: [ICommandPalette],
  autoStart: true,
  provides: ISettingEditorTracker,
  activate
};

/**
 * Activate the setting editor extension.
 */
function activate(
  app: JupyterFrontEnd,
  restorer: ILayoutRestorer,
  registry: ISettingRegistry,
  editorServices: IEditorServices,
  state: IStateDB,
  rendermime: IRenderMimeRegistry,
  status: ILabStatus,
  palette: ICommandPalette | null
): ISettingEditorTracker {
  const { commands, shell } = app;
  const namespace = 'setting-editor';
  const factoryService = editorServices.factoryService;
  const editorFactory = factoryService.newInlineEditor;
  const tracker = new WidgetTracker<MainAreaWidget<SettingEditor>>({
    namespace
  });
  let editor: SettingEditor;

  // Handle state restoration.
  void restorer.restore(tracker, {
    command: CommandIDs.open,
    args: widget => ({}),
    name: widget => namespace
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
          revert: CommandIDs.revert,
          save: CommandIDs.save
        },
        editorFactory,
        key,
        registry,
        rendermime,
        state,
        when
      });

      let disposable: IDisposable | null = null;
      // Notify the command registry when the visibility status of the setting
      // editor's commands change. The setting editor toolbar listens for this
      // signal from the command registry.
      editor.commandsChanged.connect((sender: any, args: string[]) => {
        args.forEach(id => {
          commands.notifyCommandChanged(id);
        });
        if (editor.canSaveRaw) {
          if (!disposable) {
            disposable = status.setDirty();
          }
        } else if (disposable) {
          disposable.dispose();
          disposable = null;
        }
        editor.disposed.connect(() => {
          if (disposable) {
            disposable.dispose();
          }
        });
      });

      editor.id = namespace;
      editor.title.icon = settingsIcon;
      editor.title.label = 'Settings';

      const main = new MainAreaWidget({ content: editor });
      void tracker.add(main);
      shell.add(main);
    },
    label: 'Advanced Settings Editor'
  });
  if (palette) {
    palette.addItem({ category: 'Settings', command: CommandIDs.open });
  }

  commands.addCommand(CommandIDs.revert, {
    execute: () => {
      tracker.currentWidget?.content.revert();
    },
    icon: undoIcon,
    label: 'Revert User Settings',
    isEnabled: () => tracker.currentWidget?.content.canRevertRaw ?? false
  });

  commands.addCommand(CommandIDs.save, {
    execute: () => tracker.currentWidget?.content.save(),
    icon: saveIcon,
    label: 'Save User Settings',
    isEnabled: () => tracker.currentWidget?.content.canSaveRaw ?? false
  });

  return tracker;
}
export default plugin;
