// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ILayoutRestorer, JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  ICommandPalette, InstanceTracker
} from '@jupyterlab/apputils';

import {
  CodeEditor, IEditorServices
} from '@jupyterlab/codeeditor';

import {
  IConsoleTracker
} from '@jupyterlab/console';

import {
  ISettingRegistry, MarkdownCodeBlocks, PathExt
} from '@jupyterlab/coreutils';

import {
  IDocumentWidget
} from '@jupyterlab/docregistry';

import {
  IFileBrowserFactory
} from '@jupyterlab/filebrowser';

import {
  FileEditor, FileEditorFactory, IEditorTracker
} from '@jupyterlab/fileeditor';

import {
  ILauncher
} from '@jupyterlab/launcher';

import {
  IEditMenu, IFileMenu, IMainMenu, IRunMenu, IViewMenu
} from '@jupyterlab/mainmenu';

import {
  JSONObject
} from '@phosphor/coreutils';

import {
  Menu
} from '@phosphor/widgets';

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
  const createNew = 'fileeditor:create-new';

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
}


/**
 * The editor tracker extension.
 */
const plugin: JupyterLabPlugin<IEditorTracker> = {
  activate,
  id: '@jupyterlab/fileeditor-extension:plugin',
  requires: [IConsoleTracker, IEditorServices, IFileBrowserFactory, ILayoutRestorer, ISettingRegistry],
  optional: [ICommandPalette, ILauncher, IMainMenu],
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
function activate(app: JupyterLab, consoleTracker: IConsoleTracker, editorServices: IEditorServices, browserFactory: IFileBrowserFactory, restorer: ILayoutRestorer, settingRegistry: ISettingRegistry, palette: ICommandPalette, launcher: ILauncher | null, menu: IMainMenu | null): IEditorTracker {
  const id = plugin.id;
  const namespace = 'editor';
  const factory = new FileEditorFactory({
    editorServices,
    factoryOptions: { name: FACTORY, fileTypes: ['*'], defaultFor: ['*'] }
  });
  const { commands, restored } = app;
  const tracker = new InstanceTracker<IDocumentWidget<FileEditor>>({ namespace });
  const isEnabled = () => tracker.currentWidget !== null &&
                          tracker.currentWidget === app.shell.currentWidget;

  let config = { ...CodeEditor.defaultConfig };

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
    let cached =
      settings.get('editorConfig').composite as Partial<CodeEditor.IConfig>;
    Object.keys(config).forEach((key: keyof CodeEditor.IConfig) => {
      config[key] = (cached[key] === null || cached[key] === undefined) ?
        CodeEditor.defaultConfig[key] : cached[key];
    });
    // Trigger a refresh of the rendered commands
    app.commands.notifyCommandChanged();
  }

  /**
   * Update the settings of the current tracker instances.
   */
  function updateTracker(): void {
    tracker.forEach(widget => { updateWidget(widget.content); });
  }

  /**
   * Update the settings of a widget.
   */
  function updateWidget(widget: FileEditor): void {
    const editor = widget.editor;
    Object.keys(config).forEach((key: keyof CodeEditor.IConfig) => {
      editor.setOption(key, config[key]);
    });
  }

  // Add a console creator to the File menu
  // Fetch the initial state of the settings.
  Promise.all([settingRegistry.load(id), restored]).then(([settings]) => {
    updateSettings(settings);
    updateTracker();
    settings.changed.connect(() => {
      updateSettings(settings);
      updateTracker();
    });
  }).catch((reason: Error) => {
    console.error(reason.message);
    updateTracker();
  });

  factory.widgetCreated.connect((sender, widget) => {
    widget.title.icon = EDITOR_ICON_CLASS;

    // Notify the instance tracker if restore data needs to update.
    widget.context.pathChanged.connect(() => { tracker.save(widget); });
    tracker.add(widget);
    updateWidget(widget.content);
  });
  app.docRegistry.addWidgetFactory(factory);

  // Handle the settings of new widgets.
  tracker.widgetAdded.connect((sender, widget) => {
    updateWidget(widget.content);
  });

  commands.addCommand(CommandIDs.lineNumbers, {
    execute: () => {
      config.lineNumbers = !config.lineNumbers;
      return settingRegistry.set(id, 'editorConfig', config)
      .catch((reason: Error) => {
        console.error(`Failed to set ${id}: ${reason.message}`);
      });
    },
    isEnabled,
    isToggled: () => config.lineNumbers,
    label: 'Line Numbers'
  });

  commands.addCommand(CommandIDs.lineWrap, {
    execute: () => {
      config.lineWrap = !config.lineWrap;
      return settingRegistry.set(id, 'editorConfig', config)
      .catch((reason: Error) => {
        console.error(`Failed to set ${id}: ${reason.message}`);
      });
    },
    isEnabled,
    isToggled: () => config.lineWrap,
    label: 'Word Wrap'
  });

  commands.addCommand(CommandIDs.changeTabs, {
    label: args => args['name'] as string,
    execute: args => {
      config.tabSize = args['size'] as number || 4;
      config.insertSpaces = !!args['insertSpaces'];
      return settingRegistry.set(id, 'editorConfig', config)
      .catch((reason: Error) => {
        console.error(`Failed to set ${id}: ${reason.message}`);
      });
    },
    isEnabled,
    isToggled: args => {
      const insertSpaces = !!args['insertSpaces'];
      const size = args['size'] as number || 4;
      return config.insertSpaces === insertSpaces && config.tabSize === size;
    }
  });

  commands.addCommand(CommandIDs.matchBrackets, {
    execute: () => {
      config.matchBrackets = !config.matchBrackets;
      return settingRegistry.set(id, 'editorConfig', config)
      .catch((reason: Error) => {
        console.error(`Failed to set ${id}: ${reason.message}`);
      });
    },
    label: 'Match Brackets',
    isEnabled,
    isToggled: () => config.matchBrackets
  });

  commands.addCommand(CommandIDs.autoClosingBrackets, {
    execute: () => {
      config.autoClosingBrackets = !config.autoClosingBrackets;
      return settingRegistry.set(id, 'editorConfig', config)
      .catch((reason: Error) => {
        console.error(`Failed to set ${id}: ${reason.message}`);
      });
    },
    label: 'Auto Close Brackets for Text Editor',
    isEnabled,
    isToggled: () => config.autoClosingBrackets
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
        preferredLanguage: widget.context.model.defaultKernelLanguage,
        ref: widget.id,
        insertMode: 'split-bottom'
      });
    },
    isEnabled,
    label: 'Create Console for Editor'
  });

  commands.addCommand(CommandIDs.runCode, {
    execute: () => {
      // Run the appropriate code, taking into account a ```fenced``` code block.
      const widget = tracker.currentWidget.content;

      if (!widget) {
        return;
      }

      let code = '';
      const editor = widget.editor;
      const path = widget.context.path;
      const extension = PathExt.extname(path);
      const selection = editor.getSelection();
      const { start, end } = selection;
      let selected = start.column !== end.column || start.line !== end.line;

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
            selected = true;
            break;
          }
        }
      }

      if (!selected) {
        // no selection, submit whole line and advance
        code = editor.getLine(selection.start.line);
        const cursor = editor.getCursorPosition();
        if (cursor.line + 1 === editor.lineCount) {
          let text = editor.model.value.text;
          editor.model.value.text = text + '\n';
        }
        editor.setCursorPosition({ line: cursor.line + 1, column: cursor.column });
      }

      const activate = false;
      if (code) {
        return commands.execute('console:inject', { activate, code, path });
      } else {
        return Promise.resolve(void 0);
      }
    },
    isEnabled,
    label: 'Run Code'
  });

  commands.addCommand(CommandIDs.markdownPreview, {
    execute: () => {
      let widget = tracker.currentWidget;
      if (!widget) {
        return;
      }
      let path = widget.context.path;
      return commands.execute('markdownviewer:open', { path });
    },
    isVisible: () => {
      let widget = tracker.currentWidget;
      return widget && PathExt.extname(widget.context.path) === '.md' || false;
    },
    label: 'Show Markdown Preview'
  });

  // Function to create a new untitled text file, given
  // the current working directory.
  const createNew = (cwd: string) => {
    return commands.execute('docmanager:new-untitled', {
      path: cwd, type: 'file'
    }).then(model => {
      return commands.execute('docmanager:open', {
        path: model.path, factory: FACTORY
      });
    });
  };

  // Add a command for creating a new text file.
  commands.addCommand(CommandIDs.createNew, {
    label: 'Text File',
    caption: 'Create a new text file',
    iconClass: EDITOR_ICON_CLASS,
    execute: args => {
      let cwd = args['cwd'] || browserFactory.defaultBrowser.model.path;
      return createNew(cwd as string);
    }
  });

  // Add a launcher item if the launcher is available.
  if (launcher) {
    launcher.add({
      command: CommandIDs.createNew,
      category: 'Other',
      rank: 1,
    });
  }

  if (palette) {
    let args: JSONObject = {
      insertSpaces: false, size: 4, name: 'Indent with Tab'
    };
    let command = 'fileeditor:change-tabs';
    palette.addItem({ command, args, category: 'Text Editor' });

    for (let size of [1, 2, 4, 8]) {
      let args: JSONObject = {
        insertSpaces: true, size, name: `Spaces: ${size} `
      };
      palette.addItem({ command, args, category: 'Text Editor' });
    }
  }

  if (menu) {
    // Add the editing commands to the settings menu.
    const tabMenu = new Menu({ commands });
    tabMenu.title.label = 'Text Editor Indentation';
    let args: JSONObject = {
      insertSpaces: false, size: 4, name: 'Indent with Tab'
    };
    let command = 'fileeditor:change-tabs';
    tabMenu.addItem({ command, args });

    for (let size of [1, 2, 4, 8]) {
      let args: JSONObject = {
        insertSpaces: true, size, name: `Spaces: ${size} `
      };
      tabMenu.addItem({ command, args });
    }
    menu.settingsMenu.addGroup([
      { type: 'submenu', submenu: tabMenu },
      { command: CommandIDs.autoClosingBrackets }
    ], 30);

    // Add new text file creation to the file menu.
    menu.fileMenu.newMenu.addGroup([{ command: CommandIDs.createNew }], 30);

    // Add undo/redo hooks to the edit menu.
    menu.editMenu.undoers.add({
      tracker,
      undo: widget => { widget.content.editor.undo(); },
      redo: widget => { widget.content.editor.redo(); }
    } as IEditMenu.IUndoer<IDocumentWidget<FileEditor>>);

    // Add editor view options.
    menu.viewMenu.editorViewers.add({
      tracker,
      toggleLineNumbers: widget => {
        const lineNumbers = !widget.content.editor.getOption('lineNumbers');
        widget.content.editor.setOption('lineNumbers', lineNumbers);
      },
      toggleWordWrap: widget => {
        const wordWrap = !widget.content.editor.getOption('lineWrap');
        widget.content.editor.setOption('lineWrap', wordWrap);
      },
      toggleMatchBrackets: widget => {
        const matchBrackets = !widget.content.editor.getOption('matchBrackets');
        widget.content.editor.setOption('matchBrackets', matchBrackets);
      },
      lineNumbersToggled: widget => widget.content.editor.getOption('lineNumbers'),
      wordWrapToggled: widget => widget.content.editor.getOption('lineWrap'),
      matchBracketsToggled: widget => widget.content.editor.getOption('matchBrackets')
    } as IViewMenu.IEditorViewer<IDocumentWidget<FileEditor>>);

    // Add a console creator the the Kernel menu.
    menu.fileMenu.consoleCreators.add({
      tracker,
      name: 'Editor',
      createConsole: current => {
        const options = {
          path: current.context.path,
          preferredLanguage: current.context.model.defaultKernelLanguage
        };
        return commands.execute('console:create', options);
      }
    } as IFileMenu.IConsoleCreator<IDocumentWidget<FileEditor>>);

    // Add a code runner to the Run menu.
    menu.runMenu.codeRunners.add({
      tracker,
      noun: 'Code',
      isEnabled: current => {
        let found = false;
        consoleTracker.forEach(console => {
          if (console.console.session.path === current.context.path) {
            found = true;
          }
        });
        return found;
      },
      run: () => commands.execute(CommandIDs.runCode)
    } as IRunMenu.ICodeRunner<IDocumentWidget<FileEditor>>);
  }

  app.contextMenu.addItem({
    command: CommandIDs.createConsole, selector: '.jp-FileEditor'
  });
  app.contextMenu.addItem({
    command: CommandIDs.markdownPreview, selector: '.jp-FileEditor'
  });

  return tracker;
}
