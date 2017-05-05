// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JSONObject
} from '@phosphor/coreutils';

import {
  JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  ILayoutRestorer, InstanceTracker, IStateDB
} from '@jupyterlab/apputils';

import {
  IEditorServices
} from '@jupyterlab/codeeditor';

import {
  IDocumentRegistry
} from '@jupyterlab/docregistry';

import {
  IEditorTracker, EditorWidget, EditorWidgetFactory
} from '@jupyterlab/editorwidget';

import {
  ILauncher
} from '@jupyterlab/launcher';


/**
 * The class name for the text editor icon from the default theme.
 */
const EDITOR_ICON_CLASS = 'jp-ImageTextEditor';

/**
 * The name of the factory that creates editor widgets.
 */
const FACTORY = 'Editor';


/**
 * The command IDs used by the editorwidget plugin.
 */
namespace CommandIDs {
  export
  const lineNumbers = 'editor:line-numbers';

  export
  const wordWrap = 'editor:word-wrap';

  export
  const createConsole = 'editor:create-console';

  export
  const runCode = 'editor:run-code';
};


/**
 * The editor tracker extension.
 */
const plugin: JupyterLabPlugin<IEditorTracker> = {
  activate,
  id: 'jupyter.services.editor-tracker',
  requires: [IDocumentRegistry, ILayoutRestorer, IEditorServices, IStateDB],
  optional: [ILauncher],
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
function activate(app: JupyterLab, registry: IDocumentRegistry, restorer: ILayoutRestorer, editorServices: IEditorServices, state: IStateDB, launcher: ILauncher | null): IEditorTracker {
  const factory = new EditorWidgetFactory({
    editorServices,
    factoryOptions: {
      name: FACTORY,
      fileExtensions: ['*'],
      defaultFor: ['*']
    }
  });
  const { commands, shell } = app;
  const id = 'editor:settings';
  const tracker = new InstanceTracker<EditorWidget>({
    namespace: 'editor',
    shell
  });

  let lineNumbers = true;
  let wordWrap = true;

  // Handle state restoration.
  restorer.restore(tracker, {
    command: 'file-operations:open',
    args: widget => ({ path: widget.context.path, factory: FACTORY }),
    name: widget => widget.context.path
  });

  // Fetch the initial state of the settings.
  state.fetch(id).then(settings => {
    if (!settings) {
      return;
    }
    if (typeof settings['wordWrap'] === 'string') {
      commands.execute(CommandIDs.wordWrap, settings);
    }
    if (typeof settings['lineNumbers'] === 'string') {
      commands.execute(CommandIDs.lineNumbers, settings);
    }
  });

  /**
   * Save the editor widget settings state.
   */
  function saveState(): Promise<void> {
    return state.save(id, { lineNumbers, wordWrap });
  }

  factory.widgetCreated.connect((sender, widget) => {
    widget.title.icon = EDITOR_ICON_CLASS;
    // Notify the instance tracker if restore data needs to update.
    widget.context.pathChanged.connect(() => { tracker.save(widget); });
    tracker.add(widget);
    widget.editor.lineNumbers = lineNumbers;
    widget.editor.wordWrap = wordWrap;
  });
  registry.addWidgetFactory(factory);

  /**
   * Handle the settings of new widgets.
   */
  tracker.widgetAdded.connect((sender, widget) => {
    let editor = widget.editor;
    editor.lineNumbers = lineNumbers;
    editor.wordWrap = wordWrap;
  });

  /**
   * Toggle editor line numbers
   */
  function toggleLineNums(args: JSONObject): Promise<void> {
    lineNumbers = !lineNumbers;
    tracker.forEach(widget => {
      widget.editor.lineNumbers = lineNumbers;
    });
    return saveState();
  }

  /**
   * Toggle editor line wrap
   */
  function toggleLineWrap(args: JSONObject): Promise<void> {
    wordWrap = !wordWrap;
    tracker.forEach(widget => {
      widget.editor.wordWrap = wordWrap;
    });
    return saveState();
  }

  /**
   * A test for whether the tracker has an active widget.
   */
  function hasWidget(): boolean {
    return tracker.currentWidget !== null;
  }

  commands.addCommand(CommandIDs.lineNumbers, {
    execute: toggleLineNums,
    isEnabled: hasWidget,
    isToggled: () => { return lineNumbers; },
    label: 'Line Numbers'
  });

  commands.addCommand(CommandIDs.wordWrap, {
    execute: toggleLineWrap,
    isEnabled: hasWidget,
    isToggled: () => { return wordWrap; },
    label: 'Word Wrap'
  });

  commands.addCommand(CommandIDs.createConsole, {
    execute: args => {
      let widget = tracker.currentWidget;
      if (!widget) {
        return;
      }
      let options: JSONObject = {
        path: widget.context.path,
        preferredLanguage: widget.context.model.defaultKernelLanguage,
        activate: args['activate']
      };
      return commands.execute('console:create', options);
    },
    isEnabled: hasWidget,
    label: 'Create Console for Editor'
  });

  commands.addCommand(CommandIDs.runCode, {
    execute: args => {
      let widget = tracker.currentWidget;
      if (!widget) {
        return;
      }
      // Get the selected code from the editor.
      const editor = widget.editor;
      const selection = editor.getSelection();
      const start = editor.getOffsetAt(selection.start);
      const end = editor.getOffsetAt(selection.end);
      const options: JSONObject = {
        path: widget.context.path,
        code: editor.model.value.text.substring(start, end),
        activate: args['activate']
      };
      return commands.execute('console:inject', options);
    },
    isEnabled: hasWidget,
    label: 'Run Code'
  });

  // Add a launcher item if the launcher is available.
  if (launcher) {
    launcher.add({
      args: { creatorName: 'Text File' },
      command: 'file-operations:create-from',
      name: 'Text Editor'
    });
  }

  return tracker;
}
