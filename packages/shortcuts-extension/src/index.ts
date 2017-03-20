// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';


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
    command: 'main-jupyterlab:activate-next-tab',
    selector: 'body',
    keys: ['Ctrl Shift ]']
  },
  {
    command: 'main-jupyterlab:activate-previous-tab',
    selector: 'body',
    keys: ['Ctrl Shift [']
  },
  {
    command: 'command-palette:activate',
    selector: 'body',
    keys: ['Accel Shift P']
  },
  {
    command: 'completer:invoke-console',
    selector: '.jp-CodeConsole-prompt .jp-mod-completer-enabled',
    keys: ['Tab']
  },
  {
    command: 'completer:invoke-notebook',
    selector: '.jp-Notebook.jp-mod-editMode .jp-mod-completer-enabled',
    keys: ['Tab']
  },
  {
    command: 'console:run',
    selector: '.jp-CodeConsole-prompt',
    keys: ['Enter']
  },
  {
    command: 'console:run-forced',
    selector: '.jp-CodeConsole-prompt',
    keys: ['Shift Enter']
  },
  {
    command: 'console:linebreak',
    selector: '.jp-CodeConsole-prompt',
    keys: ['Ctrl Enter']
  },
  {
    command: 'editor:run-code',
    selector: '.jp-EditorWidget',
    keys: ['Shift Enter']
  },
  {
    command: 'file-browser:toggle',
    selector: 'body',
    keys: ['Accel Shift F']
  },
  {
    command: 'file-operations:new-text-file',
    selector: 'body',
    keys: ['Ctrl O']
  },
  {
    command: 'file-operations:new-notebook',
    selector: 'body',
    keys: ['Ctrl Shift N']
  },
  {
    command: 'file-operations:save',
    selector: '.jp-Document',
    keys: ['Accel S']
  },
  {
    command: 'file-operations:close',
    selector: '.jp-Document',
    keys: ['Ctrl Q']
  },
  {
    command: 'file-operations:close-all-files',
    selector: '.jp-Document',
    keys: ['Ctrl Shift Q']
  },
  {
    command: 'help-jupyterlab:toggle',
    selector: 'body',
    keys: ['Accel Shift H']
  },
  {
    command: 'imagewidget:zoom-in',
    selector: '.jp-ImageWidget',
    keys: ['=']
  },
  {
    command: 'imagewidget:zoom-out',
    selector: '.jp-ImageWidget',
    keys: ['-']
  },
  {
    command: 'imagewidget:reset-zoom',
    selector: '.jp-ImageWidget',
    keys: ['0']
  },
  {
    command: 'inspector:open',
    selector: '.jp-CodeConsole-prompt',
    keys: ['Accel I']
  },
  {
    command: 'notebook-cells:run-and-advance',
    selector: '.jp-Notebook:focus',
    keys: ['Shift Enter']
  },
  {
    command: 'notebook-cells:run-and-insert',
    selector: '.jp-Notebook:focus',
    keys: ['Alt Enter']
  },
  {
    command: 'notebook-cells:run',
    selector: '.jp-Notebook:focus',
    keys: ['Ctrl Enter']
  },
  {
    command: 'notebook-cells:run-and-advance',
    selector: '.jp-Notebook.jp-mod-editMode',
    keys: ['Shift Enter']
  },
  {
    command: 'notebook-cells:run-and-insert',
    selector: '.jp-Notebook.jp-mod-editMode',
    keys: ['Alt Enter']
  },
  {
    command: 'notebook-cells:run',
    selector: '.jp-Notebook.jp-mod-editMode',
    keys: ['Ctrl Enter']
  },
  {
    command: 'notebook:interrupt-kernel',
    selector: '.jp-Notebook:focus',
    keys: ['I', 'I']
  },
  {
    command: 'notebook:restart-kernel',
    selector: '.jp-Notebook:focus',
    keys: ['0', '0']
  },
  {
    command: 'notebook-cells:to-code',
    selector: '.jp-Notebook:focus',
    keys: ['Y']
  },
  {
    command: 'notebook-cells:to-markdown',
    selector: '.jp-Notebook:focus',
    keys: ['M']
  },
  {
    command: 'notebook-cells:to-raw',
    selector: '.jp-Notebook:focus',
    keys: ['R']
  },
  {
    command: 'notebook-cells:delete',
    selector: '.jp-Notebook:focus',
    keys: ['D', 'D'],
  },
  {
    command: 'notebook-cells:split',
    selector: '.jp-Notebook.jp-mod-editMode',
    keys: ['Ctrl Shift -'],
  },
  {
    command: 'notebook-cells:merge',
    selector: '.jp-Notebook:focus',
    keys: ['Shift M'],
  },
  {
    command: 'notebook-cells:select-above',
    selector: '.jp-Notebook:focus',
    keys: ['ArrowUp'],
  },
  {
    command: 'notebook-cells:select-above',
    selector: '.jp-Notebook:focus',
    keys: ['K'],
  },
  {
    command: 'notebook-cells:select-below',
    selector: '.jp-Notebook:focus',
    keys: ['ArrowDown'],
  },
  {
    command: 'notebook-cells:select-below',
    selector: '.jp-Notebook:focus',
    keys: ['J'],
  },
  {
    command: 'notebook-cells:extend-above',
    selector: '.jp-Notebook:focus',
    keys: ['Shift ArrowUp'],
  },
  {
    command: 'notebook-cells:extend-above',
    selector: '.jp-Notebook:focus',
    keys: ['Shift K'],
  },
  {
    command: 'notebook-cells:extend-below',
    selector: '.jp-Notebook:focus',
    keys: ['Shift ArrowDown'],
  },
  {
    command: 'notebook-cells:extend-below',
    selector: '.jp-Notebook:focus',
    keys: ['Shift J'],
  },
  {
    command: 'notebook-cells:undo',
    selector: '.jp-Notebook:focus',
    keys: ['Z'],
  },
  {
    command: 'notebook-cells:redo',
    selector: '.jp-Notebook:focus',
    keys: ['Shift Z'],
  },
  {
    command: 'notebook-cells:cut',
    selector: '.jp-Notebook:focus',
    keys: ['X']
  },
  {
    command: 'notebook-cells:copy',
    selector: '.jp-Notebook:focus',
    keys: ['C']
  },
  {
    command: 'notebook-cells:paste',
    selector: '.jp-Notebook:focus',
    keys: ['V']
  },
  {
    command: 'notebook-cells:insert-above',
    selector: '.jp-Notebook:focus',
    keys: ['A']
  },
  {
    command: 'notebook-cells:insert-below',
    selector: '.jp-Notebook:focus',
    keys: ['B']
  },
  {
    command: 'notebook-cells:toggle-line-numbers',
    selector: '.jp-Notebook:focus',
    keys: ['L']
  },
  {
    command: 'notebook-cells:markdown-header1',
    selector: '.jp-Notebook:focus',
    keys: ['1']
  },
  {
    command: 'notebook-cells:markdown-header2',
    selector: '.jp-Notebook:focus',
    keys: ['2']
  },
  {
    command: 'notebook-cells:markdown-header3',
    selector: '.jp-Notebook:focus',
    keys: ['3']
  },
  {
    command: 'notebook-cells:markdown-header4',
    selector: '.jp-Notebook:focus',
    keys: ['4']
  },
  {
    command: 'notebook-cells:markdown-header5',
    selector: '.jp-Notebook:focus',
    keys: ['5']
  },
  {
    command: 'notebook-cells:markdown-header6',
    selector: '.jp-Notebook:focus',
    keys: ['6']
  },
  {
    command: 'notebook:edit-mode',
    selector: '.jp-Notebook:focus',
    keys: ['Enter']
  },
  {
    command: 'notebook:command-mode',
    selector: '.jp-Notebook.jp-mod-editMode',
    keys: ['Escape']
  },
  {
    command: 'notebook:command-mode',
    selector: '.jp-Notebook.jp-mod-editMode',
    keys: ['Ctrl M']
  },
  {
    command: 'tooltip:launch-notebook',
    selector: '.jp-Notebook.jp-mod-editMode',
    keys: ['Shift Tab']
  },
  {
    command: 'tooltip:launch-console',
    selector: '.jp-CodeConsole-prompt',
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
