// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  ILayoutRestorer, InstanceTracker
} from '@jupyterlab/apputils';

import {
  ISettingRegistry
} from '@jupyterlab/coreutils';

import {
  IEditorServices
} from '@jupyterlab/codeeditor';

import {
   MarkdownCodeBlocks, PathExt
} from '@jupyterlab/coreutils';

import {
  IDocumentRegistry
} from '@jupyterlab/docregistry';

import {
  FileEditor, FileEditorFactory, IEditorTracker
} from '@jupyterlab/fileeditor';

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
 * The command IDs used by the fileeditor plugin.
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
  requires: [IDocumentRegistry, ILayoutRestorer, IEditorServices, ISettingRegistry],
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
function activate(app: JupyterLab, registry: IDocumentRegistry, restorer: ILayoutRestorer, editorServices: IEditorServices, settingRegistry: ISettingRegistry, launcher: ILauncher | null): IEditorTracker {
  const id = plugin.id;
  const namespace = 'editor';
  const factory = new FileEditorFactory({
    editorServices,
    factoryOptions: { name: FACTORY, fileExtensions: ['*'], defaultFor: ['*'] }
  });
  const { commands, restored } = app;
  const tracker = new InstanceTracker<FileEditor>({ namespace });
  const hasWidget = () => tracker.currentWidget !== null;

  let lineNumbers = true;
  let wordWrap = true;

  // Handle state restoration.
  restorer.restore(tracker, {
    command: 'file-operations:open',
    args: widget => ({ path: widget.context.path, factory: FACTORY }),
    name: widget => widget.context.path
  });

  /**
   * Update the setting values.
   */
  function updateSettings(settings: ISettingRegistry.ISettings): void {
    let cached = settings.get('lineNumbers') as boolean | null;
    lineNumbers = cached === null ? lineNumbers : !!cached;

    cached = settings.get('wordWrap') as boolean | null;
    wordWrap = cached === null ? wordWrap : !!cached;
  }

  /**
   * Update the settings of the current tracker instances.
   */
  function updateTracker(): void {
    tracker.forEach(widget => {
      widget.editor.lineNumbers = lineNumbers;
      widget.editor.wordWrap = wordWrap;
    });
  }

  // Fetch the initial state of the settings.
  Promise.all([settingRegistry.load(id), restored]).then(([settings]) => {
    updateSettings(settings);
    updateTracker();
    settings.changed.connect(() => {
      updateSettings(settings);
      updateTracker();
    });
  });

  factory.widgetCreated.connect((sender, widget) => {
    widget.title.icon = EDITOR_ICON_CLASS;

    // Notify the instance tracker if restore data needs to update.
    widget.context.pathChanged.connect(() => { tracker.save(widget); });
    tracker.add(widget);
    widget.editor.lineNumbers = lineNumbers;
    widget.editor.wordWrap = wordWrap;
  });
  registry.addWidgetFactory(factory);

  // Handle the settings of new widgets.
  tracker.widgetAdded.connect((sender, widget) => {
    const editor = widget.editor;
    editor.lineNumbers = lineNumbers;
    editor.wordWrap = wordWrap;
  });

  commands.addCommand(CommandIDs.lineNumbers, {
    execute: () => {
      lineNumbers = !lineNumbers;
      tracker.forEach(widget => { widget.editor.lineNumbers = lineNumbers; });
      return settingRegistry.set(id, 'lineNumbers', lineNumbers);
    },
    isEnabled: hasWidget,
    isToggled: () => lineNumbers,
    label: 'Line Numbers'
  });

  commands.addCommand(CommandIDs.wordWrap, {
    execute: () => {
      wordWrap = !wordWrap;
      tracker.forEach(widget => { widget.editor.wordWrap = wordWrap; });
      return settingRegistry.set(id, 'wordWrap', wordWrap);
    },
    isEnabled: hasWidget,
    isToggled: () => wordWrap,
    label: 'Word Wrap'
  });

  commands.addCommand(CommandIDs.createConsole, {
    execute: args => {
      const widget = tracker.currentWidget;

      if (!widget) {
        return;
      }

      return commands.execute('console:create', {
        activate: args['activate'],
        path: widget.context.path,
        preferredLanguage: widget.context.model.defaultKernelLanguage
      });
    },
    isEnabled: hasWidget,
    label: 'Create Console for Editor'
  });

  commands.addCommand(CommandIDs.runCode, {
    execute: () => {
      const widget = tracker.currentWidget;

      if (!widget) {
        return;
      }

      let code = '';

      const editor = widget.editor;
      const path = widget.context.path;
      const extension = PathExt.extname(path);
      const selection = editor.getSelection();
      const { start, end } = selection;
      const selected = start.column !== end.column || start.line !== end.line;

      if (selected) {
        // Get the selected code from the editor.
        const start = editor.getOffsetAt(selection.start);
        const end = editor.getOffsetAt(selection.end);

        code = editor.model.value.text.substring(start, end);
        if (start === end) {
          code = editor.getLine(selection.start.line);
        }
      } else if (MarkdownCodeBlocks.isMarkdown(extension)) {
        const { text } = editor.model.value;
        const blocks = MarkdownCodeBlocks.findMarkdownCodeBlocks(text);

        for (let block of blocks) {
          if (block.startLine <= start.line && start.line <= block.endLine) {
            code = block.code;
            break;
          }
        }
      }

      const { column, line } = editor.getCursorPosition();
      const activate = false;

      // Advance cursor to the next line.
      if (line + 1 === editor.lineCount) {
        const text = editor.model.value.text;
        editor.model.value.text = text + '\n';
      }
      editor.setCursorPosition({ column, line: line + 1 });

      return commands.execute('console:inject', { activate, code, path });
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
