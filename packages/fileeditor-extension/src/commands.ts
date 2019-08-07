// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { JupyterFrontEnd } from '@jupyterlab/application';

import { ICommandPalette, WidgetTracker } from '@jupyterlab/apputils';

import { CodeEditor } from '@jupyterlab/codeeditor';

import { IConsoleTracker } from '@jupyterlab/console';

import {
  ISettingRegistry,
  MarkdownCodeBlocks,
  PathExt
} from '@jupyterlab/coreutils';

import {
  ABCWidgetFactory,
  DocumentRegistry,
  IDocumentWidget
} from '@jupyterlab/docregistry';

import { IFileBrowserFactory } from '@jupyterlab/filebrowser';

import { FileEditor } from '@jupyterlab/fileeditor';

import { ILauncher } from '@jupyterlab/launcher';

import {
  IEditMenu,
  IFileMenu,
  IMainMenu,
  IRunMenu,
  IViewMenu
} from '@jupyterlab/mainmenu';

import { CommandRegistry } from '@phosphor/commands';

import { JSONObject, ReadonlyJSONObject } from '@phosphor/coreutils';

import { Menu } from '@phosphor/widgets';

import { CommandIDs } from './index';

/**
 * The class name for the text editor icon from the default theme.
 */
export const EDITOR_ICON_CLASS = 'jp-MaterialIcon jp-TextEditorIcon';

/**
 * The class name for the text editor icon from the default theme.
 */
export const MARKDOWN_ICON_CLASS = 'jp-MaterialIcon jp-MarkdownIcon';

export default class Commands {
  static getCreateConsoleFunction(
    commands: CommandRegistry
  ): (
    widget: IDocumentWidget<FileEditor>,
    args?: ReadonlyJSONObject
  ) => Promise<void> {
    return async function createConsole(
      widget: IDocumentWidget<FileEditor>,
      args?: ReadonlyJSONObject
    ): Promise<void> {
      const options = args || {};
      const console = await commands.execute('console:create', {
        activate: options['activate'],
        name: widget.context.contentsModel.name,
        path: widget.context.path,
        preferredLanguage: widget.context.model.defaultKernelLanguage,
        ref: widget.id,
        insertMode: 'split-bottom'
      });

      widget.context.pathChanged.connect((sender, value) => {
        console.session.setPath(value);
        console.session.setName(widget.context.contentsModel.name);
      });
    };
  }

