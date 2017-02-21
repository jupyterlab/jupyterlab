// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

export * from './actions';
export * from './celltools';
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
  const interrupt: string = 'notebook:interrupt-kernel';

  export
  const restart: string = 'notebook:restart-kernel';

  export
  const restartClear: string = 'notebook:restart-clear';

  export
  const restartRunAll: string = 'notebook:restart-runAll';

  export
  const switchKernel: string = 'notebook:switch-kernel';

  export
  const clearAllOutputs: string = 'notebook:clear-outputs';

  export
  const closeAndShutdown: string = 'notebook:close-and-shutdown';

  export
  const trust: string = 'notebook:trust';

  export
  const run: string = 'notebook-cells:run';

  export
  const runAndAdvance: string = 'notebook-cells:run-and-advance';

  export
  const runAndInsert: string = 'notebook-cells:run-and-insert';

  export
  const runAll: string = 'notebook:run-all';

  export
  const toCode: string = 'notebook-cells:to-code';

  export
  const toMarkdown: string = 'notebook-cells:to-markdown';

  export
  const toRaw: string = 'notebook-cells:to-raw';

  export
  const cut: string = 'notebook-cells:cut';

  export
  const copy: string = 'notebook-cells:copy';

  export
  const paste: string = 'notebook-cells:paste';

  export
  const moveUp: string = 'notebook-cells:move-up';

  export
  const moveDown: string = 'notebook-cells:move-down';

  export
  const clearOutputs: string = 'notebook-cells:clear-output';

  export
  const deleteCell: string = 'notebook-cells:delete';

  export
  const insertAbove: string = 'notebook-cells:insert-above';

  export
  const insertBelow: string = 'notebook-cells:insert-below';

  export
  const selectAbove: string = 'notebook-cells:select-above';

  export
  const selectBelow: string = 'notebook-cells:select-below';

  export
  const extendAbove: string = 'notebook-cells:extend-above';

  export
  const extendBelow: string = 'notebook-cells:extend-below';

  export
  const editMode: string = 'notebook:edit-mode';

  export
  const merge: string = 'notebook-cells:merge';

  export
  const split: string = 'notebook-cells:split';

  export
  const commandMode: string = 'notebook:command-mode';

  export
  const toggleLines: string = 'notebook-cells:toggle-line-numbers';

  export
  const toggleAllLines: string = 'notebook-cells:toggle-all-line-numbers';

  export
  const undo: string = 'notebook-cells:undo';

  export
  const redo: string = 'notebook-cells:redo';

  export
  const markdown1: string = 'notebook-cells:markdown-header1';

  export
  const markdown2: string = 'notebook-cells:markdown-header2';

  export
  const markdown3: string = 'notebook-cells:markdown-header3';

  export
  const markdown4: string = 'notebook-cells:markdown-header4';

  export
  const markdown5: string = 'notebook-cells:markdown-header5';

  export
  const markdown6: string = 'notebook-cells:markdown-header6';
};
