// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterLab, JupyterLabPlugin, CommandIDs as ApplicationCommandIDs
} from '../application';

import {
  CommandIDs as CommandPaletteCommandIDs
} from '../commandpalette';

import {
  CommandIDs as CompleterCommandIDs, COMPLETABLE_CLASS
} from '../completer';

import {
  CommandIDs as ConsoleCommandIDs
} from '../console';

import {
  CommandIDs as EditorWidgetCommandIDs
} from '../editorwidget';

import {
  CommandIDs as FileBrowserCommandIDs
} from '../filebrowser';

import {
  CommandIDs as HelpCommandIDs
} from '../help';

import {
  CommandIDs as ImageWidgetCommandIDs
} from '../imagewidget';

import {
  CommandIDs as InspectorCommandIDs
} from '../inspector';

import {
  CommandIDs as NotebookCommandIDs
} from '../notebook';

import {
  CommandIDs as TooltipCommandIDs
} from '../tooltip';


/**
 * The list of default application shortcuts.
 *
 * #### Notes
 * When setting shortcut selectors, there are two concepts to consider:
 * specificity and matchability. These two interact in sometimes
 * counterintuitive ways. Keyboard events are triggered from an element and
 * they propagate up the DOM until they reach the `documentElement` (`<body>`).
 *
 * When a registered shortcut sequence is fired, the shortcut manager checks
 * the node that fired the event and each of its ancestors until a node matches
 * one or more registered selectors. The *first* matching selector in the
 * chain of ancestors will invoke the shortcut handler and the traversal will
 * end at that point. If a node matches more than one selector, the handler for
 * whichever selector is more *specific* fires.
 * @see https://www.w3.org/TR/css3-selectors/#specificity
 *
 * The practical consequence of this is that a very broadly matching selector,
 * e.g. `'*'` or `'div'` may match and therefore invoke a handler *before* a
 * more specific selector. The most common pitfall is to use the universal
 * (`'*'`) selector. For almost any use case where a global keyboard shortcut is
 * required, using the `'body'` selector is more appropriate.
 */
