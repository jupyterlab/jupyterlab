/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Set up keyboard shortcuts & commands for notebook
 */
import { ISessionContextDialogs } from '@jupyterlab/apputils';
import { CompletionHandler } from '@jupyterlab/completer';
import {
  SearchDocumentModel,
  SearchDocumentView
} from '@jupyterlab/documentsearch';
import {
  NotebookActions,
  NotebookPanel,
  NotebookSearchProvider
} from '@jupyterlab/notebook';
import { nullTranslator } from '@jupyterlab/translation';
import {
  addIcon,
  copyIcon,
  cutIcon,
  deleteIcon,
  fastForwardIcon,
  pasteIcon,
  refreshIcon,
  runIcon,
  saveIcon,
  stopIcon
} from '@jupyterlab/ui-components';
import { CommandRegistry } from '@lumino/commands';
import { CommandPalette, Widget } from '@lumino/widgets';

/**
 * The map of command ids used by the notebook.
 */
export const COMMAND_IDS = {
  invoke: 'completer:invoke',
  select: 'completer:select',
  invokeNotebook: 'completer:invoke-notebook',
  selectNotebook: 'completer:select-notebook',
  startSearch: 'documentsearch:start-search',
  findNext: 'documentsearch:find-next',
  findPrevious: 'documentsearch:find-previous',
  save: 'notebook:save',
  interrupt: 'notebook:interrupt-kernel',
  restart: 'notebook:restart-kernel',
  switchKernel: 'notebook:switch-kernel',
  runAndAdvance: 'notebook-cells:run-and-advance',
  run: 'notebook:run-cell',
  deleteCell: 'notebook-cells:delete',
  selectAbove: 'notebook-cells:select-above',
  selectBelow: 'notebook-cells:select-below',
  extendAbove: 'notebook-cells:extend-above',
  extendTop: 'notebook-cells:extend-top',
  extendBelow: 'notebook-cells:extend-below',
  extendBottom: 'notebook-cells:extend-bottom',
  editMode: 'notebook:edit-mode',
  merge: 'notebook-cells:merge',
  split: 'notebook-cells:split',
  commandMode: 'notebook:command-mode',
  undo: 'notebook-cells:undo',
  redo: 'notebook-cells:redo',
  insert: 'notebook-cells:insert',
  cut: 'notebook-cells:cut',
  copy: 'notebook-cells:copy',
  paste: 'notebook-cells:paste',
  restartAndRun: 'notebook:restart-and-run'
};