  static addCommands(
    commands: CommandRegistry,
    config: CodeEditor.IConfig,
    settingRegistry: ISettingRegistry,
    id: string,
    isEnabled: () => boolean,
    tracker: WidgetTracker<IDocumentWidget<FileEditor>>,
    browserFactory: IFileBrowserFactory,
    factory: ABCWidgetFactory<
      IDocumentWidget<FileEditor>,
      DocumentRegistry.ICodeModel
    >
  ) {
    // Add a command to change font size.
    commands.addCommand(CommandIDs.changeFontSize, {
      execute: args => {
        const delta = Number(args['delta']);
        if (Number.isNaN(delta)) {
          console.error(
            `${CommandIDs.changeFontSize}: delta arg must be a number`
          );
          return;
        }
        const style = window.getComputedStyle(document.documentElement);
        const cssSize = parseInt(
          style.getPropertyValue('--jp-code-font-size'),
          10
        );
        const currentSize = config.fontSize || cssSize;
        config.fontSize = currentSize + delta;
        return settingRegistry
          .set(id, 'editorConfig', (config as unknown) as JSONObject)
          .catch((reason: Error) => {
            console.error(`Failed to set ${id}: ${reason.message}`);
          });
      },
      label: args => args['name'] as string
    });

    commands.addCommand(CommandIDs.lineNumbers, {
      execute: () => {
        config.lineNumbers = !config.lineNumbers;
        return settingRegistry
          .set(id, 'editorConfig', (config as unknown) as JSONObject)
          .catch((reason: Error) => {
            console.error(`Failed to set ${id}: ${reason.message}`);
          });
      },
      isEnabled,
      isToggled: () => config.lineNumbers,
      label: 'Line Numbers'
    });

    type wrappingMode = 'on' | 'off' | 'wordWrapColumn' | 'bounded';

    commands.addCommand(CommandIDs.lineWrap, {
      execute: args => {
        config.lineWrap = (args['mode'] as wrappingMode) || 'off';
        return settingRegistry
          .set(id, 'editorConfig', (config as unknown) as JSONObject)
          .catch((reason: Error) => {
            console.error(`Failed to set ${id}: ${reason.message}`);
          });
      },
      isEnabled,
      isToggled: args => {
        const lineWrap = (args['mode'] as wrappingMode) || 'off';
        return config.lineWrap === lineWrap;
      },
      label: 'Word Wrap'
    });

    commands.addCommand(CommandIDs.changeTabs, {
      label: args => args['name'] as string,
      execute: args => {
        config.tabSize = (args['size'] as number) || 4;
        config.insertSpaces = !!args['insertSpaces'];
        return settingRegistry
          .set(id, 'editorConfig', (config as unknown) as JSONObject)
          .catch((reason: Error) => {
            console.error(`Failed to set ${id}: ${reason.message}`);
          });
      },
      isToggled: args => {
        const insertSpaces = !!args['insertSpaces'];
        const size = (args['size'] as number) || 4;
        return config.insertSpaces === insertSpaces && config.tabSize === size;
      }
    });

    commands.addCommand(CommandIDs.matchBrackets, {
      execute: () => {
        config.matchBrackets = !config.matchBrackets;
        return settingRegistry
          .set(id, 'editorConfig', (config as unknown) as JSONObject)
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
        return settingRegistry
          .set(id, 'editorConfig', (config as unknown) as JSONObject)
          .catch((reason: Error) => {
            console.error(`Failed to set ${id}: ${reason.message}`);
          });
      },
      label: 'Auto Close Brackets for Text Editor',
      isToggled: () => config.autoClosingBrackets
    });

    commands.addCommand(CommandIDs.createConsole, {
      execute: args => {
        const widget = tracker.currentWidget;

        if (!widget) {
          return;
        }

        return Commands.getCreateConsoleFunction(commands)(widget, args);
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
          editor.setCursorPosition({
            line: cursor.line + 1,
            column: cursor.column
          });
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

    commands.addCommand(CommandIDs.runAllCode, {
      execute: () => {
        let widget = tracker.currentWidget.content;

        if (!widget) {
          return;
        }

        let code = '';
        let editor = widget.editor;
        let text = editor.model.value.text;
        let path = widget.context.path;
        let extension = PathExt.extname(path);

        if (MarkdownCodeBlocks.isMarkdown(extension)) {
          // For Markdown files, run only code blocks.
          const blocks = MarkdownCodeBlocks.findMarkdownCodeBlocks(text);
          for (let block of blocks) {
            code += block.code;
          }
        } else {
          code = text;
        }

        const activate = false;
        if (code) {
          return commands.execute('console:inject', { activate, code, path });
        } else {
          return Promise.resolve(void 0);
        }
      },
      isEnabled,
      label: 'Run All Code'
    });

    commands.addCommand(CommandIDs.markdownPreview, {
      execute: () => {
        let widget = tracker.currentWidget;
        if (!widget) {
          return;
        }
        let path = widget.context.path;
        return commands.execute('markdownviewer:open', {
          path,
          options: {
            mode: 'split-right'
          }
        });
      },
      isVisible: () => {
        let widget = tracker.currentWidget;
        return (
          (widget && PathExt.extname(widget.context.path) === '.md') || false
        );
      },
      label: 'Show Markdown Preview'
    });

    // Function to create a new untitled text file, given
    // the current working directory.
    const createNew = (cwd: string, ext: string = 'txt') => {
      return commands
        .execute('docmanager:new-untitled', {
          path: cwd,
          type: 'file',
          ext
        })
        .then(model => {
          return commands.execute('docmanager:open', {
            path: model.path,
            factory: factory.name
          });
        });
    };

    // Add a command for creating a new text file.
    commands.addCommand(CommandIDs.createNew, {
      label: args => (args['isPalette'] ? 'New Text File' : 'Text File'),
      caption: 'Create a new text file',
      iconClass: args => (args['isPalette'] ? '' : EDITOR_ICON_CLASS),
      execute: args => {
        let cwd = args['cwd'] || browserFactory.defaultBrowser.model.path;
        return createNew(cwd as string);
      }
    });

    // Add a command for creating a new Markdown file.
    commands.addCommand(CommandIDs.createNewMarkdown, {
      label: args =>
        args['isPalette'] ? 'New Markdown File' : 'Markdown File',
      caption: 'Create a new markdown file',
      iconClass: args => (args['isPalette'] ? '' : MARKDOWN_ICON_CLASS),
      execute: args => {
        let cwd = args['cwd'] || browserFactory.defaultBrowser.model.path;
        return createNew(cwd as string, 'md');
      }
    });
  }

  static addLauncherItems(launcher: ILauncher) {
    launcher.add({
      command: CommandIDs.createNew,
      category: 'Other',
      rank: 1
    });

    launcher.add({
      command: CommandIDs.createNewMarkdown,
      category: 'Other',
      rank: 2
    });
  }

  static addPaletteItems(palette: ICommandPalette) {
    const category = 'Text Editor';
    let args: JSONObject = {
      insertSpaces: false,
      size: 4,
      name: 'Indent with Tab'
    };
    let command = 'fileeditor:change-tabs';
    palette.addItem({ command, args, category });

    for (let size of [1, 2, 4, 8]) {
      let args: JSONObject = {
        insertSpaces: true,
        size,
        name: `Spaces: ${size} `
      };
      palette.addItem({ command, args, category });
    }

    args = { isPalette: true };
    command = CommandIDs.createNew;
    palette.addItem({ command, args, category });

    args = { isPalette: true };
    command = CommandIDs.createNewMarkdown;
    palette.addItem({ command, args, category });

    args = { name: 'Increase Font Size', delta: 1 };
    command = CommandIDs.changeFontSize;
    palette.addItem({ command, args, category });

    args = { name: 'Decrease Font Size', delta: -1 };
    command = CommandIDs.changeFontSize;
    palette.addItem({ command, args, category });
  }

  static addMenuItems(
    menu: IMainMenu,
    commands: CommandRegistry,
    tracker: WidgetTracker<IDocumentWidget<FileEditor>>,
    consoleTracker: IConsoleTracker
  ) {
    // Add the editing commands to the settings menu.
    this.addEditingCommandsToSettingsMenu(menu, commands);

    // Add new text file creation to the file menu.
    this.addCreateNewFileToFileMenu(menu);

    // Add new markdown file creation to the file menu.
    this.addCreateNewMarkdownFileToFileMenu(menu);

    // Add undo/redo hooks to the edit menu.
    this.addUndoRedoToEditMenu(menu, tracker);

    // Add editor view options.
    this.addEditorViewerToViewMenu(menu, tracker);

    // Add a console creator the the Kernel menu.
    this.addConsoleCreatorToKernelMenu(menu, commands, tracker);

    // Add a code runner to the Run menu.
    this.addCodeRunnersToRunMenu(menu, commands, tracker, consoleTracker);
  }

  static addEditingCommandsToSettingsMenu(
    menu: IMainMenu,
    commands: CommandRegistry
  ) {
    const tabMenu = new Menu({ commands });
    tabMenu.title.label = 'Text Editor Indentation';
    let args: JSONObject = {
      insertSpaces: false,
      size: 4,
      name: 'Indent with Tab'
    };
    let command = 'fileeditor:change-tabs';
    tabMenu.addItem({ command, args });

    for (let size of [1, 2, 4, 8]) {
      let args: JSONObject = {
        insertSpaces: true,
        size,
        name: `Spaces: ${size} `
      };
      tabMenu.addItem({ command, args });
    }

    menu.settingsMenu.addGroup(
      [
        {
          command: CommandIDs.changeFontSize,
          args: { name: 'Increase Text Editor Font Size', delta: +1 }
        },
        {
          command: CommandIDs.changeFontSize,
          args: { name: 'Decrease Text Editor Font Size', delta: -1 }
        },
        { type: 'submenu', submenu: tabMenu },
        { command: CommandIDs.autoClosingBrackets }
      ],
      30
    );
  }

  static addCreateNewFileToFileMenu(menu: IMainMenu) {
    menu.fileMenu.newMenu.addGroup([{ command: CommandIDs.createNew }], 30);
  }

  static addCreateNewMarkdownFileToFileMenu(menu: IMainMenu) {
    menu.fileMenu.newMenu.addGroup(
      [{ command: CommandIDs.createNewMarkdown }],
      30
    );
  }

  static addUndoRedoToEditMenu(
    menu: IMainMenu,
    tracker: WidgetTracker<IDocumentWidget<FileEditor>>
  ) {
    menu.editMenu.undoers.add({
      tracker,
      undo: widget => {
        widget.content.editor.undo();
      },
      redo: widget => {
        widget.content.editor.redo();
      }
    } as IEditMenu.IUndoer<IDocumentWidget<FileEditor>>);
  }

  static addEditorViewerToViewMenu(
    menu: IMainMenu,
    tracker: WidgetTracker<IDocumentWidget<FileEditor>>
  ) {
    menu.viewMenu.editorViewers.add({
      tracker,
      toggleLineNumbers: widget => {
        const lineNumbers = !widget.content.editor.getOption('lineNumbers');
        widget.content.editor.setOption('lineNumbers', lineNumbers);
      },
      toggleWordWrap: widget => {
        const oldValue = widget.content.editor.getOption('lineWrap');
        const newValue = oldValue === 'off' ? 'on' : 'off';
        widget.content.editor.setOption('lineWrap', newValue);
      },
      toggleMatchBrackets: widget => {
        const matchBrackets = !widget.content.editor.getOption('matchBrackets');
        widget.content.editor.setOption('matchBrackets', matchBrackets);
      },
      lineNumbersToggled: widget =>
        widget.content.editor.getOption('lineNumbers'),
      wordWrapToggled: widget =>
        widget.content.editor.getOption('lineWrap') !== 'off',
      matchBracketsToggled: widget =>
        widget.content.editor.getOption('matchBrackets')
    } as IViewMenu.IEditorViewer<IDocumentWidget<FileEditor>>);
  }

  static addConsoleCreatorToKernelMenu(
    menu: IMainMenu,
    commands: CommandRegistry,
    tracker: WidgetTracker<IDocumentWidget<FileEditor>>
  ) {
    let createConsole: (
      widget: IDocumentWidget<FileEditor>
    ) => Promise<void> = this.getCreateConsoleFunction(commands);
    menu.fileMenu.consoleCreators.add({
      tracker,
      name: 'Editor',
      createConsole
    } as IFileMenu.IConsoleCreator<IDocumentWidget<FileEditor>>);
  }

  static addCodeRunnersToRunMenu(
    menu: IMainMenu,
    commands: CommandRegistry,
    tracker: WidgetTracker<IDocumentWidget<FileEditor>>,
    consoleTracker: IConsoleTracker
  ) {
    menu.runMenu.codeRunners.add({
      tracker,
      noun: 'Code',
      isEnabled: current =>
        !!consoleTracker.find(c => c.session.path === current.context.path),
      run: () => commands.execute(CommandIDs.runCode),
      runAll: () => commands.execute(CommandIDs.runAllCode),
      restartAndRunAll: current => {
        const console = consoleTracker.find(
          console => console.session.path === current.context.path
        );
        if (console) {
          return console.session.restart().then(restarted => {
            if (restarted) {
              void commands.execute(CommandIDs.runAllCode);
            }
            return restarted;
          });
        }
      }
    } as IRunMenu.ICodeRunner<IDocumentWidget<FileEditor>>);
  }

  // Functions for adding items to the context menu
  static addContextMenuItems(app: JupyterFrontEnd) {
    this.addCreateConsoleToContextMenu(app);
    this.addMarkdownPreviewToContextMenu(app);
  }

  static addCreateConsoleToContextMenu(app: JupyterFrontEnd) {
    app.contextMenu.addItem({
      command: CommandIDs.createConsole,
      selector: '.jp-FileEditor'
    });
  }

  static addMarkdownPreviewToContextMenu(app: JupyterFrontEnd) {
    app.contextMenu.addItem({
      command: CommandIDs.markdownPreview,
      selector: '.jp-FileEditor'
    });
  }
}
