/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
/**
 * @packageDocumentation
 * @module settingeditor-extension
 */

import {
  ILabStatus,
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
import { FormComponentRegistry, IFormComponentRegistry } from '@jupyterlab/formeditor';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import {
  ISettingEditorTracker,
  renderCheckbox,
  renderDropdown,
  renderStringArray,
  renderTextInput,
  SettingEditor,
} from '@jupyterlab/settingeditor';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { IStateDB } from '@jupyterlab/statedb';
import { ITranslator } from '@jupyterlab/translation';
import { saveIcon, settingsIcon } from '@jupyterlab/ui-components';

// import { IDisposable } from '@lumino/disposable';

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
const trackerPlugin: JupyterFrontEndPlugin<ISettingEditorTracker> = {
  id: '@jupyterlab/settingeditor-extension:plugin',
  requires: [
    ILayoutRestorer,
    ISettingRegistry,
    IEditorServices,
    IStateDB,
    IRenderMimeRegistry,
    ILabStatus,
    ITranslator,
    IFormComponentRegistry
  ],
  optional: [ICommandPalette, IThemeManager],
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
  translator: ITranslator,
  editorRegistry: IFormComponentRegistry,
  palette: ICommandPalette | null,
  themeManager?: IThemeManager
): ISettingEditorTracker {
  const trans = translator.load('jupyterlab');
  const { commands, shell } = app;
  const namespace = 'setting-editor';
  // const factoryService = editorServices.factoryService;
  // const editorFactory = factoryService.newInlineEditor;
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

  editorRegistry.addRenderer('textinput', renderTextInput);
  editorRegistry.addRenderer('number', renderTextInput);
  editorRegistry.addRenderer('integer', renderTextInput);
  editorRegistry.addRenderer('string', renderTextInput);
  editorRegistry.addRenderer('dropdown', renderDropdown);
  editorRegistry.addRenderer('boolean', renderCheckbox);
  editorRegistry.addRenderer('array', renderStringArray);

  commands.addCommand(CommandIDs.open, {
    execute: () => {
      if (tracker.currentWidget) {
        shell.activateById(tracker.currentWidget.id);
        return;
      }

      const key = trackerPlugin.id;
      const when = app.restored;

      editor = new SettingEditor({
        editorServices,
        status,
        themeManager,
        key,
        registry,
        state,
        translator,
        editorRegistry,
        when
      });

      // let disposable: IDisposable | null = null;
      // Notify the command registry when the visibility status of the setting
      // editor's commands change. The setting editor toolbar listens for this
      // signal from the command registry.
      // editor.commandsChanged.connect((sender: any, args: string[]) => {
      //   args.forEach(id => {
      //     commands.notifyCommandChanged(id);
      //   });
      //   if (editor.canSaveRaw) {
      //     if (!disposable) {
      //       disposable = status.setDirty();
      //     }
      //   } else if (disposable) {
      //     disposable.dispose();
      //     disposable = null;
      //   }
      //   editor.disposed.connect(() => {
      //     if (disposable) {
      //       disposable.dispose();
      //     }
      //   });
      // });

      editor.id = namespace;
      editor.title.icon = settingsIcon;
      editor.title.label = trans.__('Settings');

      const main = new MainAreaWidget({ content: editor });
      void tracker.add(main);
      shell.add(main);
    },
    label: trans.__('Advanced Settings Editor')
  });
  if (palette) {
    palette.addItem({
      category: trans.__('Settings'),
      command: CommandIDs.open
    });
  }

  // commands.addCommand(CommandIDs.revert, {
  //   execute: () => {
  //     tracker.currentWidget?.content.revert();
  //   },
  //   icon: undoIcon,
  //   label: trans.__('Revert User Settings'),
  //   isEnabled: () => tracker.currentWidget?.content.canRevertRaw ?? false
  // });

  commands.addCommand(CommandIDs.save, {
    execute: () => tracker.currentWidget?.content.save(),
    icon: saveIcon,
    label: trans.__('Save User Settings'),
    isEnabled: () => true
  });

  return tracker;
}

const activateRegistry = (app: JupyterFrontEnd): IFormComponentRegistry => {
  return new FormComponentRegistry();
};

const registryPlugin: JupyterFrontEndPlugin<IFormComponentRegistry> = {
  id: '@jupyterlab/settingeditor-extension:registry-plugin',
  provides: IFormComponentRegistry,
  autoStart: true,
  activate: activateRegistry
};

export default [trackerPlugin, registryPlugin];
