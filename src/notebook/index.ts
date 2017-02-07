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
 * The command IDs used by the notebook plugin.
 */
export
namespace CommandIDs {
  export
  const interrupt = 'notebook:interrupt-kernel';

  export
  const restart = 'notebook:restart-kernel';

  export
  const restartClear = 'notebook:restart-clear';

  export
  const restartRunAll = 'notebook:restart-runAll';

  export
  const switchKernel = 'notebook:switch-kernel';

  export
  const clearAllOutputs = 'notebook:clear-outputs';

  export
  const closeAndShutdown = 'notebook:close-and-shutdown';

  export
  const trust = 'notebook:trust';

  export
  const run = 'notebook-cells:run';

  export
  const runAndAdvance = 'notebook-cells:run-and-advance';

  export
  const runAndInsert = 'notebook-cells:run-and-insert';

  export
  const runAll = 'notebook:run-all';

  export
  const toCode = 'notebook-cells:to-code';

  export
  const toMarkdown = 'notebook-cells:to-markdown';

  export
  const toRaw = 'notebook-cells:to-raw';

  export
  const cut = 'notebook-cells:cut';

  export
  const copy = 'notebook-cells:copy';

  export
  const paste = 'notebook-cells:paste';

  export
  const moveUp = 'notebook-cells:move-up';

  export
  const moveDown = 'notebook-cells:move-down';

  export
  const clearOutputs = 'notebook-cells:clear-output';

  export
  const deleteCell = 'notebook-cells:delete';

  export
  const insertAbove = 'notebook-cells:insert-above';

  export
  const insertBelow = 'notebook-cells:insert-below';

  export
  const selectAbove = 'notebook-cells:select-above';

  export
  const selectBelow = 'notebook-cells:select-below';

  export
  const extendAbove = 'notebook-cells:extend-above';

  export
  const extendBelow = 'notebook-cells:extend-below';

  export
  const editMode = 'notebook:edit-mode';

  export
  const merge = 'notebook-cells:merge';

  export
  const split = 'notebook-cells:split';

  export
  const commandMode = 'notebook:command-mode';

  export
  const toggleLines = 'notebook-cells:toggle-line-numbers';

  export
  const toggleAllLines = 'notebook-cells:toggle-all-line-numbers';

  export
  const undo = 'notebook-cells:undo';

  export
  const redo = 'notebook-cells:redo';

  export
  const markdown1 = 'notebook-cells:markdown-header1';

  export
  const markdown2 = 'notebook-cells:markdown-header2';

  export
  const markdown3 = 'notebook-cells:markdown-header3';

  export
  const markdown4 = 'notebook-cells:markdown-header4';

  export
  const markdown5 = 'notebook-cells:markdown-header5';

  export
  const markdown6 = 'notebook-cells:markdown-header6';
};
