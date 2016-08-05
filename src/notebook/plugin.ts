// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Token
} from 'phosphor/lib/core/token';

import {
  Menu
} from 'phosphor/lib/ui/menu';

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  IClipboard
} from '../clipboard/plugin';

import {
  ICommandPalette
} from '../commandpalette/plugin';

import {
  IMainMenu
} from '../mainmenu/plugin';

import {
  IDocumentRegistry, restartKernel, selectKernelForContext, IWidgetFactoryOptions
} from '../docregistry';

import {
  IInspector
} from '../inspector/plugin';

import {
  IRenderMime
} from '../rendermime/plugin';

import {
  IServiceManager
} from '../services/plugin';

import {
  WidgetTracker
} from '../widgettracker';

import {
  NotebookPanel, NotebookModelFactory, NotebookWidgetFactory, NotebookActions
} from './index';


/**
 * The class name for all main area portrait tab icons.
 */
const PORTRAIT_ICON_CLASS = 'jp-MainAreaPortraitIcon';

/**
 * The class name for the notebook icon from the default theme.
 */
const NOTEBOOK_ICON_CLASS = 'jp-ImageNotebook';


/**
 * The map of command ids used by the notebook.
 */
const cmdIds = {
  interrupt: 'notebook:interrupt-kernel',
  restart: 'notebook:restart-kernel',
  restartClear: 'notebook:restart-clear',
  restartRunAll: 'notebook:restart-runAll',
  switchKernel: 'notebook:switch-kernel',
  clearAllOutputs: 'notebook:clear-outputs',
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


/* tslint:disable */
/**
 * The clipboard token.
 */
export
const INotebookTracker = new Token<INotebookTracker>('jupyter.services.notebook-handler');
/* tslint:enable */


/**
 * A class that tracks notebook widgets.
 */
export
interface INotebookTracker extends WidgetTracker<NotebookPanel> { }


/**
 * The notebook widget tracker provider.
 */
export
const notebookTrackerProvider: JupyterLabPlugin<INotebookTracker> = {
  id: 'jupyter.services.notebook-tracker',
  provides: INotebookTracker,
  requires: [
    IDocumentRegistry,
    IServiceManager,
    IRenderMime,
    IClipboard,
    IMainMenu,
    ICommandPalette,
    IInspector
  ],
  activate: activateNotebookHandler,
  autoStart: true
};


/**
 * Activate the notebook handler extension.
 */
function activateNotebookHandler(app: JupyterLab, registry: IDocumentRegistry, services: IServiceManager, rendermime: IRenderMime, clipboard: IClipboard, mainMenu: IMainMenu, palette: ICommandPalette, inspector: IInspector): INotebookTracker {
  let widgetFactory = new NotebookWidgetFactory(rendermime, clipboard);
  let options: IWidgetFactoryOptions = {
    fileExtensions: ['.ipynb'],
    displayName: 'Notebook',
    modelName: 'notebook',
    defaultFor: ['.ipynb'],
    preferKernel: true,
    canStartKernel: true
  };

  registry.addModelFactory(new NotebookModelFactory());
  registry.addWidgetFactory(widgetFactory, options);

  // Add the ability to launch notebooks for each kernel type.
  let displayNameMap: { [key: string]: string } = Object.create(null);
  let specs = services.kernelspecs;
  for (let kernelName in specs.kernelspecs) {
    let displayName = specs.kernelspecs[kernelName].spec.display_name;
    displayNameMap[displayName] = kernelName;
  }
  let displayNames = Object.keys(displayNameMap).sort((a, b) => {
    return a.localeCompare(b);
  });
  registry.addFileType({
    name: 'Notebook',
    extension: '.ipynb',
    fileType: 'notebook',
    fileFormat: 'json'
  });
  for (let displayName of displayNames) {
    registry.addCreator({
      name: `${displayName} Notebook`,
      fileType: 'Notebook',
      widgetName: 'Notebook',
      kernelName: displayNameMap[displayName]
    });
  }

  // Track the current active notebook.
  let tracker = Private.notebookTracker;

  addCommands(app, tracker);
  populatePalette(palette);

  widgetFactory.widgetCreated.connect((sender, widget) => {
    widget.title.icon = `${PORTRAIT_ICON_CLASS} ${NOTEBOOK_ICON_CLASS}`;
    tracker.addWidget(widget);
  });

  // Set the source of the code inspector to the current console.
  tracker.activeWidgetChanged.connect((sender: any, panel: NotebookPanel) => {
    inspector.source = panel.content.inspectionHandler;
  });

  // Add main menu notebook menu.
  mainMenu.addMenu(createMenu(app), { rank: 20 });

  return tracker;
}

/**
 * Add the notebook commands to the application's command registry.
 */
function addCommands(app: JupyterLab, tracker: WidgetTracker<NotebookPanel>): void {
  let commands = app.commands;

  commands.addCommand(cmdIds.runAndAdvance, {
    label: 'Run Cell(s) and Advance',
    execute: () => {
      if (tracker.activeWidget) {
        let nbWidget = tracker.activeWidget;
        let content = nbWidget.content;
        NotebookActions.runAndAdvance(content, nbWidget.context.kernel);
      }
    }
  });
  commands.addCommand(cmdIds.run, {
    label: 'Run Cell(s)',
    execute: () => {
      if (tracker.activeWidget) {
        let nbWidget = tracker.activeWidget;
        NotebookActions.run(nbWidget.content, nbWidget.context.kernel);
      }
    }
  });
  commands.addCommand(cmdIds.runAndInsert, {
    label: 'Run Cell(s) and Insert',
    execute: () => {
      if (tracker.activeWidget) {
        let nbWidget = tracker.activeWidget;
        NotebookActions.runAndInsert(nbWidget.content, nbWidget.context.kernel);
      }
    }
  });
  commands.addCommand(cmdIds.runAll, {
    label: 'Run All Cells',
    execute: () => {
      if (tracker.activeWidget) {
        let nbWidget = tracker.activeWidget;
        NotebookActions.runAll(nbWidget.content, nbWidget.context.kernel);
      }
    }
  });
  commands.addCommand(cmdIds.restart, {
    label: 'Restart Kernel',
    execute: () => {
      if (tracker.activeWidget) {
        let nbWidget = tracker.activeWidget;
        restartKernel(nbWidget.kernel, nbWidget.node);
      }
    }
  });
  commands.addCommand(cmdIds.restartClear, {
    label: 'Restart Kernel & Clear Outputs',
    execute: () => {
      if (tracker.activeWidget) {
        let nbWidget = tracker.activeWidget;
        let promise = restartKernel(nbWidget.kernel, nbWidget.node);
        promise.then(result => {
          if (result) {
            NotebookActions.clearAllOutputs(nbWidget.content);
          }
        });
      }
    }
  });
  commands.addCommand(cmdIds.restartRunAll, {
    label: 'Restart Kernel & Run All',
    execute: () => {
      if (tracker.activeWidget) {
        let nbWidget = tracker.activeWidget;
        let promise = restartKernel(nbWidget.kernel, nbWidget.node);
        promise.then(result => {
          NotebookActions.runAll(nbWidget.content, nbWidget.context.kernel);
        });
      }
    }
  });
  commands.addCommand(cmdIds.clearAllOutputs, {
    label: 'Clear All Outputs',
    execute: () => {
      if (tracker.activeWidget) {
        let nbWidget = tracker.activeWidget;
        NotebookActions.clearAllOutputs(nbWidget.content);
      }
    }
  });
  commands.addCommand(cmdIds.clearOutputs, {
    label: 'Clear Output(s)',
    execute: () => {
      if (tracker.activeWidget) {
        let nbWidget = tracker.activeWidget;
        NotebookActions.clearOutputs(nbWidget.content);
      }
    }
  });
  commands.addCommand(cmdIds.interrupt, {
    label: 'Interrupt Kernel',
    execute: () => {
      if (tracker.activeWidget) {
        let kernel = tracker.activeWidget.context.kernel;
        if (kernel) {
          kernel.interrupt();
        }
      }
    }
  });
  commands.addCommand(cmdIds.toCode, {
    label: 'Convert to Code',
    execute: () => {
      if (tracker.activeWidget) {
        let nbWidget = tracker.activeWidget;
        NotebookActions.changeCellType(nbWidget.content, 'code');
      }
    }
  });
  commands.addCommand(cmdIds.toMarkdown, {
    label: 'Convert to Markdown',
    execute: () => {
      if (tracker.activeWidget) {
        let nbWidget = tracker.activeWidget;
        NotebookActions.changeCellType(nbWidget.content, 'markdown');
      }
    }
  });
  commands.addCommand(cmdIds.toRaw, {
    label: 'Convert to Raw',
    execute: () => {
      if (tracker.activeWidget) {
        let nbWidget = tracker.activeWidget;
        NotebookActions.changeCellType(nbWidget.content, 'raw');
      }
    }
  });
  commands.addCommand(cmdIds.cut, {
    label: 'Cut Cell(s)',
    execute: () => {
      if (tracker.activeWidget) {
        let nbWidget = tracker.activeWidget;
        NotebookActions.cut(nbWidget.content, nbWidget.clipboard);
      }
    }
  });
  commands.addCommand(cmdIds.copy, {
    label: 'Copy Cell(s)',
    execute: () => {
      if (tracker.activeWidget) {
        let nbWidget = tracker.activeWidget;
        NotebookActions.copy(nbWidget.content, nbWidget.clipboard);
      }
    }
  });
  commands.addCommand(cmdIds.paste, {
    label: 'Paste Cell(s)',
    execute: () => {
      if (tracker.activeWidget) {
        let nbWidget = tracker.activeWidget;
        NotebookActions.paste(nbWidget.content, nbWidget.clipboard);
      }
    }
  });
  commands.addCommand(cmdIds.deleteCell, {
    label: 'Delete Cell(s)',
    execute: () => {
      if (tracker.activeWidget) {
        let nbWidget = tracker.activeWidget;
        NotebookActions.deleteCells(nbWidget.content);
      }
    }
  });
  commands.addCommand(cmdIds.split, {
    label: 'Split Cell',
    execute: () => {
      if (tracker.activeWidget) {
        let nbWidget = tracker.activeWidget;
        NotebookActions.splitCell(nbWidget.content);
      }
    }
  });
  commands.addCommand(cmdIds.merge, {
    label: 'Merge Selected Cell(s)',
    execute: () => {
      if (tracker.activeWidget) {
        let nbWidget = tracker.activeWidget;
        NotebookActions.mergeCells(nbWidget.content);
      }
    }
  });
  commands.addCommand(cmdIds.insertAbove, {
    label: 'Insert Cell Above',
    execute: () => {
      if (tracker.activeWidget) {
        let nbWidget = tracker.activeWidget;
        NotebookActions.insertAbove(nbWidget.content);
      }
    }
  });
  commands.addCommand(cmdIds.insertBelow, {
    label: 'Insert Cell Below',
    execute: () => {
      if (tracker.activeWidget) {
        let nbWidget = tracker.activeWidget;
        NotebookActions.insertBelow(nbWidget.content);
      }
    }
  });
  commands.addCommand(cmdIds.selectAbove, {
    label: 'Select Cell Above',
    execute: () => {
      if (tracker.activeWidget) {
        let nbWidget = tracker.activeWidget;
        NotebookActions.selectAbove(nbWidget.content);
      }
    }
  });
  commands.addCommand(cmdIds.selectBelow, {
    label: 'Select Cell Below',
    execute: () => {
      if (tracker.activeWidget) {
        let nbWidget = tracker.activeWidget;
        NotebookActions.selectBelow(nbWidget.content);
      }
    }
  });
  commands.addCommand(cmdIds.extendAbove, {
    label: 'Extend Selection Above',
    execute: () => {
      if (tracker.activeWidget) {
        let nbWidget = tracker.activeWidget;
        NotebookActions.extendSelectionAbove(nbWidget.content);
      }
    }
  });
  commands.addCommand(cmdIds.extendBelow, {
    label: 'Extend Selection Below',
    execute: () => {
      if (tracker.activeWidget) {
        let nbWidget = tracker.activeWidget;
        NotebookActions.extendSelectionBelow(nbWidget.content);
      }
    }
  });
  commands.addCommand(cmdIds.toggleLines, {
    label: 'Toggle Line Numbers',
    execute: () => {
      if (tracker.activeWidget) {
        let nbWidget = tracker.activeWidget;
        NotebookActions.toggleLineNumbers(nbWidget.content);
      }
    }
  });
  commands.addCommand(cmdIds.toggleAllLines, {
    label: 'Toggle All Line Numbers',
    execute: () => {
      if (tracker.activeWidget) {
        let nbWidget = tracker.activeWidget;
        NotebookActions.toggleAllLineNumbers(nbWidget.content);
      }
    }
  });
  commands.addCommand(cmdIds.commandMode, {
    label: 'To Command Mode',
    execute: () => {
      if (tracker.activeWidget) {
        tracker.activeWidget.content.mode = 'command';
      }
    }
  });
  commands.addCommand(cmdIds.editMode, {
    label: 'To Edit Mode',
    execute: () => {
      if (tracker.activeWidget) {
        tracker.activeWidget.content.mode = 'edit';
      }
    }
  });
  commands.addCommand(cmdIds.undo, {
    label: 'Undo Cell Operation',
    execute: () => {
      if (tracker.activeWidget) {
        NotebookActions.undo(tracker.activeWidget.content);
      }
    }
  });
  commands.addCommand(cmdIds.redo, {
    label: 'Redo Cell Operation',
    execute: () => {
      if (tracker.activeWidget) {
        NotebookActions.redo(tracker.activeWidget.content);
      }
    }
  });
  commands.addCommand(cmdIds.switchKernel, {
    label: 'Switch Kernel',
    execute: () => {
      if (tracker.activeWidget) {
        let { context, node } = tracker.activeWidget;
        selectKernelForContext(context, node);
      }
    }
  });
  commands.addCommand(cmdIds.markdown1, {
    label: 'Markdown Header 1',
    execute: () => {
      if (tracker.activeWidget) {
        NotebookActions.setMarkdownHeader(tracker.activeWidget.content, 1);
      }
    }
  });
  commands.addCommand(cmdIds.markdown2, {
    label: 'Markdown Header 2',
    execute: () => {
      if (tracker.activeWidget) {
        NotebookActions.setMarkdownHeader(tracker.activeWidget.content, 2);
      }
    }
  });
  commands.addCommand(cmdIds.markdown3, {
    label: 'Markdown Header 3',
    execute: () => {
      if (tracker.activeWidget) {
        NotebookActions.setMarkdownHeader(tracker.activeWidget.content, 3);
      }
    }
  });
  commands.addCommand(cmdIds.markdown4, {
    label: 'Markdown Header 4',
    execute: () => {
      if (tracker.activeWidget) {
        NotebookActions.setMarkdownHeader(tracker.activeWidget.content, 4);
      }
    }
  });
  commands.addCommand(cmdIds.markdown5, {
    label: 'Markdown Header 5',
    execute: () => {
      if (tracker.activeWidget) {
        NotebookActions.setMarkdownHeader(tracker.activeWidget.content, 5);
      }
    }
  });
  commands.addCommand(cmdIds.markdown6, {
    label: 'Markdown Header 6',
    execute: () => {
      if (tracker.activeWidget) {
        NotebookActions.setMarkdownHeader(tracker.activeWidget.content, 6);
      }
    }
  });
}

/**
 * Populate the application's command palette with notebook commands.
 */
function populatePalette(palette: ICommandPalette): void {
  let category = 'Notebook Operations';
  [
    cmdIds.interrupt,
    cmdIds.restart,
    cmdIds.restartClear,
    cmdIds.restartRunAll,
    cmdIds.runAll,
    cmdIds.clearAllOutputs,
    cmdIds.toggleAllLines,
    cmdIds.editMode,
    cmdIds.commandMode,
    cmdIds.switchKernel
  ].forEach(command => palette.addItem({ command, category }));

  category = 'Notebook Cell Operations';
  [
    cmdIds.run,
    cmdIds.runAndAdvance,
    cmdIds.runAndInsert,
    cmdIds.clearOutputs,
    cmdIds.toCode,
    cmdIds.toMarkdown,
    cmdIds.toRaw,
    cmdIds.cut,
    cmdIds.copy,
    cmdIds.paste,
    cmdIds.deleteCell,
    cmdIds.split,
    cmdIds.merge,
    cmdIds.insertAbove,
    cmdIds.insertBelow,
    cmdIds.selectAbove,
    cmdIds.selectBelow,
    cmdIds.extendAbove,
    cmdIds.extendBelow,
    cmdIds.toggleLines,
    cmdIds.undo,
    cmdIds.redo,
    cmdIds.markdown1,
    cmdIds.markdown2,
    cmdIds.markdown3,
    cmdIds.markdown4,
    cmdIds.markdown5,
    cmdIds.markdown6
  ].forEach(command => palette.addItem({ command, category }));
}

/**
 * Creates a menu for the notebook.
 */
function createMenu(app: JupyterLab): Menu {
  let { commands, keymap } = app;
  let menu = new Menu({ commands, keymap });
  let settings = new Menu({ commands, keymap });

  menu.title.label = 'Notebook';
  settings.title.label = 'Settings';
  settings.addItem({ command: cmdIds.toggleAllLines });

  menu.addItem({ command: 'file-operations:new-notebook' });
  menu.addItem({ command: cmdIds.undo });
  menu.addItem({ command: cmdIds.redo });
  menu.addItem({ command: cmdIds.split });
  menu.addItem({ command: cmdIds.deleteCell });
  menu.addItem({ command: cmdIds.clearAllOutputs });
  menu.addItem({ command: cmdIds.runAll });
  menu.addItem({ command: cmdIds.restart });
  menu.addItem({ command: cmdIds.switchKernel });
  menu.addItem({ type: 'separator' });
  menu.addItem({ type: 'submenu', menu: settings });

  return menu;
}

/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * A singleton instance of a notebook tracker.
   */
  export
  const notebookTracker = new WidgetTracker<NotebookPanel>();
}
