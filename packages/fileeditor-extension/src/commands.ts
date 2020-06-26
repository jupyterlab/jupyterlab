// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { JupyterFrontEnd } from '@jupyterlab/application';

import {
  ICommandPalette,
  WidgetTracker,
  ISessionContextDialogs,
  sessionContextDialogs,
  Clipboard
} from '@jupyterlab/apputils';

import { CodeEditor } from '@jupyterlab/codeeditor';

import { CodeMirrorEditor } from '@jupyterlab/codemirror';

import { IConsoleTracker } from '@jupyterlab/console';

import { MarkdownCodeBlocks, PathExt } from '@jupyterlab/coreutils';

import { IDocumentWidget } from '@jupyterlab/docregistry';

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

import { ISettingRegistry } from '@jupyterlab/settingregistry';

import {
  cutIcon,
  copyIcon,
  markdownIcon,
  pasteIcon,
  redoIcon,
  textEditorIcon,
  undoIcon
} from '@jupyterlab/ui-components';

import { CommandRegistry } from '@lumino/commands';

import { JSONObject, ReadonlyPartialJSONObject } from '@lumino/coreutils';

import { Menu } from '@lumino/widgets';

/**
 * The command IDs used by the fileeditor plugin.
 */
export namespace CommandIDs {
  export const createNew = 'fileeditor:create-new';

  export const createNewMarkdown = 'fileeditor:create-new-markdown-file';

  export const changeFontSize = 'fileeditor:change-font-size';

  export const lineNumbers = 'fileeditor:toggle-line-numbers';

  export const lineWrap = 'fileeditor:toggle-line-wrap';

  export const changeTabs = 'fileeditor:change-tabs';

  export const matchBrackets = 'fileeditor:toggle-match-brackets';

  export const autoClosingBrackets = 'fileeditor:toggle-autoclosing-brackets';

  export const createConsole = 'fileeditor:create-console';

  export const replaceSelection = 'fileeditor:replace-selection';

  export const runCode = 'fileeditor:run-code';

  export const runAllCode = 'fileeditor:run-all';

  export const markdownPreview = 'fileeditor:markdown-preview';

  export const undo = 'fileeditor:undo';

  export const redo = 'fileeditor:redo';

  export const cut = 'fileeditor:cut';

  export const copy = 'fileeditor:copy';

  export const paste = 'fileeditor:paste';

  export const selectAll = 'fileeditor:select-all';
}

/**
 * The name of the factory that creates editor widgets.
 */
export const FACTORY = 'Editor';

let config: CodeEditor.IConfig = { ...CodeEditor.defaultConfig };

/**
 * A utility class for adding commands and menu items,
 * for use by the File Editor extension or other Editor extensions.
 */
export namespace Commands {
  /**
   * Accessor function that returns the createConsole function for use by Create Console commands
   */
  function getCreateConsoleFunction(
    commands: CommandRegistry
  ): (
    widget: IDocumentWidget<FileEditor>,
    args?: ReadonlyPartialJSONObject
  ) => Promise<void> {
    return async function createConsole(
      widget: IDocumentWidget<FileEditor>,
      args?: ReadonlyPartialJSONObject
    ): Promise<void> {
      const options = args || {};
      const console = await commands.execute('console:create', {
        activate: options['activate'],
        name: widget.context.contentsModel?.name,
        path: widget.context.path,
        preferredLanguage: widget.context.model.defaultKernelLanguage,
        ref: widget.id,
        insertMode: 'split-bottom'
      });

      widget.context.pathChanged.connect((sender, value) => {
        console.session.setPath(value);
        console.session.setName(widget.context.contentsModel?.name);
      });
    };
  }

  /**
   * Update the setting values.
   */
  export function updateSettings(
    settings: ISettingRegistry.ISettings,
    commands: CommandRegistry
  ): void {
    config = {
      ...CodeEditor.defaultConfig,
      ...(settings.get('editorConfig').composite as JSONObject)
    };

    // Trigger a refresh of the rendered commands
    commands.notifyCommandChanged();
  }

