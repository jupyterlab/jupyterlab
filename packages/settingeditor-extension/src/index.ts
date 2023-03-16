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
  MainAreaWidget,
  WidgetTracker
} from '@jupyterlab/apputils';
import { IEditorServices } from '@jupyterlab/codeeditor';
import {
  CommandToolbarButton,
  IFormRendererRegistry,
  launchIcon,
  Toolbar
} from '@jupyterlab/ui-components';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import {
  IJSONSettingEditorTracker,
  ISettingEditorTracker
} from '@jupyterlab/settingeditor/lib/tokens';
import type {
  JsonSettingEditor,
  SettingsEditor
} from '@jupyterlab/settingeditor';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { IStateDB } from '@jupyterlab/statedb';
import { ITranslator } from '@jupyterlab/translation';
import { saveIcon, settingsIcon, undoIcon } from '@jupyterlab/ui-components';
import { IDisposable } from '@lumino/disposable';

/**
 * The command IDs used by the setting editor.
 */
namespace CommandIDs {
  export const open = 'settingeditor:open';

  export const openJSON = 'settingeditor:open-json';

  export const revert = 'settingeditor:revert';

  export const save = 'settingeditor:save';
}

type SettingEditorType = 'ui' | 'json';

/**
 * The default setting editor extension.
 */
const plugin: JupyterFrontEndPlugin<ISettingEditorTracker> = {
  id: '@jupyterlab/settingeditor-extension:form-ui',
  requires: [
    ISettingRegistry,
    IStateDB,
    ITranslator,
    IFormRendererRegistry,
    ILabStatus
  ],
  optional: [ILayoutRestorer, ICommandPalette, IJSONSettingEditorTracker],
  autoStart: true,
  provides: ISettingEditorTracker,
  activate
};

/**
 * Activate the setting editor extension.
 */
function activate(
  app: JupyterFrontEnd,
  registry: ISettingRegistry,
  state: IStateDB,
  translator: ITranslator,
  editorRegistry: IFormRendererRegistry,
  status: ILabStatus,
  restorer: ILayoutRestorer | null,
  palette: ICommandPalette | null,
  jsonEditor: IJSONSettingEditorTracker | null
): ISettingEditorTracker {
  const trans = translator.load('jupyterlab');
  const { commands, shell } = app;
  const namespace = 'setting-editor';
  const tracker = new WidgetTracker<MainAreaWidget<SettingsEditor>>({
    namespace
  });

  // Handle state restoration.
  if (restorer) {
    void restorer.restore(tracker, {
      command: CommandIDs.open,
      args: widget => ({}),
      name: widget => namespace
    });
  }

  const openUi = async (args: { query: string }) => {
    if (tracker.currentWidget && !tracker.currentWidget.isDisposed) {
      if (!tracker.currentWidget.isAttached) {
        shell.add(tracker.currentWidget, 'main', { type: 'Settings' });
      }
      shell.activateById(tracker.currentWidget.id);
      return;
    }

    const key = plugin.id;

    const { SettingsEditor } = await import('@jupyterlab/settingeditor');

    const editor = new MainAreaWidget<SettingsEditor>({
      content: new SettingsEditor({
        editorRegistry,
        key,
        registry,
        state,
        commands,
        toSkip: [
          '@jupyterlab/application-extension:context-menu',
          '@jupyterlab/mainmenu-extension:plugin'
        ],
        translator,
        status,
        query: args.query as string
      })
    });

    if (jsonEditor) {
      editor.toolbar.addItem('spacer', Toolbar.createSpacerItem());
      editor.toolbar.addItem(
        'open-json-editor',
        new CommandToolbarButton({
          commands,
          id: CommandIDs.openJSON,
          icon: launchIcon,
          label: trans.__('JSON Settings Editor')
        })
      );
    }

    editor.id = namespace;
    editor.title.icon = settingsIcon;
    editor.title.label = trans.__('Settings');
    editor.title.closable = true;

    void tracker.add(editor);
    shell.add(editor, 'main', { type: 'Settings' });
  };

  commands.addCommand(CommandIDs.open, {
    execute: async (args: {
      query?: string;
      settingEditorType?: SettingEditorType;
    }) => {
      if (args.settingEditorType === 'ui') {
        void commands.execute(CommandIDs.open, { query: args.query ?? '' });
      } else if (args.settingEditorType === 'json') {
        void commands.execute(CommandIDs.openJSON);
      } else {
        void registry.load(plugin.id).then(settings => {
          (settings.get('settingEditorType').composite as SettingEditorType) ===
          'json'
            ? void commands.execute(CommandIDs.openJSON)
            : void openUi({ query: args.query ?? '' });
        });
      }
    },
    label: args => {
      if (args.label) {
        return args.label as string;
      }
      return trans.__('Settings Editor');
    }
  });

  if (palette) {
    palette.addItem({
      category: trans.__('Settings'),
      command: CommandIDs.open,
      args: { settingEditorType: 'ui' }
    });
  }

  return tracker;
}

