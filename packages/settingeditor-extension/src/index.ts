/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

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
  IInspector, InspectionHandler
} from '@jupyterlab/inspector';

import {
  RenderMime, defaultRendererFactories
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
  activate: (app: JupyterLab, restorer: ILayoutRestorer, registry: ISettingRegistry, editorServices: IEditorServices, state: IStateDB, inspector: IInspector) => {
    const { commands, shell } = app;
    const namespace = 'setting-editor';
    const factoryService = editorServices.factoryService;
    const editorFactory = factoryService.newInlineEditor.bind(factoryService);
    const tracker = new InstanceTracker<SettingEditor>({ namespace });

    let handler: InspectionHandler;
    let editor: SettingEditor;

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
        const when = app.restored;

        editor = new SettingEditor({
          commands, editorFactory, key, registry, state, when
        });

        tracker.add(editor);
        editor.id = namespace;
        editor.title.label = 'Settings';
        editor.title.iconClass = 'jp-SettingsIcon';
        editor.title.closable = true;
        shell.addToMainArea(editor);
        shell.activateById(editor.id);
      },
      label: 'Settings'
    });

    // Create an inspection handler for each setting editor that is created.
    if (inspector) {
      const rendermime = new RenderMime({
        initialFactories: defaultRendererFactories
      });

      tracker.widgetAdded.connect((sender, parent) => {
        const connector = parent.connector;

        handler = new InspectionHandler({ connector, rendermime });
        handler.editor = parent.source;

        // Listen for parent disposal.
        parent.disposed.connect(() => {
          if (handler) {
            handler.dispose();
            handler = null;
          }
          if (editor) {
            editor = null;
          }
        });
      });

      // Keep track of setting editors and set inspector source.
      app.shell.currentChanged.connect((sender, args) => {
        const widget = args.newValue;
        if (!widget || !tracker.has(widget)) {
          return;
        }

        if (handler) {
          inspector.source = handler;
        }
      });

    }

    return tracker;
  },
  requires: [ILayoutRestorer, ISettingRegistry, IEditorServices, IStateDB],
  optional: [IInspector],
  autoStart: true,
  provides: ISettingEditorTracker
};

export default plugin;
