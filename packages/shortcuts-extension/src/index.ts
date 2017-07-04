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
    command: 'application:activate-next-tab',
    selector: 'body',
    keys: ['Ctrl Shift ]']
  },
  {
    command: 'application:activate-previous-tab',
    selector: 'body',
    keys: ['Ctrl Shift [']
  },
  {
    command: 'application:toggle-mode',
    selector: 'body',
    keys: ['Accel Shift Enter']
  },
  {
    command: 'chatbox:post',
    selector: '.jp-Chatbox-prompt',
    keys: ['Enter']
  },
  {
    command: 'chatbox:linebreak',
    selector: '.jp-Chatbox-prompt',
    keys: ['Ctrl Enter']
  },
  {
    command: 'command-palette:activate',
    selector: 'body',
    keys: ['Accel Shift C']
  },
  {
    command: 'completer:invoke-console',
    selector: '.jp-CodeConsole-promptCell .jp-mod-completer-enabled',
    keys: ['Tab']
  },
  {
    command: 'completer:invoke-notebook',
    selector: '.jp-Notebook.jp-mod-editMode .jp-mod-completer-enabled',
    keys: ['Tab']
  },
  {
    command: 'console:linebreak',
    selector: '.jp-CodeConsole-promptCell',
    keys: ['Ctrl Enter']
  },
  {
    command: 'console:run',
    selector: '.jp-CodeConsole-promptCell',
    keys: ['Enter']
  },
  {
    command: 'fileeditor:run-code',
    selector: '.jp-FileEditor',
    keys: ['Shift Enter']
  },
  {
    command: 'console:run-forced',
    selector: '.jp-CodeConsole-promptCell',
    keys: ['Shift Enter']
  },
  {
    command: 'filebrowser:toggle-main',
    selector: 'body',
    keys: ['Accel Shift F']
  },
  {
    command: 'docmanager:create-launcher',
    selector: 'body',
    keys: ['Accel Shift L']
  },
  {
    command: 'docmanager:save',
    selector: 'body',
    keys: ['Accel S']
  },
  {
    command: 'docmanager:close',
    selector: '.jp-Activity',
    keys: ['Ctrl Q']
  },
  {
    command: 'help:toggle',
    selector: 'body',
    keys: ['Ctrl Shift H']
  },
  {
    command: 'imageviewer:reset-zoom',
    selector: '.jp-ImageViewer',
    keys: ['0']
  },
  {
    command: 'imageviewer:zoom-in',
    selector: '.jp-ImageViewer',
    keys: ['=']
  },
  {
    command: 'imageviewer:zoom-out',
    selector: '.jp-ImageViewer',
    keys: ['-']
  },
  {
    command: 'inspector:open',
    selector: 'body',
    keys: ['Accel I']
  },
  {
    command: 'notebook:run-cell-and-select-next',
    selector: '.jp-Notebook:focus',
    keys: ['Shift Enter']
  },
  {
    command: 'notebook:run-cell-and-insert-below',
    selector: '.jp-Notebook:focus',
    keys: ['Alt Enter']
  },
  {
    command: 'notebook:run-cell',
    selector: '.jp-Notebook:focus',
    keys: ['Ctrl Enter']
  },
  {
    command: 'notebook:run-cell-and-select-next',
    selector: '.jp-Notebook.jp-mod-editMode',
    keys: ['Shift Enter']
  },
  {
    command: 'notebook:run-cell-and-insert-below',
    selector: '.jp-Notebook.jp-mod-editMode',
    keys: ['Alt Enter']
  },
  {
    command: 'notebook:run-cell',
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
    command: 'notebook:change-cell-to-code',
    selector: '.jp-Notebook:focus',
    keys: ['Y']
  },
  {
    command: 'notebook:change-cell-to-markdown',
    selector: '.jp-Notebook:focus',
    keys: ['M']
  },
  {
    command: 'notebook:change-cell-to-raw',
    selector: '.jp-Notebook:focus',
    keys: ['R']
  },
  {
    command: 'notebook:delete-cell',
    selector: '.jp-Notebook:focus',
    keys: ['D', 'D'],
  },
  {
    command: 'notebook:split-cell-at-cursor',
    selector: '.jp-Notebook.jp-mod-editMode',
    keys: ['Ctrl Shift -'],
  },
  {
    command: 'notebook:merge-cells',
    selector: '.jp-Notebook:focus',
    keys: ['Shift M'],
  },
  {
    command: 'notebook:move-cursor-up',
    selector: '.jp-Notebook:focus',
    keys: ['ArrowUp'],
  },
  {
    command: 'notebook:move-cursor-up',
    selector: '.jp-Notebook:focus',
    keys: ['K'],
  },
  {
    command: 'notebook:move-cursor-down',
    selector: '.jp-Notebook:focus',
    keys: ['ArrowDown'],
  },
  {
    command: 'notebook:move-cursor-down',
    selector: '.jp-Notebook:focus',
    keys: ['J'],
  },
  {
    command: 'notebook:extend-marked-cells-above',
    selector: '.jp-Notebook:focus',
    keys: ['Shift ArrowUp'],
  },
  {
    command: 'notebook:extend-marked-cells-above',
    selector: '.jp-Notebook:focus',
    keys: ['Shift K'],
  },
  {
    command: 'notebook:extend-marked-cells-below',
    selector: '.jp-Notebook:focus',
    keys: ['Shift ArrowDown'],
  },
  {
    command: 'notebook:extend-marked-cells-below',
    selector: '.jp-Notebook:focus',
    keys: ['Shift J'],
  },
  {
    command: 'notebook:undo-cell-action',
    selector: '.jp-Notebook:focus',
    keys: ['Z'],
  },
  {
    command: 'notebook:redo-cell-action',
    selector: '.jp-Notebook:focus',
    keys: ['Shift Z'],
  },
  {
    command: 'notebook:cut-cell',
    selector: '.jp-Notebook:focus',
    keys: ['X']
  },
  {
    command: 'notebook:copy-cell',
    selector: '.jp-Notebook:focus',
    keys: ['C']
  },
  {
    command: 'notebook:paste-cell',
    selector: '.jp-Notebook:focus',
    keys: ['V']
  },
  {
    command: 'notebook:insert-cell-above',
    selector: '.jp-Notebook:focus',
    keys: ['A']
  },
  {
    command: 'notebook:insert-cell-below',
    selector: '.jp-Notebook:focus',
    keys: ['B']
  },
  {
    command: 'notebook:toggle-cell-line-numbers',
    selector: '.jp-Notebook:focus',
    keys: ['L']
  },
  {
    command: 'notebook:toggle-all-cell-line-numbers',
    selector: '.jp-Notebook:focus',
    keys: ['Shift L']
  },
  {
    command: 'notebook:change-to-cell-heading-1',
    selector: '.jp-Notebook:focus',
    keys: ['1']
  },
  {
    command: 'notebook:change-to-cell-heading-2',
    selector: '.jp-Notebook:focus',
    keys: ['2']
  },
  {
    command: 'notebook:change-to-cell-heading-3',
    selector: '.jp-Notebook:focus',
    keys: ['3']
  },
  {
    command: 'notebook:change-to-cell-heading-4',
    selector: '.jp-Notebook:focus',
    keys: ['4']
  },
  {
    command: 'notebook:change-to-cell-heading-5',
    selector: '.jp-Notebook:focus',
    keys: ['5']
  },
  {
    command: 'notebook:change-to-cell-heading-6',
    selector: '.jp-Notebook:focus',
    keys: ['6']
  },
  {
    command: 'notebook:enter-edit-mode',
    selector: '.jp-Notebook:focus',
    keys: ['Enter']
  },
  {
    command: 'notebook:enter-command-mode',
    selector: '.jp-Notebook.jp-mod-editMode',
    keys: ['Escape']
  },
  {
    command: 'notebook:enter-command-mode',
    selector: '.jp-Notebook.jp-mod-editMode',
    keys: ['Ctrl M']
  },
  {
    command: 'settingeditor:open',
    selector: 'body',
    keys: ['Accel ,']
  },
  {
    command: 'tooltip:launch-notebook',
    selector: '.jp-Notebook.jp-mod-editMode .jp-InputArea-editor:not(.jp-mod-has-primary-selection)',
    keys: ['Shift Tab']
  },
  {
    command: 'tooltip:launch-console',
    selector: '.jp-CodeConsole-promptCell .jp-InputArea-editor:not(.jp-mod-has-primary-selection)',
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
