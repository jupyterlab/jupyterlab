// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

export * from './actions';
export * from './default-toolbar';
export * from './model';
export * from './modelfactory';
export * from './panel';
export * from './tracker';
export * from './trust';
export * from './widget';
export * from './widgetfactory';


/**
 * The map of command ids used by the notebook plugin.
 */
export
const cmdIds = {
  interrupt: 'notebook:interrupt-kernel',
  restart: 'notebook:restart-kernel',
  restartClear: 'notebook:restart-clear',
  restartRunAll: 'notebook:restart-runAll',
  switchKernel: 'notebook:switch-kernel',
  clearAllOutputs: 'notebook:clear-outputs',
  closeAndHalt: 'notebook:close-and-halt',
  trust: 'notebook:trust',
  run: 'notebook-cells:run',
  runAndAdvance: 'notebook-cells:run-and-advance',
  runAndInsert: 'notebook-cells:run-and-insert',
  runAll: 'notebook:run-all',
  toCode: 'notebook-cells:to-code',
  toMarkdown: 'notebook-cells:to-markdown',
  toRaw: 'notebook-cells:to-raw',
  cut: 'notebook-cells:cut',
  copy: 'notebook-cells:copy',
  paste: 'notebook-cells:paste',
  moveUp: 'notebook-cells:move-up',
  moveDown: 'notebook-cells:move-down',
  clearOutputs: 'notebook-cells:clear-output',
  deleteCell: 'notebook-cells:delete',
  insertAbove: 'notebook-cells:insert-above',
  insertBelow: 'notebook-cells:insert-below',
  selectAbove: 'notebook-cells:select-above',
  selectBelow: 'notebook-cells:select-below',
  extendAbove: 'notebook-cells:extend-above',
  extendBelow: 'notebook-cells:extend-below',
  editMode: 'notebook:edit-mode',
  merge: 'notebook-cells:merge',
  split: 'notebook-cells:split',
  commandMode: 'notebook:command-mode',
  toggleLines: 'notebook-cells:toggle-line-numbers',
  toggleAllLines: 'notebook-cells:toggle-all-line-numbers',
  undo: 'notebook-cells:undo',
  redo: 'notebook-cells:redo',
  markdown1: 'notebook-cells:markdown-header1',
  markdown2: 'notebook-cells:markdown-header2',
  markdown3: 'notebook-cells:markdown-header3',
  markdown4: 'notebook-cells:markdown-header4',
  markdown5: 'notebook-cells:markdown-header5',
  markdown6: 'notebook-cells:markdown-header6',
};