const SHORTCUTS = [
  {
    command: ApplicationCommandIDs.activateNextTab,
    selector: 'body',
    keys: ['Accel ArrowRight']
  },
  {
    command: ApplicationCommandIDs.activatePreviousTab,
    selector: 'body',
    keys: ['Accel ArrowLeft']
  },
  {
    command: CommandPaletteCommandIDs.activate,
    selector: 'body',
    keys: ['Accel Shift P']
  },
  {
    command: CompleterCommandIDs.invokeConsole,
    selector: `.jp-ConsolePanel .${COMPLETABLE_CLASS}`,
    keys: ['Tab']
  },
  {
    command: CompleterCommandIDs.invokeNotebook,
    selector: `.jp-Notebook .${COMPLETABLE_CLASS}`,
    keys: ['Tab']
  },
  {
    command: ConsoleCommandIDs.run,
    selector: '.jp-CodeConsole-prompt',
    keys: ['Enter']
  },
  {
    command: ConsoleCommandIDs.runForced,
    selector: '.jp-CodeConsole-prompt',
    keys: ['Shift Enter']
  },
  {
    command: ConsoleCommandIDs.linebreak,
    selector: '.jp-CodeConsole-prompt',
    keys: ['Ctrl Enter']
  },
  {
    command: EditorWidgetCommandIDs.runCode,
    selector: '.jp-EditorWidget',
    keys: ['Shift Enter']
  },
  {
    command: FileBrowserCommandIDs.toggleBrowser,
    selector: 'body',
    keys: ['Accel Shift F']
  },
  {
    command: FileBrowserCommandIDs.newTextFile,
    selector: 'body',
    keys: ['Ctrl O']
  },
  {
    command: FileBrowserCommandIDs.newNotebook,
    selector: 'body',
    keys: ['Ctrl Shift N']
  },
  {
    command: FileBrowserCommandIDs.save,
    selector: '.jp-Document',
    keys: ['Accel S']
  },
  {
    command: FileBrowserCommandIDs.close,
    selector: '.jp-Document',
    keys: ['Ctrl Q']
  },
  {
    command: FileBrowserCommandIDs.closeAllFiles,
    selector: '.jp-Document',
    keys: ['Ctrl Shift Q']
  },
  {
    command: HelpCommandIDs.toggle,
    selector: 'body',
    keys: ['Accel Shift H']
  },
  {
    command: ImageWidgetCommandIDs.zoomIn,
    selector: '.jp-ImageWidget',
    keys: ['=']
  },
  {
    command: ImageWidgetCommandIDs.zoomOut,
    selector: '.jp-ImageWidget',
    keys: ['-']
  },
  {
    command: ImageWidgetCommandIDs.resetZoom,
    selector: '.jp-ImageWidget',
    keys: ['0']
  },
  {
    command: InspectorCommandIDs.open,
    selector: '.jp-CodeConsole-prompt',
    keys: ['Accel I']
  },
  {
    command: NotebookCommandIDs.runAndAdvance,
    selector: '.jp-Notebook',
    keys: ['Shift Enter']
  },
  {
    command: NotebookCommandIDs.runAndInsert,
    selector: '.jp-Notebook',
    keys: ['Alt Enter']
  },
  {
    command: NotebookCommandIDs.run,
    selector: '.jp-Notebook',
    keys: ['Ctrl Enter']
  },
  {
    command: NotebookCommandIDs.interrupt,
    selector: '.jp-Notebook.jp-mod-commandMode:focus',
    keys: ['I', 'I']
  },
  {
    command: NotebookCommandIDs.restart,
    selector: '.jp-Notebook.jp-mod-commandMode:focus',
    keys: ['0', '0']
  },
  {
    command: NotebookCommandIDs.toCode,
    selector: '.jp-Notebook.jp-mod-commandMode:focus',
    keys: ['Y']
  },
  {
    command: NotebookCommandIDs.toMarkdown,
    selector: '.jp-Notebook.jp-mod-commandMode:focus',
    keys: ['M']
  },
  {
    command: NotebookCommandIDs.toRaw,
    selector: '.jp-Notebook.jp-mod-commandMode:focus',
    keys: ['R']
  },
  {
    command: NotebookCommandIDs.deleteCell,
    selector: '.jp-Notebook.jp-mod-commandMode:focus',
    keys: ['D', 'D'],
  },
  {
    command: NotebookCommandIDs.split,
    selector: '.jp-Notebook.jp-mod-editMode',
    keys: ['Ctrl Shift -'],
  },
  {
    command: NotebookCommandIDs.merge,
    selector: '.jp-Notebook.jp-mod-commandMode:focus',
    keys: ['Shift M'],
  },
  {
    command: NotebookCommandIDs.selectAbove,
    selector: '.jp-Notebook.jp-mod-commandMode:focus',
    keys: ['ArrowUp'],
  },
  {
    command: NotebookCommandIDs.selectAbove,
    selector: '.jp-Notebook.jp-mod-commandMode:focus',
    keys: ['K'],
  },
  {
    command: NotebookCommandIDs.selectBelow,
    selector: '.jp-Notebook.jp-mod-commandMode:focus',
    keys: ['ArrowDown'],
  },
  {
    command: NotebookCommandIDs.selectBelow,
    selector: '.jp-Notebook.jp-mod-commandMode:focus',
    keys: ['J'],
  },
  {
    command: NotebookCommandIDs.extendAbove,
    selector: '.jp-Notebook.jp-mod-commandMode:focus',
    keys: ['Shift ArrowUp'],
  },
  {
    command: NotebookCommandIDs.extendAbove,
    selector: '.jp-Notebook.jp-mod-commandMode:focus',
    keys: ['Shift K'],
  },
  {
    command: NotebookCommandIDs.extendBelow,
    selector: '.jp-Notebook.jp-mod-commandMode:focus',
    keys: ['Shift ArrowDown'],
  },
  {
    command: NotebookCommandIDs.extendBelow,
    selector: '.jp-Notebook.jp-mod-commandMode:focus',
    keys: ['Shift J'],
  },
  {
    command: NotebookCommandIDs.undo,
    selector: '.jp-Notebook.jp-mod-commandMode:focus',
    keys: ['Z'],
  },
  {
    command: NotebookCommandIDs.redo,
    selector: '.jp-Notebook.jp-mod-commandMode:focus',
    keys: ['Shift Z'],
  },
  {
    command: NotebookCommandIDs.cut,
    selector: '.jp-Notebook.jp-mod-commandMode:focus',
    keys: ['X']
  },
  {
    command: NotebookCommandIDs.copy,
    selector: '.jp-Notebook.jp-mod-commandMode:focus',
    keys: ['C']
  },
  {
    command: NotebookCommandIDs.paste,
    selector: '.jp-Notebook.jp-mod-commandMode:focus',
    keys: ['V']
  },
  {
    command: NotebookCommandIDs.insertAbove,
    selector: '.jp-Notebook.jp-mod-commandMode:focus',
    keys: ['A']
  },
  {
    command: NotebookCommandIDs.insertBelow,
    selector: '.jp-Notebook.jp-mod-commandMode:focus',
    keys: ['B']
  },
  {
    command: NotebookCommandIDs.toggleLines,
    selector: '.jp-Notebook.jp-mod-commandMode:focus',
    keys: ['L']
  },
  {
    command: NotebookCommandIDs.markdown1,
    selector: '.jp-Notebook.jp-mod-commandMode:focus',
    keys: ['1']
  },
  {
    command: NotebookCommandIDs.markdown2,
    selector: '.jp-Notebook.jp-mod-commandMode:focus',
    keys: ['2']
  },
  {
    command: NotebookCommandIDs.markdown3,
    selector: '.jp-Notebook.jp-mod-commandMode:focus',
    keys: ['3']
  },
  {
    command: NotebookCommandIDs.markdown4,
    selector: '.jp-Notebook.jp-mod-commandMode:focus',
    keys: ['4']
  },
  {
    command: NotebookCommandIDs.markdown5,
    selector: '.jp-Notebook.jp-mod-commandMode:focus',
    keys: ['5']
  },
  {
    command: NotebookCommandIDs.markdown6,
    selector: '.jp-Notebook.jp-mod-commandMode:focus',
    keys: ['6']
  },
  {
    command: NotebookCommandIDs.editMode,
    selector: '.jp-Notebook.jp-mod-commandMode:focus',
    keys: ['Enter']
  },
  {
    command: NotebookCommandIDs.commandMode,
    selector: '.jp-Notebook.jp-mod-editMode',
    keys: ['Escape']
  },
  {
    command: NotebookCommandIDs.commandMode,
    selector: '.jp-Notebook.jp-mod-editMode',
    keys: ['Ctrl M']
  },
  {
    command: TooltipCommandIDs.launchNotebook,
    selector: '.jp-Notebook',
    keys: ['Shift Tab']
  },
  {
    command: TooltipCommandIDs.launchConsole,
    selector: '.jp-ConsolePanel',
    keys: ['Shift Tab']
  }
];


/**
 * The default shortcuts extension.
 */
const plugin: JupyterLabPlugin<void> = {
  id: 'jupyter.extensions.shortcuts',
  activate: (app: JupyterLab): void => {
    SHORTCUTS.forEach(shortcut => { app.commands.addKeyBinding(shortcut); });
  },
  autoStart: true
};


/**
 * Export the plugin as default.
 */
export default plugin;
