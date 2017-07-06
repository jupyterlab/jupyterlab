// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ILayoutRestorer, JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  InstanceTracker
} from '@jupyterlab/apputils';

import {
  ISettingRegistry
} from '@jupyterlab/coreutils';

import {
  CodeEditor, IEditorServices
} from '@jupyterlab/codeeditor';

import {
   MarkdownCodeBlocks, PathExt
} from '@jupyterlab/coreutils';

import {
  FileEditor, FileEditorFactory, IEditorTracker
} from '@jupyterlab/fileeditor';

import {
  ILauncher
} from '@jupyterlab/launcher';


/**
 * The class name for the text editor icon from the default theme.
 */
const EDITOR_ICON_CLASS = 'jp-TextEditorIcon';

/**
 * The name of the factory that creates editor widgets.
 */
const FACTORY = 'Editor';


/**
 * The command IDs used by the fileeditor plugin.
 */
namespace CommandIDs {
  export
  const lineNumbers = 'fileeditor:toggle-line-numbers';

  export
  const lineWrap = 'fileeditor:toggle-line-wrap';

  export
  const changeTabs = 'fileeditor:change-tabs';

  export
  const matchBrackets = 'fileeditor:toggle-match-brackets';

  export
  const autoClosingBrackets = 'fileeditor:toggle-autoclosing-brackets';

  export
  const createConsole = 'fileeditor:create-console';

  export
  const runCode = 'fileeditor:run-code';

  export
  const markdownPreview = 'fileeditor:markdown-preview';
};


/**
 * The editor tracker extension.
 */
const plugin: JupyterLabPlugin<IEditorTracker> = {
  activate,
  id: 'jupyter.services.editor-tracker',
  requires: [
    ILayoutRestorer,
    IEditorServices,
    ISettingRegistry
  ],
  optional: [ILauncher],
  provides: IEditorTracker,
  autoStart: true
};


/* tslint:disable */
/**
 * The commands plugin setting schema.
 *
 * #### Notes
 * This will eventually reside in its own settings file.
 */
const schema = {
  "jupyter.lab.setting-icon-class": "jp-TextEditorIcon",
  "jupyter.lab.setting-icon-label": "Editor",
  "title": "Text Editor",
  "description": "Text editor settings for all editors.",
  "properties": {
    "autoClosingBrackets": {
      "type": "boolean", "title": "Autoclosing Brackets", "default": true
    },
    "lineNumbers": {
      "type": "boolean", "title": "Line Numbers", "default": true
    },
    "lineWrap": {
      "type": "boolean", "title": "Line Wrap", "default": false
    },
    "matchBrackets": {
      "type": "boolean", "title": "Match Brackets", "default": true
    }
  },
  "type": "object"
};
/* tslint:enable */


/**
 * Export the plugins as default.
 */
export default plugin;


/**
 * Activate the editor tracker plugin.
 */
