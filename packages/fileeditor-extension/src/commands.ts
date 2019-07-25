// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { WidgetTracker } from '@jupyterlab/apputils';

import { IConsoleTracker } from '@jupyterlab/console';

import { IDocumentWidget } from '@jupyterlab/docregistry';

import { FileEditor } from '@jupyterlab/fileeditor';

import {
  IEditMenu,
  IFileMenu,
  IMainMenu,
  IRunMenu,
  IViewMenu
} from '@jupyterlab/mainmenu';

import { CommandRegistry } from '@phosphor/commands';

import { JSONObject } from '@phosphor/coreutils';

import { Menu } from '@phosphor/widgets';

import { CommandIDs } from './index';

export default class Commands {
  static addMenuItems(
    menu: IMainMenu,
    commands: CommandRegistry,
    tracker: WidgetTracker<IDocumentWidget<FileEditor>>,
    consoleTracker: IConsoleTracker,
    createConsole: (widget: IDocumentWidget<FileEditor>) => Promise<void>
  ) {
    // Add the editing commands to the settings menu.
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

    // Add new text file creation to the file menu.
    menu.fileMenu.newMenu.addGroup([{ command: CommandIDs.createNew }], 30);

    // Add new markdown file creation to the file menu.
    menu.fileMenu.newMenu.addGroup(
      [{ command: CommandIDs.createNewMarkdown }],
      30
    );

    // Add undo/redo hooks to the edit menu.
    menu.editMenu.undoers.add({
      tracker,
      undo: widget => {
        widget.content.editor.undo();
      },
      redo: widget => {
        widget.content.editor.redo();
      }
    } as IEditMenu.IUndoer<IDocumentWidget<FileEditor>>);

    // Add editor view options.
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

    // Add a console creator the the Kernel menu.
    menu.fileMenu.consoleCreators.add({
      tracker,
      name: 'Editor',
      createConsole
    } as IFileMenu.IConsoleCreator<IDocumentWidget<FileEditor>>);

    // Add a code runner to the Run menu.
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
}
