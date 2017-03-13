// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  ILayoutRestorer, InstanceTracker
} from '../apputils';

import {
  IEditorServices
} from '../codeeditor';

import {
  IDocumentRegistry
} from '../docregistry';

import {
  IEditorTracker, EditorWidget, EditorWidgetFactory, addDefaultCommands
} from '../editorwidget';

import {
  CommandIDs as FileBrowserCommandIDs
} from '../filebrowser';

import {
  IEditorTracker, EditorWidget, EditorWidgetFactory, addDefaultCommands
} from './';


/**
 * The command IDs used by the editor plugin.
 */
namespace CommandIDs {
  export
  const lineNumbers = 'editor:line-numbers';

  export
  const lineWrap = 'editor:line-wrap';

  export
  const createConsole = 'editor:create-console';

  export
  const runCode = 'editor:run-code';
};
>>>>>>> 3e46b197... Clean up imports:src/editorwidget-extension/index.ts


/**
 * The class name for the text editor icon from the default theme.
 */
const EDITOR_ICON_CLASS = 'jp-ImageTextEditor';

/**
 * The name of the factory that creates editor widgets.
 */
const FACTORY = 'Editor';


/**
 * The editor tracker extension.
 */
const plugin: JupyterLabPlugin<IEditorTracker> = {
  activate,
  id: 'jupyter.services.editor-tracker',
  requires: [IDocumentRegistry, ILayoutRestorer, IEditorServices],
  provides: IEditorTracker,
  autoStart: true
};

/**
 * Export the plugins as default.
 */
export default plugin;


/**
 * Activate the editor tracker plugin.
 */
function activate(app: JupyterLab, registry: IDocumentRegistry, restorer: ILayoutRestorer, editorServices: IEditorServices): IEditorTracker {
  const factory = new EditorWidgetFactory({
    editorServices,
    factoryOptions: {
      name: FACTORY,
      fileExtensions: ['*'],
      defaultFor: ['*']
    }
  });
  const shell = app.shell;
  const tracker = new InstanceTracker<EditorWidget>({
    namespace: 'editor',
    shell
  });

  // Handle state restoration.
  restorer.restore(tracker, {
    command: FileBrowserCommandIDs.open,
    args: widget => ({ path: widget.context.path, factory: FACTORY }),
    name: widget => widget.context.path
  });

  factory.widgetCreated.connect((sender, widget) => {
    widget.title.icon = EDITOR_ICON_CLASS;
    // Notify the instance tracker if restore data needs to update.
    widget.context.pathChanged.connect(() => { tracker.save(widget); });
    tracker.add(widget);
  });
  registry.addWidgetFactory(factory);

  addDefaultCommands(tracker, app.commands);
  return tracker;
}