  /**
   * Update the settings of the current tracker instances.
   */
  export function updateTracker(
    tracker: WidgetTracker<IDocumentWidget<FileEditor>>
  ): void {
    tracker.forEach(widget => {
      updateWidget(widget.content);
    });
  }

  /**
   * Update the settings of a widget.
   * Skip global settings for transient editor specific configs.
   */
  export function updateWidget(widget: FileEditor): void {
    const transientConfigs = ['lineNumbers', 'lineWrap', 'matchBrackets'];
    const editor = widget.editor;
    Object.keys(config).forEach((key: keyof CodeEditor.IConfig) => {
      if (!transientConfigs.includes(key)) {
        editor.setOption(key, config[key]);
      }
    });
  }

  /**
   * Wrapper function for adding the default File Editor commands
   */
  export function addCommands(
    commands: CommandRegistry,
    settingRegistry: ISettingRegistry,
    id: string,
    isEnabled: () => boolean,
    tracker: WidgetTracker<IDocumentWidget<FileEditor>>,
    browserFactory: IFileBrowserFactory
  ) {
    // Add a command to change font size.
    addChangeFontSizeCommand(commands, settingRegistry, id);

    addLineNumbersCommand(commands, settingRegistry, id, isEnabled);

    addWordWrapCommand(commands, settingRegistry, id, isEnabled);

    addChangeTabsCommand(commands, settingRegistry, id);

    addMatchBracketsCommand(commands, settingRegistry, id, isEnabled);

    addAutoClosingBracketsCommand(commands, settingRegistry, id);

    addReplaceSelectionCommand(commands, tracker, isEnabled);

    addCreateConsoleCommand(commands, tracker, isEnabled);

    addRunCodeCommand(commands, tracker, isEnabled);

    addRunAllCodeCommand(commands, tracker, isEnabled);

    addMarkdownPreviewCommand(commands, tracker);

    // Add a command for creating a new text file.
    addCreateNewCommand(commands, browserFactory);

    // Add a command for creating a new Markdown file.
    addCreateNewMarkdownCommand(commands, browserFactory);

    addUndoCommand(commands, tracker, isEnabled);

    addRedoCommand(commands, tracker, isEnabled);

    addCutCommand(commands, tracker, isEnabled);

    addCopyCommand(commands, tracker, isEnabled);

    addPasteCommand(commands, tracker, isEnabled);

    addSelectAllCommand(commands, tracker, isEnabled);
  }

  /**
   * Add a command to change font size for File Editor
   */
  export function addChangeFontSizeCommand(
    commands: CommandRegistry,
    settingRegistry: ISettingRegistry,
    id: string
  ) {
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
  }

  /**
   * Add the Line Numbers command
   */
  export function addLineNumbersCommand(
    commands: CommandRegistry,
    settingRegistry: ISettingRegistry,
    id: string,
    isEnabled: () => boolean
  ) {
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
  }

  /**
   * Add the Word Wrap command
   */
  export function addWordWrapCommand(
    commands: CommandRegistry,
    settingRegistry: ISettingRegistry,
    id: string,
    isEnabled: () => boolean
  ) {
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
  }

  /**
   * Add command for changing tabs size or type in File Editor
   */
  export function addChangeTabsCommand(
    commands: CommandRegistry,
    settingRegistry: ISettingRegistry,
    id: string
  ) {
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
  }

  /**
   * Add the Match Brackets command
   */
  export function addMatchBracketsCommand(
    commands: CommandRegistry,
    settingRegistry: ISettingRegistry,
    id: string,
    isEnabled: () => boolean
  ) {
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
  }

  /**
   * Add the Auto Close Brackets for Text Editor command
   */
  export function addAutoClosingBracketsCommand(
    commands: CommandRegistry,
    settingRegistry: ISettingRegistry,
    id: string
  ) {
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
  }

  /**
   * Add the replace selection for text editor command
   */
  export function addReplaceSelectionCommand(
    commands: CommandRegistry,
    tracker: WidgetTracker<IDocumentWidget<FileEditor>>,
    isEnabled: () => boolean
  ) {
    commands.addCommand(CommandIDs.replaceSelection, {
      execute: args => {
        const text: string = (args['text'] as string) || '';
        const widget = tracker.currentWidget;
        if (!widget) {
          return;
        }
        widget.content.editor.replaceSelection?.(text);
      },
      isEnabled,
      label: 'Replace Selection in Editor'
    });
  }