function activate(app: JupyterLab, restorer: ILayoutRestorer, editorServices: IEditorServices, settingRegistry: ISettingRegistry, launcher: ILauncher | null): IEditorTracker {
  const id = plugin.id;
  const namespace = 'editor';
  const factory = new FileEditorFactory({
    editorServices,
    factoryOptions: { name: FACTORY, fileExtensions: ['*'], defaultFor: ['*'] }
  });
  const { commands, restored } = app;
  const tracker = new InstanceTracker<FileEditor>({ namespace });
  const hasWidget = () => !!tracker.currentWidget;

  let {
    lineNumbers, lineWrap, matchBrackets, autoClosingBrackets
  } = CodeEditor.defaultConfig;

  // Handle state restoration.
  restorer.restore(tracker, {
    command: 'docmanager:open',
    args: widget => ({ path: widget.context.path, factory: FACTORY }),
    name: widget => widget.context.path
  });

  /**
   * Update the setting values.
   */
  function updateSettings(settings: ISettingRegistry.ISettings): void {
    let cached = settings.get('lineNumbers').composite as boolean | null;
    lineNumbers = cached === null ? lineNumbers : !!cached;
    cached = settings.get('matchBrackets').composite as boolean | null;
    matchBrackets = cached === null ? matchBrackets : !!cached;
    cached = settings.get('autoClosingBrackets').composite as boolean | null;
    autoClosingBrackets = cached === null ? autoClosingBrackets : !!cached;
    cached = settings.get('lineWrap').composite as boolean | null;
    lineWrap = cached === null ? lineWrap : !!cached;
  }

  /**
   * Update the settings of the current tracker instances.
   */
  function updateTracker(): void {
    tracker.forEach(widget => { updateWidget(widget); });
  }

  /**
   * Update the settings of a widget.
   */
  function updateWidget(widget: FileEditor): void {
    const editor = widget.editor;
    editor.setOption('lineNumbers', lineNumbers);
    editor.setOption('lineWrap', lineWrap);
    editor.setOption('matchBrackets', matchBrackets);
    editor.setOption('autoClosingBrackets', autoClosingBrackets);
  }

  // Preload the settings schema into the registry. This is deprecated.
  settingRegistry.preload(id, schema);

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
    updateWidget(widget);
  });
  app.docRegistry.addWidgetFactory(factory);

  // Handle the settings of new widgets.
  tracker.widgetAdded.connect((sender, widget) => {
    updateWidget(widget);
  });

  commands.addCommand(CommandIDs.lineNumbers, {
    execute: () => {
      lineNumbers = !lineNumbers;
      tracker.forEach(widget => {
        widget.editor.setOption('lineNumbers', lineNumbers);
      });
      return settingRegistry.set(id, 'lineNumbers', lineNumbers);
    },
    isEnabled: hasWidget,
    isToggled: () => lineNumbers,
    label: 'Line Numbers'
  });

  commands.addCommand(CommandIDs.lineWrap, {
    execute: () => {
      lineWrap = !lineWrap;
      tracker.forEach(widget => {
        widget.editor.setOption('lineWrap', lineWrap);
      });
      return settingRegistry.set(id, 'lineWrap', lineWrap);
    },
    isEnabled: hasWidget,
    isToggled: () => lineWrap,
    label: 'Word Wrap'
  });

  commands.addCommand(CommandIDs.changeTabs, {
    label: args => args['name'] as string,
    execute: args => {
      let widget = tracker.currentWidget;
      if (!widget) {
        return;
      }
      let editor = widget.editor;
      let size = args['size'] as number || 4;
      let insertSpaces = !!args['insertSpaces'];
      editor.setOption('insertSpaces', insertSpaces);
      editor.setOption('tabSize', size);
    },
    isEnabled: hasWidget,
    isToggled: args => {
      let widget = tracker.currentWidget;
      if (!widget) {
        return false;
      }
      let insertSpaces = !!args['insertSpaces'];
      let size = args['size'] as number || 4;
      let editor = widget.editor;
      if (editor.getOption('insertSpaces') !== insertSpaces) {
        return false;
      }
      return editor.getOption('tabSize') === size;
    }
  });

  commands.addCommand(CommandIDs.matchBrackets, {
    execute: () => {
      matchBrackets = !matchBrackets;
      tracker.forEach(widget => {
        widget.editor.setOption('matchBrackets', matchBrackets);
      });
      return settingRegistry.set(id, 'matchBrackets', matchBrackets);
    },
    label: 'Match Brackets',
    isEnabled: hasWidget,
    isToggled: () => matchBrackets
  });

  commands.addCommand(CommandIDs.autoClosingBrackets, {
    execute: () => {
      autoClosingBrackets = !autoClosingBrackets;
      tracker.forEach(widget => {
        widget.editor.setOption('autoClosingBrackets', autoClosingBrackets);
      });
      return settingRegistry
        .set(id, 'autoClosingBrackets', autoClosingBrackets);
    },
    label: 'Auto-Closing Brackets',
    isEnabled: hasWidget,
    isToggled: () => autoClosingBrackets
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
      // This will run the current selection or the entire ```fenced``` code block.
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

      const activate = false;
      if (code) {
        return commands.execute('console:inject', { activate, code, path });
      } else {
        return Promise.resolve(void 0);
      }
    },
    isEnabled: hasWidget,
    label: 'Run Code'
  });

  commands.addCommand(CommandIDs.markdownPreview, {
    execute: () => {
      let path = tracker.currentWidget.context.path;
      return commands.execute('markdownviewer:open', { path });
    },
    isVisible: () => {
      let widget = tracker.currentWidget;
      return widget && PathExt.extname(widget.context.path) === '.md';
    },
    label: 'Show Markdown Preview'
  });

  // Add a launcher item if the launcher is available.
  if (launcher) {
    launcher.add({
      displayName: 'Text Editor',
      category: 'Other',
      rank: 1,
      iconClass: EDITOR_ICON_CLASS,
      callback: cwd => {
        return commands.execute('docmanager:new-untitled', {
          path: cwd, type: 'file'
        }).then(model => {
          return commands.execute('docmanager:open', {
            path: model.path, factory: FACTORY
          });
        });
      }
    });
  }

  app.contextMenu.addItem({
    command: CommandIDs.createConsole, selector: '.jp-FileEditor'
  });
  app.contextMenu.addItem({
    command: CommandIDs.markdownPreview, selector: '.jp-FileEditor'
  });

  return tracker;
}
