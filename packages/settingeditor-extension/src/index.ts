/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import '../style/settingeditor.css';

import {
  ILayoutRestorer, JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  InstanceTracker
} from '@jupyterlab/apputils';

import {
  IEditorServices
} from '@jupyterlab/codeeditor';

import {
  ISettingRegistry, IStateDB
} from '@jupyterlab/coreutils';

import {
  SettingEditor
} from './settingeditor';


/**
 * The command IDs used by the setting editor.
 */
namespace CommandIDs {
  export
  const open = 'settingeditor:open';
};


/**
 * The default setting editor extension.
 */
const plugin: JupyterLabPlugin<void> = {
  activate: (app: JupyterLab, restorer: ILayoutRestorer, registry: ISettingRegistry, editorServices: IEditorServices, state: IStateDB) => {
    const { commands, shell } = app;
    const namespace = 'setting-editor';
    const factoryService = editorServices.factoryService;
    const editorFactory = factoryService.newInlineEditor.bind(factoryService);
    const tracker = new InstanceTracker<SettingEditor>({ namespace });

    // Handle state restoration.
    restorer.restore(tracker, {
      command: CommandIDs.open,
      args: widget => ({ }),
      name: widget => namespace
    });

    commands.addCommand(CommandIDs.open, {
      execute: () => {
        if (tracker.currentWidget) {
          shell.activateById(tracker.currentWidget.id);
          return;
        }

        const key = plugin.id;
        const editor = new SettingEditor({
          editorFactory, key, registry, state
        });

        tracker.add(editor);
        editor.id = namespace;
        editor.title.label = 'Settings';
        editor.title.closable = true;
        shell.addToMainArea(editor);
        shell.activateById(editor.id);
      },
      label: 'Settings'
    });
  },
  id: 'jupyter.extensions.setting-editor',
  requires: [ILayoutRestorer, ISettingRegistry, IEditorServices, IStateDB],
  autoStart: true
};

export default plugin;