  /**
   * Add the Create Console for Editor command
   */
  export function addCreateConsoleCommand(
    commands: CommandRegistry,
    tracker: WidgetTracker<IDocumentWidget<FileEditor>>,
    isEnabled: () => boolean
  ) {
    commands.addCommand(CommandIDs.createConsole, {
      execute: args => {
        const widget = tracker.currentWidget;

        if (!widget) {
          return;
        }

        return getCreateConsoleFunction(commands)(widget, args);
      },
      isEnabled,
      label: 'Create Console for Editor'
    });
  }

  /**
   * Add the Run Code command
   */
  export function addRunCodeCommand(
    commands: CommandRegistry,
    tracker: WidgetTracker<IDocumentWidget<FileEditor>>,
    isEnabled: () => boolean
  ) {
    commands.addCommand(CommandIDs.runCode, {
      execute: () => {
        // Run the appropriate code, taking into account a ```fenced``` code block.
        const widget = tracker.currentWidget?.content;

        if (!widget) {
          return;
        }

        let code: string | undefined = '';
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

          for (const block of blocks) {
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
            const text = editor.model.value.text;
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
  }

  /**
   * Add the Run All Code command
   */
  export function addRunAllCodeCommand(
    commands: CommandRegistry,
    tracker: WidgetTracker<IDocumentWidget<FileEditor>>,
    isEnabled: () => boolean
  ) {
    commands.addCommand(CommandIDs.runAllCode, {
      execute: () => {
        const widget = tracker.currentWidget?.content;

        if (!widget) {
          return;
        }

        let code = '';
        const editor = widget.editor;
        const text = editor.model.value.text;
        const path = widget.context.path;
        const extension = PathExt.extname(path);

        if (MarkdownCodeBlocks.isMarkdown(extension)) {
          // For Markdown files, run only code blocks.
          const blocks = MarkdownCodeBlocks.findMarkdownCodeBlocks(text);
          for (const block of blocks) {
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
  }

  /**
   * Add markdown preview command
   */
  export function addMarkdownPreviewCommand(
    commands: CommandRegistry,
    tracker: WidgetTracker<IDocumentWidget<FileEditor>>
  ) {
    commands.addCommand(CommandIDs.markdownPreview, {
      execute: () => {
        const widget = tracker.currentWidget;
        if (!widget) {
          return;
        }
        const path = widget.context.path;
        return commands.execute('markdownviewer:open', {
          path,
          options: {
            mode: 'split-right'
          }
        });
      },
      isVisible: () => {
        const widget = tracker.currentWidget;
        return (
          (widget && PathExt.extname(widget.context.path) === '.md') || false
        );
      },
      label: 'Show Markdown Preview'
    });
  }

  /**
   * Add undo command
   */
  export function addUndoCommand(
    commands: CommandRegistry,
    tracker: WidgetTracker<IDocumentWidget<FileEditor>>,
    isEnabled: () => boolean
  ) {
    commands.addCommand(CommandIDs.undo, {
      execute: () => {
        const widget = tracker.currentWidget?.content;

        if (!widget) {
          return;
        }

        widget.editor.undo();
      },
      isEnabled: () => {
        if (!isEnabled()) {
          return false;
        }

        const widget = tracker.currentWidget?.content;

        if (!widget) {
          return false;
        }
        // Ideally enable it when there are undo events stored
        // Reference issue #8590: Code mirror editor could expose the history of undo/redo events
        return true;
      },
      icon: undoIcon.bindprops({ stylesheet: 'menuItem' }),
      label: 'Undo'
    });
  }

  /**
   * Add redo command
   */
  export function addRedoCommand(
    commands: CommandRegistry,
    tracker: WidgetTracker<IDocumentWidget<FileEditor>>,
    isEnabled: () => boolean
  ) {
    commands.addCommand(CommandIDs.redo, {
      execute: () => {
        const widget = tracker.currentWidget?.content;

        if (!widget) {
          return;
        }

        widget.editor.redo();
      },
      isEnabled: () => {
        if (!isEnabled()) {
          return false;
        }

        const widget = tracker.currentWidget?.content;

        if (!widget) {
          return false;
        }
        // Ideally enable it when there are redo events stored
        // Reference issue #8590: Code mirror editor could expose the history of undo/redo events
        return true;
      },
      icon: redoIcon.bindprops({ stylesheet: 'menuItem' }),
      label: 'Redo'
    });
  }

  /**
   * Add cut command
   */
  export function addCutCommand(
    commands: CommandRegistry,
    tracker: WidgetTracker<IDocumentWidget<FileEditor>>,
    isEnabled: () => boolean
  ) {
    commands.addCommand(CommandIDs.cut, {
      execute: () => {
        const widget = tracker.currentWidget?.content;

        if (!widget) {
          return;
        }

        const editor = widget.editor as CodeMirrorEditor;
        const text = getTextSelection(editor);

        Clipboard.copyToSystem(text);
        editor.replaceSelection && editor.replaceSelection('');
      },
      isEnabled: () => {
        if (!isEnabled()) {
          return false;
        }

        const widget = tracker.currentWidget?.content;

        if (!widget) {
          return false;
        }

        // Enable command if there is a text selection in the editor
        return isSelected(widget.editor as CodeMirrorEditor);
      },
      icon: cutIcon.bindprops({ stylesheet: 'menuItem' }),
      label: 'Cut'
    });
  }

  /**
   * Add copy command
   */
  export function addCopyCommand(
    commands: CommandRegistry,
    tracker: WidgetTracker<IDocumentWidget<FileEditor>>,
    isEnabled: () => boolean
  ) {
    commands.addCommand(CommandIDs.copy, {
      execute: () => {
        const widget = tracker.currentWidget?.content;

        if (!widget) {
          return;
        }

        const editor = widget.editor as CodeMirrorEditor;
        const text = getTextSelection(editor);

        Clipboard.copyToSystem(text);
      },
      isEnabled: () => {
        if (!isEnabled()) {
          return false;
        }

        const widget = tracker.currentWidget?.content;

        if (!widget) {
          return false;
        }

        // Enable command if there is a text selection in the editor
        return isSelected(widget.editor as CodeMirrorEditor);
      },
      icon: copyIcon.bindprops({ stylesheet: 'menuItem' }),
      label: 'Copy'
    });
  }

  /**
   * Add paste command
   */
  export function addPasteCommand(
    commands: CommandRegistry,
    tracker: WidgetTracker<IDocumentWidget<FileEditor>>,
    isEnabled: () => boolean
  ) {
    commands.addCommand(CommandIDs.paste, {
      execute: async () => {
        const widget = tracker.currentWidget?.content;

        if (!widget) {
          return;
        }

        const editor: CodeEditor.IEditor = widget.editor;

        // Get data from clipboard
        const clipboard = window.navigator.clipboard;
        const clipboardData: string = await clipboard.readText();

        if (clipboardData) {
          // Paste data to the editor
          editor.replaceSelection && editor.replaceSelection(clipboardData);
        }
      },
      isEnabled: () => Boolean(isEnabled() && tracker.currentWidget?.content),
      icon: pasteIcon.bindprops({ stylesheet: 'menuItem' }),
      label: 'Paste'
    });
  }

  /**
   * Add select all command
   */
  export function addSelectAllCommand(
    commands: CommandRegistry,
    tracker: WidgetTracker<IDocumentWidget<FileEditor>>,
    isEnabled: () => boolean
  ) {
    commands.addCommand(CommandIDs.selectAll, {
      execute: () => {
        const widget = tracker.currentWidget?.content;

        if (!widget) {
          return;
        }

        const editor = widget.editor as CodeMirrorEditor;
        editor.execCommand('selectAll');
      },
      isEnabled: () => Boolean(isEnabled() && tracker.currentWidget?.content),
      label: 'Select All'
    });
  }

  /**
   * Helper function to check if there is a text selection in the editor
   */
  function isSelected(editor: CodeMirrorEditor) {
    const selectionObj = editor.getSelection();
    const { start, end } = selectionObj;
    const selected = start.column !== end.column || start.line !== end.line;

    return selected;
  }

  /**
   * Helper function to get text selection from the editor
   */
  function getTextSelection(editor: CodeMirrorEditor) {
    const selectionObj = editor.getSelection();
    const start = editor.getOffsetAt(selectionObj.start);
    const end = editor.getOffsetAt(selectionObj.end);
    const text = editor.model.value.text.substring(start, end);

    return text;
  }

  /**
   * Function to create a new untitled text file, given the current working directory.
   */
  function createNew(
    commands: CommandRegistry,
    cwd: string,
    ext: string = 'txt'
  ) {
    return commands
      .execute('docmanager:new-untitled', {
        path: cwd,
        type: 'file',
        ext
      })
      .then(model => {
        return commands.execute('docmanager:open', {
          path: model.path,
          factory: FACTORY
        });
      });
  }

  /**
   * Add the New File command
   */
  export function addCreateNewCommand(
    commands: CommandRegistry,
    browserFactory: IFileBrowserFactory
  ) {
    commands.addCommand(CommandIDs.createNew, {
      label: args => (args['isPalette'] ? 'New Text File' : 'Text File'),
      caption: 'Create a new text file',
      icon: args => (args['isPalette'] ? undefined : textEditorIcon),
      execute: args => {
        const cwd = args['cwd'] || browserFactory.defaultBrowser.model.path;
        return createNew(commands, cwd as string);
      }
    });
  }

  /**
   * Add the New Markdown File command
   */
  export function addCreateNewMarkdownCommand(
    commands: CommandRegistry,
    browserFactory: IFileBrowserFactory
  ) {
    commands.addCommand(CommandIDs.createNewMarkdown, {
      label: args =>
        args['isPalette'] ? 'New Markdown File' : 'Markdown File',
      caption: 'Create a new markdown file',
      icon: args => (args['isPalette'] ? undefined : markdownIcon),
      execute: args => {
        const cwd = args['cwd'] || browserFactory.defaultBrowser.model.path;
        return createNew(commands, cwd as string, 'md');
      }
    });
  }

  /**
   * Wrapper function for adding the default launcher items for File Editor
   */
  export function addLauncherItems(launcher: ILauncher) {
    addCreateNewToLauncher(launcher);

    addCreateNewMarkdownToLauncher(launcher);
  }

  /**
   * Add Create New Text File to the Launcher
   */
  export function addCreateNewToLauncher(launcher: ILauncher) {
    launcher.add({
      command: CommandIDs.createNew,
      category: 'Other',
      rank: 1
    });
  }

  /**
   * Add Create New Markdown to the Launcher
   */
  export function addCreateNewMarkdownToLauncher(launcher: ILauncher) {
    launcher.add({
      command: CommandIDs.createNewMarkdown,
      category: 'Other',
      rank: 2
    });
  }

  /**
   * Wrapper function for adding the default items to the File Editor palette
   */
  export function addPaletteItems(palette: ICommandPalette) {
    addChangeTabsCommandsToPalette(palette);

    addCreateNewCommandToPalette(palette);

    addCreateNewMarkdownCommandToPalette(palette);

    addChangeFontSizeCommandsToPalette(palette);
  }

  /**
   * The category for File Editor palette commands for use in addToPalette functions
   */
  const paletteCategory = 'Text Editor';

  /**
   * Add commands to change the tab indentation to the File Editor palette
   */
  export function addChangeTabsCommandsToPalette(palette: ICommandPalette) {
    const args: JSONObject = {
      insertSpaces: false,
      size: 4,
      name: 'Indent with Tab'
    };
    const command = 'fileeditor:change-tabs';
    palette.addItem({ command, args, category: paletteCategory });

    for (const size of [1, 2, 4, 8]) {
      const args: JSONObject = {
        insertSpaces: true,
        size,
        name: `Spaces: ${size} `
      };
      palette.addItem({ command, args, category: paletteCategory });
    }
  }

  /**
   * Add a Create New File command to the File Editor palette
   */
  export function addCreateNewCommandToPalette(palette: ICommandPalette) {
    palette.addItem({
      command: CommandIDs.createNew,
      args: { isPalette: true },
      category: paletteCategory
    });
  }

  /**
   * Add a Create New Markdown command to the File Editor palette
   */
  export function addCreateNewMarkdownCommandToPalette(
    palette: ICommandPalette
  ) {
    palette.addItem({
      command: CommandIDs.createNewMarkdown,
      args: { isPalette: true },
      category: paletteCategory
    });
  }

  /**
   * Add commands to change the font size to the File Editor palette
   */
  export function addChangeFontSizeCommandsToPalette(palette: ICommandPalette) {
    const command = CommandIDs.changeFontSize;

    let args = { name: 'Increase Font Size', delta: 1 };
    palette.addItem({ command, args, category: paletteCategory });

    args = { name: 'Decrease Font Size', delta: -1 };
    palette.addItem({ command, args, category: paletteCategory });
  }

  /**
   * Wrapper function for adding the default menu items for File Editor
   */
  export function addMenuItems(
    menu: IMainMenu,
    commands: CommandRegistry,
    tracker: WidgetTracker<IDocumentWidget<FileEditor>>,
    consoleTracker: IConsoleTracker,
    sessionDialogs: ISessionContextDialogs | null
  ) {
    // Add the editing commands to the settings menu.
    addEditingCommandsToSettingsMenu(menu, commands);

    // Add new text file creation to the file menu.
    addCreateNewFileToFileMenu(menu);

    // Add new markdown file creation to the file menu.
    addCreateNewMarkdownFileToFileMenu(menu);

    // Add undo/redo hooks to the edit menu.
    addUndoRedoToEditMenu(menu, tracker);

    // Add editor view options.
    addEditorViewerToViewMenu(menu, tracker);

    // Add a console creator the the file menu.
    addConsoleCreatorToFileMenu(menu, commands, tracker);

    // Add a code runner to the run menu.
    addCodeRunnersToRunMenu(
      menu,
      commands,
      tracker,
      consoleTracker,
      sessionDialogs
    );
  }

  /**
   * Add File Editor editing commands to the Settings menu, including:
   * Indent with Tab, Tab Spaces, Change Font Size, and auto closing brackets
   */
  export function addEditingCommandsToSettingsMenu(
    menu: IMainMenu,
    commands: CommandRegistry
  ) {
    const tabMenu = new Menu({ commands });
    tabMenu.title.label = 'Text Editor Indentation';
    const args: JSONObject = {
      insertSpaces: false,
      size: 4,
      name: 'Indent with Tab'
    };
    const command = 'fileeditor:change-tabs';
    tabMenu.addItem({ command, args });

    for (const size of [1, 2, 4, 8]) {
      const args: JSONObject = {
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

  /**
   * Add a Create New File command to the File menu
   */
  export function addCreateNewFileToFileMenu(menu: IMainMenu) {
    menu.fileMenu.newMenu.addGroup([{ command: CommandIDs.createNew }], 30);
  }

  /**
   * Add a Create New Markdown File command to the File menu
   */
  export function addCreateNewMarkdownFileToFileMenu(menu: IMainMenu) {
    menu.fileMenu.newMenu.addGroup(
      [{ command: CommandIDs.createNewMarkdown }],
      30
    );
  }

  /**
   * Add File Editor undo and redo widgets to the Edit menu
   */
  export function addUndoRedoToEditMenu(
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

  /**
   * Add a File Editor editor viewer to the View Menu
   */
  export function addEditorViewerToViewMenu(
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

  /**
   * Add a File Editor console creator to the File menu
   */
  export function addConsoleCreatorToFileMenu(
    menu: IMainMenu,
    commands: CommandRegistry,
    tracker: WidgetTracker<IDocumentWidget<FileEditor>>
  ) {
    const createConsole: (
      widget: IDocumentWidget<FileEditor>
    ) => Promise<void> = getCreateConsoleFunction(commands);
    menu.fileMenu.consoleCreators.add({
      tracker,
      name: 'Editor',
      createConsole
    } as IFileMenu.IConsoleCreator<IDocumentWidget<FileEditor>>);
  }

  /**
   * Add a File Editor code runner to the Run menu
   */
  export function addCodeRunnersToRunMenu(
    menu: IMainMenu,
    commands: CommandRegistry,
    tracker: WidgetTracker<IDocumentWidget<FileEditor>>,
    consoleTracker: IConsoleTracker,
    sessionDialogs: ISessionContextDialogs | null
  ) {
    menu.runMenu.codeRunners.add({
      tracker,
      noun: 'Code',
      isEnabled: current =>
        !!consoleTracker.find(
          widget => widget.sessionContext.session?.path === current.context.path
        ),
      run: () => commands.execute(CommandIDs.runCode),
      runAll: () => commands.execute(CommandIDs.runAllCode),
      restartAndRunAll: current => {
        const widget = consoleTracker.find(
          widget => widget.sessionContext.session?.path === current.context.path
        );
        if (widget) {
          return (sessionDialogs || sessionContextDialogs)
            .restart(widget.sessionContext)
            .then(restarted => {
              if (restarted) {
                void commands.execute(CommandIDs.runAllCode);
              }
              return restarted;
            });
        }
      }
    } as IRunMenu.ICodeRunner<IDocumentWidget<FileEditor>>);
  }

  /**
   * Wrapper function for adding the default items to the File Editor context menu
   */
  export function addContextMenuItems(app: JupyterFrontEnd) {
    addCreateConsoleToContextMenu(app);
    addMarkdownPreviewToContextMenu(app);
    addUndoCommandToContextMenu(app);
    addRedoCommandToContextMenu(app);
    addCutCommandToContextMenu(app);
    addCopyCommandToContextMenu(app);
    addPasteCommandToContextMenu(app);
    addSelectAllCommandToContextMenu(app);
  }

  /**
   * Add a Create Console item to the File Editor context menu
   */
  export function addCreateConsoleToContextMenu(app: JupyterFrontEnd) {
    app.contextMenu.addItem({
      command: CommandIDs.createConsole,
      selector: '.jp-FileEditor'
    });
  }

  /**
   * Add a Markdown Preview item to the File Editor context menu
   */
  export function addMarkdownPreviewToContextMenu(app: JupyterFrontEnd) {
    app.contextMenu.addItem({
      command: CommandIDs.markdownPreview,
      selector: '.jp-FileEditor'
    });
  }

  /**
   * Add a Undo item to the File Editor context menu
   */
  export function addUndoCommandToContextMenu(app: JupyterFrontEnd) {
    app.contextMenu.addItem({
      command: CommandIDs.undo,
      selector: '.jp-FileEditor',
      rank: 1
    });
  }

  /**
   * Add a Redo item to the File Editor context menu
   */
  export function addRedoCommandToContextMenu(app: JupyterFrontEnd) {
    app.contextMenu.addItem({
      command: CommandIDs.redo,
      selector: '.jp-FileEditor',
      rank: 2
    });
  }

  /**
   * Add a Cut item to the File Editor context menu
   */
  export function addCutCommandToContextMenu(app: JupyterFrontEnd) {
    app.contextMenu.addItem({
      command: CommandIDs.cut,
      selector: '.jp-FileEditor',
      rank: 3
    });
  }

  /**
   * Add a Copy item to the File Editor context menu
   */
  export function addCopyCommandToContextMenu(app: JupyterFrontEnd) {
    app.contextMenu.addItem({
      command: CommandIDs.copy,
      selector: '.jp-FileEditor',
      rank: 4
    });
  }

  /**
   * Add a Paste item to the File Editor context menu
   */
  export function addPasteCommandToContextMenu(app: JupyterFrontEnd) {
    app.contextMenu.addItem({
      command: CommandIDs.paste,
      selector: '.jp-FileEditor',
      rank: 5
    });
  }

  /**
   * Add a Select All item to the File Editor context menu
   */
  export function addSelectAllCommandToContextMenu(app: JupyterFrontEnd) {
    app.contextMenu.addItem({
      command: CommandIDs.selectAll,
      selector: '.jp-FileEditor',
      rank: 6
    });
  }
}
