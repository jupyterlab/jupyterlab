// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  AttachedProperty
} from '@phosphor/properties';

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  IEditorServices
} from '../codeeditor';

import {
  InstanceTracker
} from '../common/instancetracker';

import {
  CommandIDs as ConsoleCommandIDs
} from '../console';

import {
  IDocumentRegistry
} from '../docregistry';

import {
  CommandIDs as FileBrowserCommandIDs
} from '../filebrowser';

import {
  IInstanceRestorer
} from '../instancerestorer';

import {
  IEditorTracker, EditorWidget, EditorWidgetFactory, CommandIDs
} from './';


/**
 * The class name for all main area portrait tab icons.
 */
const PORTRAIT_ICON_CLASS = 'jp-MainAreaPortraitIcon';

/**
 * The class name for the text editor icon from the default theme.
 */
const EDITOR_ICON_CLASS = 'jp-ImageTextEditor';

/**
 * The name of the factory that creates editor widgets.
 */
const FACTORY = 'Editor';


/**
 * The editor handler extension.
 */
const plugin: JupyterLabPlugin<IEditorTracker> = {
  activate,
  id: 'jupyter.services.editor-handler',
  requires: [IDocumentRegistry, IInstanceRestorer, IEditorServices],
  provides: IEditorTracker,
  autoStart: true
};


/**
 * Export the plugin as default.
 */
export default plugin;


/**
 * Sets up the editor widget
 */
function activate(app: JupyterLab, registry: IDocumentRegistry, restorer: IInstanceRestorer, editorServices: IEditorServices): IEditorTracker {
  const factory = new EditorWidgetFactory({
    editorServices,
    factoryOptions: {
      name: FACTORY,
      fileExtensions: ['*'],
      defaultFor: ['*']
    }
  });
  const tracker = new InstanceTracker<EditorWidget>({ namespace: 'editor' });

  // Handle state restoration.
  restorer.restore(tracker, {
    command: FileBrowserCommandIDs.open,
    args: widget => ({ path: widget.context.path, factory: FACTORY }),
    name: widget => widget.context.path
  });

  factory.widgetCreated.connect((sender, widget) => {
    widget.title.icon = `${PORTRAIT_ICON_CLASS} ${EDITOR_ICON_CLASS}`;
    // Notify the instance tracker if restore data needs to update.
    widget.context.pathChanged.connect(() => { tracker.save(widget); });
    tracker.add(widget);
  });
  registry.addWidgetFactory(factory);

  /**
   * Toggle editor line numbers
   */
  function toggleLineNums() {
    if (tracker.currentWidget) {
      let editor = tracker.currentWidget.editor;
      editor.lineNumbers = !editor.lineNumbers;
    }
  }

  /**
   * Toggle editor line wrap
   */
  function toggleLineWrap() {
    if (tracker.currentWidget) {
      let editor = tracker.currentWidget.editor;
      editor.wordWrap = !editor.wordWrap;
    }
  }

  /**
   * An attached property for the session id associated with an editor widget.
   */
  const sessionIdProperty = new AttachedProperty<EditorWidget, string>({
    name: 'sessionId'
  });

  let commands = app.commands;

  commands.addCommand(CommandIDs.lineNumbers, {
    execute: () => { toggleLineNums(); },
    label: 'Toggle Line Numbers'
  });

  commands.addCommand(CommandIDs.lineWrap, {
    execute: () => { toggleLineWrap(); },
    label: 'Toggle Line Wrap'
  });

  commands.addCommand(CommandIDs.createConsole, {
    execute: () => {
      let widget = tracker.currentWidget;
      if (!widget) {
        return;
      }
      let options: any = {
        path: widget.context.path,
        preferredLanguage: widget.context.model.defaultKernelLanguage
      };
      return commands.execute(ConsoleCommandIDs.create, options)
        .then(id => { sessionIdProperty.set(widget, id); });
    },
    label: 'Create Console for Editor'
  });

  commands.addCommand(CommandIDs.runCode, {
    execute: () => {
      let widget = tracker.currentWidget;
      if (!widget) {
        return;
      }
      // Get the session id.
      let id = sessionIdProperty.get(widget);
      if (!id) {
        return;
      }
      // Get the selected code from the editor.
      const editor = widget.editor;
      const selection = editor.getSelection();
      const start = editor.getOffsetAt(selection.start);
      const end = editor.getOffsetAt(selection.end);
      const code = editor.model.value.text.substring(start, end);
      return commands.execute(ConsoleCommandIDs.inject, { id, code });
    },
    label: 'Run Code'
  });

  return tracker;
}