export const setupCommands = (
  commands: CommandRegistry,
  palette: CommandPalette,
  nbWidget: NotebookPanel,
  handler: CompletionHandler,
  sessionContextDialogs: ISessionContextDialogs
): void => {
  // Add commands.
  commands.addCommand(COMMAND_IDS.invoke, {
    label: 'Completer: Invoke',
    execute: () => handler.invoke()
  });
  commands.addCommand(COMMAND_IDS.select, {
    label: 'Completer: Select',
    execute: () => handler.completer.selectActive()
  });
  commands.addCommand(COMMAND_IDS.invokeNotebook, {
    label: 'Invoke Notebook',
    execute: () => {
      if (nbWidget.content.activeCell?.model.type === 'code') {
        return commands.execute(COMMAND_IDS.invoke);
      }
    }
  });
  commands.addCommand(COMMAND_IDS.selectNotebook, {
    label: 'Select Notebook',
    execute: () => {
      if (nbWidget.content.activeCell?.model.type === 'code') {
        return commands.execute(COMMAND_IDS.select);
      }
    }
  });
  commands.addCommand(COMMAND_IDS.save, {
    label: args => (args.toolbar ? '' : 'Save'),
    caption: 'Save',
    icon: args => (args.toolbar ? saveIcon : undefined),
    execute: () => nbWidget.context.save()
  });

  let searchInstance: SearchDocumentView | undefined;
  commands.addCommand(COMMAND_IDS.startSearch, {
    label: 'Find…',
    execute: () => {
      if (!searchInstance) {
        const provider = new NotebookSearchProvider(nbWidget, nullTranslator);
        const searchModel = new SearchDocumentModel(provider, 500);
        searchInstance = new SearchDocumentView(searchModel);
        /**
         * Activate the target widget when the search panel is closing
         */
        searchInstance.closed.connect(() => {
          if (!nbWidget.isDisposed) {
            nbWidget.activate();
          }
        });

        searchInstance.disposed.connect(() => {
          if (!nbWidget.isDisposed) {
            nbWidget.activate();
          }
          // find next and previous are now disabled
          commands.notifyCommandChanged(COMMAND_IDS.startSearch);
        });

        /**
         * Dispose resources when the widget is disposed.
         */
        nbWidget.disposed.connect(() => {
          searchInstance?.dispose();
          searchModel.dispose();
          provider.dispose();
        });
      }

      if (!searchInstance.isAttached) {
        Widget.attach(searchInstance, nbWidget.node);
        searchInstance.node.style.top = `${
          nbWidget.toolbar.node.getBoundingClientRect().height +
          nbWidget.contentHeader.node.getBoundingClientRect().height
        }px`;

        if (searchInstance.model.searchExpression) {
          searchInstance.model.refresh();
        }
      }
      searchInstance.focusSearchInput();
    }
  });
  commands.addCommand(COMMAND_IDS.findNext, {
    label: 'Find Next',
    isEnabled: () => !!searchInstance,
    execute: async () => {
      if (!searchInstance) {
        return;
      }
      await searchInstance.model.highlightNext();
    }
  });
  commands.addCommand(COMMAND_IDS.findPrevious, {
    label: 'Find Previous',
    isEnabled: () => !!searchInstance,
    execute: async () => {
      if (!searchInstance) {
        return;
      }
      await searchInstance.model.highlightPrevious();
    }
  });
  commands.addCommand(COMMAND_IDS.interrupt, {
    label: args => (args.toolbar ? '' : 'Interrupt'),
    caption: 'Interrupt the kernel',
    icon: args => (args.toolbar ? stopIcon : undefined),
    execute: async () =>
      nbWidget.context.sessionContext.session?.kernel?.interrupt()
  });
  commands.addCommand(COMMAND_IDS.restart, {
    label: args => (args.toolbar ? '' : 'Restart Kernel'),
    caption: 'Restart the kernel',
    icon: args => (args.toolbar ? refreshIcon : undefined),
    execute: () =>
      sessionContextDialogs.restart(nbWidget.context.sessionContext)
  });
  commands.addCommand(COMMAND_IDS.switchKernel, {
    label: 'Switch Kernel',
    execute: () =>
      sessionContextDialogs.selectKernel(nbWidget.context.sessionContext)
  });
  commands.addCommand(COMMAND_IDS.runAndAdvance, {
    label: args => (args.toolbar ? '' : 'Run and Advance'),
    caption: 'Run the selected cells and advance.',
    icon: args => (args.toolbar ? runIcon : undefined),
    execute: () => {
      return NotebookActions.runAndAdvance(
        nbWidget.content,
        nbWidget.context.sessionContext,
        sessionContextDialogs
      );
    }
  });
  commands.addCommand(COMMAND_IDS.run, {
    label: 'Run',
    execute: () => {
      return NotebookActions.run(
        nbWidget.content,
        nbWidget.context.sessionContext,
        sessionContextDialogs
      );
    }
  });
  commands.addCommand(COMMAND_IDS.editMode, {
    label: 'Edit Mode',
    execute: () => {
      nbWidget.content.mode = 'edit';
    }
  });
  commands.addCommand(COMMAND_IDS.commandMode, {
    label: 'Command Mode',
    execute: () => {
      nbWidget.content.mode = 'command';
    }
  });
  commands.addCommand(COMMAND_IDS.selectBelow, {
    label: 'Select Below',
    execute: () => NotebookActions.selectBelow(nbWidget.content)
  });
  commands.addCommand(COMMAND_IDS.selectAbove, {
    label: 'Select Above',
    execute: () => NotebookActions.selectAbove(nbWidget.content)
  });
  commands.addCommand(COMMAND_IDS.extendAbove, {
    label: 'Extend Above',
    execute: () => NotebookActions.extendSelectionAbove(nbWidget.content)
  });
  commands.addCommand(COMMAND_IDS.extendTop, {
    label: 'Extend to Top',
    execute: () => NotebookActions.extendSelectionAbove(nbWidget.content, true)
  });
  commands.addCommand(COMMAND_IDS.extendBelow, {
    label: 'Extend Below',
    execute: () => NotebookActions.extendSelectionBelow(nbWidget.content)
  });
  commands.addCommand(COMMAND_IDS.extendBottom, {
    label: 'Extend to Bottom',
    execute: () => NotebookActions.extendSelectionBelow(nbWidget.content, true)
  });
  commands.addCommand(COMMAND_IDS.merge, {
    label: 'Merge Cells',
    execute: () => NotebookActions.mergeCells(nbWidget.content)
  });
  commands.addCommand(COMMAND_IDS.split, {
    label: 'Split Cell',
    execute: () => NotebookActions.splitCell(nbWidget.content)
  });
  commands.addCommand(COMMAND_IDS.undo, {
    label: 'Undo',
    execute: () => NotebookActions.undo(nbWidget.content)
  });
  commands.addCommand(COMMAND_IDS.redo, {
    label: 'Redo',
    execute: () => NotebookActions.redo(nbWidget.content)
  });

  commands.addCommand(COMMAND_IDS.insert, {
    label: args => (args.toolbar ? '' : 'Insert a cell below'),
    caption: 'Insert a cell below',
    icon: args => (args.toolbar ? addIcon : undefined),
    execute: () => NotebookActions.insertBelow(nbWidget.content)
  });

  commands.addCommand(COMMAND_IDS.deleteCell, {
    label: args => (args.toolbar ? '' : 'Delete the selected cells'),
    caption: 'Delete the selected cells',
    icon: args => (args.toolbar ? deleteIcon : undefined),
    execute: () => NotebookActions.deleteCells(nbWidget.content)
  });

  commands.addCommand(COMMAND_IDS.cut, {
    label: args => (args.toolbar ? '' : 'Cut the selected cells'),
    caption: 'Cut the selected cells',
    icon: args => (args.toolbar ? cutIcon : undefined),
    execute: () => NotebookActions.cut(nbWidget.content)
  });

  commands.addCommand(COMMAND_IDS.copy, {
    label: args => (args.toolbar ? '' : 'Copy the selected cells'),
    caption: 'Copy the selected cells',
    icon: args => (args.toolbar ? copyIcon : undefined),
    execute: () => NotebookActions.copy(nbWidget.content)
  });

  commands.addCommand(COMMAND_IDS.paste, {
    label: args => (args.toolbar ? '' : 'Paste cells from the clipboard'),
    caption: 'Paste cells from the clipboard',
    icon: args => (args.toolbar ? pasteIcon : undefined),
    execute: () => NotebookActions.paste(nbWidget.content)
  });

  commands.addCommand(COMMAND_IDS.restartAndRun, {
    label: args =>
      args.toolbar ? '' : 'Restart the kernel, then re-run the whole notebook',
    caption: 'Restart the kernl, then re-run the whole notebook',
    icon: args => (args.toolbar ? fastForwardIcon : undefined),
    execute: () => {
      void sessionContextDialogs
        .restart(nbWidget.sessionContext)
        .then(restarted => {
          if (restarted) {
            void NotebookActions.runAll(
              nbWidget.content,
              nbWidget.sessionContext,
              sessionContextDialogs
            );
          }
          return restarted;
        });
    }
  });

  let category = 'Notebook Operations';
  [
    COMMAND_IDS.interrupt,
    COMMAND_IDS.restart,
    COMMAND_IDS.editMode,
    COMMAND_IDS.commandMode,
    COMMAND_IDS.switchKernel,
    COMMAND_IDS.startSearch,
    COMMAND_IDS.findNext,
    COMMAND_IDS.findPrevious
  ].forEach(command => palette.addItem({ command, category }));

  category = 'Notebook Cell Operations';
  [
    COMMAND_IDS.runAndAdvance,
    COMMAND_IDS.run,
    COMMAND_IDS.split,
    COMMAND_IDS.merge,
    COMMAND_IDS.selectAbove,
    COMMAND_IDS.selectBelow,
    COMMAND_IDS.extendAbove,
    COMMAND_IDS.extendBelow,
    COMMAND_IDS.undo,
    COMMAND_IDS.redo
  ].forEach(command => palette.addItem({ command, category }));

  const bindings = [
    {
      selector: '.jp-Notebook.jp-mod-editMode .jp-mod-completer-enabled',
      keys: ['Tab'],
      command: COMMAND_IDS.invokeNotebook
    },
    {
      selector: `.jp-mod-completer-active`,
      keys: ['Enter'],
      command: COMMAND_IDS.selectNotebook
    },
    {
      selector: '.jp-Notebook',
      keys: ['Ctrl Enter'],
      command: COMMAND_IDS.run
    },
    {
      selector: '.jp-Notebook',
      keys: ['Shift Enter'],
      command: COMMAND_IDS.runAndAdvance
    },
    {
      selector: '.jp-Notebook',
      keys: ['Accel S'],
      command: COMMAND_IDS.save
    },
    {
      selector: '.jp-Notebook',
      keys: ['Accel F'],
      command: COMMAND_IDS.startSearch
    },
    {
      selector: '.jp-Notebook',
      keys: ['Accel G'],
      command: COMMAND_IDS.findNext
    },
    {
      selector: '.jp-Notebook',
      keys: ['Accel Shift G'],
      command: COMMAND_IDS.findPrevious
    },
    {
      selector: '.jp-Notebook.jp-mod-commandMode:not(.jp-mod-readWrite) :focus',
      keys: ['I', 'I'],
      command: COMMAND_IDS.interrupt
    },
    {
      selector: '.jp-Notebook.jp-mod-commandMode:not(.jp-mod-readWrite) :focus',
      keys: ['0', '0'],
      command: COMMAND_IDS.restart
    },
    {
      selector: '.jp-Notebook.jp-mod-commandMode:not(.jp-mod-readWrite) :focus',
      keys: ['Enter'],
      command: COMMAND_IDS.editMode
    },
    {
      selector: '.jp-Notebook.jp-mod-editMode',
      keys: ['Escape'],
      command: COMMAND_IDS.commandMode
    },
    {
      selector: '.jp-Notebook.jp-mod-commandMode:not(.jp-mod-readWrite) :focus',
      keys: ['Shift M'],
      command: COMMAND_IDS.merge
    },
    {
      selector: '.jp-Notebook.jp-mod-editMode',
      keys: ['Ctrl Shift -'],
      command: COMMAND_IDS.split
    },
    {
      selector: '.jp-Notebook.jp-mod-commandMode:not(.jp-mod-readWrite) :focus',
      keys: ['J'],
      command: COMMAND_IDS.selectBelow
    },
    {
      selector: '.jp-Notebook.jp-mod-commandMode:not(.jp-mod-readWrite) :focus',
      keys: ['ArrowDown'],
      command: COMMAND_IDS.selectBelow
    },
    {
      selector: '.jp-Notebook.jp-mod-commandMode:not(.jp-mod-readWrite) :focus',
      keys: ['K'],
      command: COMMAND_IDS.selectAbove
    },
    {
      selector: '.jp-Notebook.jp-mod-commandMode:not(.jp-mod-readWrite) :focus',
      keys: ['ArrowUp'],
      command: COMMAND_IDS.selectAbove
    },
    {
      selector: '.jp-Notebook.jp-mod-commandMode:not(.jp-mod-readWrite) :focus',
      keys: ['Shift K'],
      command: COMMAND_IDS.extendAbove
    },
    {
      selector: '.jp-Notebook.jp-mod-commandMode:not(.jp-mod-readWrite) :focus',
      keys: ['Shift J'],
      command: COMMAND_IDS.extendBelow
    },
    {
      selector: '.jp-Notebook.jp-mod-commandMode:not(.jp-mod-readWrite) :focus',
      keys: ['Z'],
      command: COMMAND_IDS.undo
    },
    {
      selector: '.jp-Notebook.jp-mod-commandMode:not(.jp-mod-readWrite) :focus',
      keys: ['Y'],
      command: COMMAND_IDS.redo
    }
  ];
  bindings.map(binding => commands.addKeyBinding(binding));
};