/**
 * The default setting editor extension.
 */
const jsonPlugin: JupyterFrontEndPlugin<IJSONSettingEditorTracker> = {
  id: '@jupyterlab/settingeditor-extension:plugin',
  requires: [
    ISettingRegistry,
    IEditorServices,
    IStateDB,
    IRenderMimeRegistry,
    ILabStatus,
    ITranslator
  ],
  optional: [ILayoutRestorer, ICommandPalette],
  autoStart: true,
  provides: IJSONSettingEditorTracker,
  activate: activateJSON
};

/**
 * Activate the setting editor extension.
 */
function activateJSON(
  app: JupyterFrontEnd,
  registry: ISettingRegistry,
  editorServices: IEditorServices,
  state: IStateDB,
  rendermime: IRenderMimeRegistry,
  status: ILabStatus,
  translator: ITranslator,
  restorer: ILayoutRestorer | null,
  palette: ICommandPalette | null
): IJSONSettingEditorTracker {
  const trans = translator.load('jupyterlab');
  const { commands, shell } = app;
  const namespace = 'json-setting-editor';
  const factoryService = editorServices.factoryService;
  const editorFactory = factoryService.newInlineEditor;
  const tracker = new WidgetTracker<MainAreaWidget<JsonSettingEditor>>({
    namespace
  });

  // Handle state restoration.
  if (restorer) {
    void restorer.restore(tracker, {
      command: CommandIDs.openJSON,
      args: widget => ({}),
      name: widget => namespace
    });
  }

  commands.addCommand(CommandIDs.openJSON, {
    execute: async () => {
      if (tracker.currentWidget && !tracker.currentWidget.isDisposed) {
        if (!tracker.currentWidget.isAttached) {
          shell.add(tracker.currentWidget, 'main', {
            type: 'Advanced Settings'
          });
        }
        shell.activateById(tracker.currentWidget.id);
        return;
      }

      const key = plugin.id;
      const when = app.restored;

      const { JsonSettingEditor } = await import('@jupyterlab/settingeditor');

      const editor = new JsonSettingEditor({
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
        translator,
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

      const container = new MainAreaWidget<JsonSettingEditor>({
        content: editor
      });

      container.id = namespace;
      container.title.icon = settingsIcon;
      container.title.label = trans.__('Advanced Settings Editor');
      container.title.closable = true;

      void tracker.add(container);
      shell.add(container, 'main', { type: 'Advanced Settings' });
    },
    label: trans.__('Advanced Settings Editor')
  });
  if (palette) {
    palette.addItem({
      category: trans.__('Settings'),
      command: CommandIDs.openJSON
    });
  }

  commands.addCommand(CommandIDs.revert, {
    execute: () => {
      tracker.currentWidget?.content.revert();
    },
    icon: undoIcon,
    label: trans.__('Revert User Settings'),
    isEnabled: () => tracker.currentWidget?.content.canRevertRaw ?? false
  });

  commands.addCommand(CommandIDs.save, {
    execute: () => tracker.currentWidget?.content.save(),
    icon: saveIcon,
    label: trans.__('Save User Settings'),
    isEnabled: () => tracker.currentWidget?.content.canSaveRaw ?? false
  });

  return tracker;
}

export default [plugin, jsonPlugin];
