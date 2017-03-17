// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IServiceManager
} from '@jupyterlab/services';

import {
  JSONObject
} from '@phosphor/coreutils';

import {
  Menu
} from '@phosphor/widgets';

import {
  JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  Dialog, ICommandPalette, ILayoutRestorer, IMainMenu, restartKernel,
  showDialog
} from '@jupyterlab/apputils';

import {
  IEditorServices
} from '@jupyterlab/codeeditor';

import {
  IDocumentRegistry, selectKernelForContext
} from '@jupyterlab/docregistry';

import {
  IRenderMime
} from '@jupyterlab/rendermime';

import {
  CellTools, ICellTools, INotebookTracker, NotebookActions,
  NotebookModelFactory,  NotebookPanel, NotebookTracker, NotebookWidgetFactory,
  trustNotebook
} from '@jupyterlab/notebook';



/**
 * The command IDs used by the notebook plugin.
 */
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


/**
 * The class name for the notebook icon from the default theme.
 */
const NOTEBOOK_ICON_CLASS = 'jp-ImageNotebook';

/**
 * The name of the factory that creates notebooks.
 */
const FACTORY = 'Notebook';


/**
 * The notebook widget tracker provider.
 */
export
const trackerPlugin: JupyterLabPlugin<INotebookTracker> = {
  id: 'jupyter.services.notebook-tracker',
  provides: INotebookTracker,
  requires: [
    IDocumentRegistry,
    IServiceManager,
    IRenderMime,
    IMainMenu,
    ICommandPalette,
    NotebookPanel.IContentFactory,
    IEditorServices,
    ILayoutRestorer
  ],
  activate: activateNotebookHandler,
  autoStart: true
};


/**
 * The notebook cell factory provider.
 */
export
const contentFactoryPlugin: JupyterLabPlugin<NotebookPanel.IContentFactory> = {
  id: 'jupyter.services.notebook-renderer',
  provides: NotebookPanel.IContentFactory,
  requires: [IEditorServices],
  autoStart: true,
  activate: (app: JupyterLab, editorServices: IEditorServices) => {
    let editorFactory = editorServices.factoryService.newInlineEditor.bind(
      editorServices.factoryService);
    return new NotebookPanel.ContentFactory({ editorFactory });
  }
};

/**
 * The cell tools extension.
 */
const cellToolsPlugin: JupyterLabPlugin<ICellTools> = {
  activate: activateCellTools,
  provides: ICellTools,
  id: 'jupyter.extensions.cell-tools',
  autoStart: true,
  requires: [ILayoutRestorer, INotebookTracker, IEditorServices]
};


/**
 * Export the plugins as default.
 */
const plugins: JupyterLabPlugin<any>[] = [contentFactoryPlugin, trackerPlugin, cellToolsPlugin];
export default plugins;


/**
 * Activate the cell tools extension.
 */
function activateCellTools(app: JupyterLab, restorer: ILayoutRestorer, tracker: INotebookTracker, editorServices: IEditorServices): Promise<ICellTools> {
  const namespace = 'cell-tools';

  const celltools = new CellTools({ tracker });
  celltools.title.label = 'Cell Tools';
  celltools.id = 'cell-tools';

  const activeCellTool = new CellTools.ActiveCellTool();
  celltools.addItem({ tool: activeCellTool, rank: 1 });

  const slideShow = CellTools.createSlideShowSelector();
  celltools.addItem({ tool: slideShow, rank: 2 });

  const nbConvert = CellTools.createNBConvertSelector();
  celltools.addItem({ tool: nbConvert, rank: 3 });

  const editorFactory = editorServices.factoryService.newInlineEditor.bind(
    editorServices.factoryService);
  const metadataEditor = new CellTools.MetadataEditorTool({ editorFactory });
  celltools.addItem({ tool: metadataEditor, rank: 4 });

  restorer.add(celltools, namespace);

  app.shell.currentChanged.connect((sender, args) => {
    if (args.newValue instanceof NotebookPanel) {
      app.shell.addToLeftArea(celltools);
    } else {
      celltools.close();
    }
  });
  // To avoid a race condition (if it was changed before the plugin was
  // activated), add it here also
  if (app.shell.currentWidget instanceof NotebookPanel) {
     app.shell.addToLeftArea(celltools);
  }

  return Promise.resolve(celltools);
}


/**
 * Activate the notebook handler extension.
 */
function activateNotebookHandler(app: JupyterLab, registry: IDocumentRegistry, services: IServiceManager, rendermime: IRenderMime, mainMenu: IMainMenu, palette: ICommandPalette, contentFactory: NotebookPanel.IContentFactory, editorServices: IEditorServices, restorer: ILayoutRestorer): INotebookTracker {

  const factory = new NotebookWidgetFactory({
    name: FACTORY,
    fileExtensions: ['.ipynb'],
    modelName: 'notebook',
    defaultFor: ['.ipynb'],
    preferKernel: true,
    canStartKernel: true,
    rendermime,
    contentFactory,
    mimeTypeService: editorServices.mimeTypeService
  });

  const shell = app.shell;
  const tracker = new NotebookTracker({ namespace: 'notebook', shell });

  // Handle state restoration.
  restorer.restore(tracker, {
    command: 'file-operations:open',
    args: panel => ({ path: panel.context.path, factory: FACTORY }),
    name: panel => panel.context.path,
    when: services.ready
  });

  registry.addModelFactory(new NotebookModelFactory({}));
  registry.addWidgetFactory(factory);
  registry.addFileType({
    name: 'Notebook',
    extension: '.ipynb',
    contentType: 'notebook',
    fileFormat: 'json'
  });
  registry.addCreator({
    name: 'Notebook',
    fileType: 'Notebook',
    widgetName: 'Notebook'
  });

  addCommands(app, services, tracker);
  populatePalette(palette);

  let id = 0; // The ID counter for notebook panels.

  factory.widgetCreated.connect((sender, widget) => {
    // If the notebook panel does not have an ID, assign it one.
    widget.id = widget.id || `notebook-${++id}`;
    widget.title.icon = NOTEBOOK_ICON_CLASS;
    // Notify the instance tracker if restore data needs to update.
    widget.context.pathChanged.connect(() => { tracker.save(widget); });
    // Add the notebook panel to the tracker.
    tracker.add(widget);
  });

  // Add main menu notebook menu.
  mainMenu.addMenu(createMenu(app), { rank: 20 });

  return tracker;
}

/**
 * Add the notebook commands to the application's command registry.
 */
function addCommands(app: JupyterLab, services: IServiceManager, tracker: NotebookTracker): void {
  let { commands } = app;

  // Get the current widget and activate unless the args specify otherwise.
  function getCurrent(args: JSONObject): NotebookPanel | null {
    let widget = tracker.currentWidget;
    let activate = args['activate'] !== false;
    if (activate && widget) {
      tracker.activate(widget);
    }
    return widget;
  }

  commands.addCommand(CommandIDs.runAndAdvance, {
    label: 'Run Cell(s) and Advance',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      let content = current.notebook;
      return NotebookActions.runAndAdvance(content, current.context.kernel);
    }
  });
  commands.addCommand(CommandIDs.run, {
    label: 'Run Cell(s)',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.run(current.notebook, current.context.kernel);
    }
  });
  commands.addCommand(CommandIDs.runAndInsert, {
    label: 'Run Cell(s) and Insert',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.runAndInsert(
        current.notebook, current.context.kernel
      );
    }
  });
  commands.addCommand(CommandIDs.runAll, {
    label: 'Run All Cells',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.runAll(current.notebook, current.context.kernel);
    }
  });
  commands.addCommand(CommandIDs.restart, {
    label: 'Restart Kernel',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      restartKernel(current.kernel, current);
    }
  });
  commands.addCommand(CommandIDs.closeAndShutdown, {
    label: 'Close and Shutdown',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      let fileName = current.title.label;
      return showDialog({
        title: 'Shutdown the notebook?',
        body: `Are you sure you want to close "${fileName}"?`,
        buttons: [Dialog.cancelButton(), Dialog.warnButton()]
      }).then(result => {
        if (result.accept) {
          current.context.changeKernel(null).then(() => { current.dispose(); });
        } else {
          return false;
        }
      });
    }
  });
  commands.addCommand(CommandIDs.trust, {
    label: 'Trust Notebook',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return trustNotebook(current.context.model).then(() => {
        return current.context.save();
      });
    }
  });
  commands.addCommand(CommandIDs.restartClear, {
    label: 'Restart Kernel & Clear Outputs',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      let promise = restartKernel(current.kernel, current);
      promise.then(result => {
        if (result) {
          return NotebookActions.clearAllOutputs(current.notebook);
        }
      });
      return promise;
    }
  });
  commands.addCommand(CommandIDs.restartRunAll, {
    label: 'Restart Kernel & Run All',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      let promise = restartKernel(current.kernel, current);
      promise.then(result => {
        NotebookActions.runAll(current.notebook, current.context.kernel);
      });
      return promise;
    }
  });
  commands.addCommand(CommandIDs.clearAllOutputs, {
    label: 'Clear All Outputs',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.clearAllOutputs(current.notebook);
    }
  });
  commands.addCommand(CommandIDs.clearOutputs, {
    label: 'Clear Output(s)',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.clearOutputs(current.notebook);
    }
  });
  commands.addCommand(CommandIDs.interrupt, {
    label: 'Interrupt Kernel',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      let kernel = current.context.kernel;
      if (kernel) {
        return kernel.interrupt();
      }
    }
  });
  commands.addCommand(CommandIDs.toCode, {
    label: 'Convert to Code',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.changeCellType(current.notebook, 'code');
    }
  });
  commands.addCommand(CommandIDs.toMarkdown, {
    label: 'Convert to Markdown',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.changeCellType(current.notebook, 'markdown');
    }
  });
  commands.addCommand(CommandIDs.toRaw, {
    label: 'Convert to Raw',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.changeCellType(current.notebook, 'raw');
    }
  });
  commands.addCommand(CommandIDs.cut, {
    label: 'Cut Cell(s)',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.cut(current.notebook);
    }
  });
  commands.addCommand(CommandIDs.copy, {
    label: 'Copy Cell(s)',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.copy(current.notebook);
    }
  });
  commands.addCommand(CommandIDs.paste, {
    label: 'Paste Cell(s)',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.paste(current.notebook);
    }
  });
  commands.addCommand(CommandIDs.deleteCell, {
    label: 'Delete Cell(s)',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.deleteCells(current.notebook);
    }
  });
  commands.addCommand(CommandIDs.split, {
    label: 'Split Cell',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.splitCell(current.notebook);
    }
  });
  commands.addCommand(CommandIDs.merge, {
    label: 'Merge Selected Cell(s)',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.mergeCells(current.notebook);
    }
  });
  commands.addCommand(CommandIDs.insertAbove, {
    label: 'Insert Cell Above',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.insertAbove(current.notebook);
    }
  });
  commands.addCommand(CommandIDs.insertBelow, {
    label: 'Insert Cell Below',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.insertBelow(current.notebook);
    }
  });
  commands.addCommand(CommandIDs.selectAbove, {
    label: 'Select Cell Above',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.selectAbove(current.notebook);
    }
  });
  commands.addCommand(CommandIDs.selectBelow, {
    label: 'Select Cell Below',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.selectBelow(current.notebook);
    }
  });
  commands.addCommand(CommandIDs.extendAbove, {
    label: 'Extend Selection Above',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.extendSelectionAbove(current.notebook);
    }
  });
  commands.addCommand(CommandIDs.extendBelow, {
    label: 'Extend Selection Below',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.extendSelectionBelow(current.notebook);
    }
  });
  commands.addCommand(CommandIDs.moveUp, {
    label: 'Move Cell(s) Up',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.moveUp(current.notebook);
    }
  });
  commands.addCommand(CommandIDs.moveDown, {
    label: 'Move Cell(s) Down',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.moveDown(current.notebook);
    }
  });
  commands.addCommand(CommandIDs.toggleLines, {
    label: 'Toggle Line Numbers',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.toggleLineNumbers(current.notebook);
    }
  });
  commands.addCommand(CommandIDs.toggleAllLines, {
    label: 'Toggle All Line Numbers',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.toggleAllLineNumbers(current.notebook);
    }
  });
  commands.addCommand(CommandIDs.commandMode, {
    label: 'To Command Mode',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return current.notebook.mode = 'command';
    }
  });
  commands.addCommand(CommandIDs.editMode, {
    label: 'To Edit Mode',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      current.notebook.mode = 'edit';
    }
  });
  commands.addCommand(CommandIDs.undo, {
    label: 'Undo Cell Operation',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.undo(current.notebook);
    }
  });
  commands.addCommand(CommandIDs.redo, {
    label: 'Redo Cell Operation',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.redo(current.notebook);
    }
  });
  commands.addCommand(CommandIDs.switchKernel, {
    label: 'Switch Kernel',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      let context = current.context;
      return selectKernelForContext(context, services.sessions, current);
    }
  });
  commands.addCommand(CommandIDs.markdown1, {
    label: 'Markdown Header 1',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.setMarkdownHeader(current.notebook, 1);
    }
  });
  commands.addCommand(CommandIDs.markdown2, {
    label: 'Markdown Header 2',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.setMarkdownHeader(current.notebook, 2);
    }
  });
  commands.addCommand(CommandIDs.markdown3, {
    label: 'Markdown Header 3',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.setMarkdownHeader(current.notebook, 3);
    }
  });
  commands.addCommand(CommandIDs.markdown4, {
    label: 'Markdown Header 4',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.setMarkdownHeader(current.notebook, 4);
    }
  });
  commands.addCommand(CommandIDs.markdown5, {
    label: 'Markdown Header 5',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.setMarkdownHeader(current.notebook, 5);
    }
  });
  commands.addCommand(CommandIDs.markdown6, {
    label: 'Markdown Header 6',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.setMarkdownHeader(current.notebook, 6);
    }
  });
  }

/**
 * Populate the application's command palette with notebook commands.
 */
function populatePalette(palette: ICommandPalette): void {
  let category = 'Notebook Operations';
  [
    CommandIDs.interrupt,
    CommandIDs.restart,
    CommandIDs.restartClear,
    CommandIDs.restartRunAll,
    CommandIDs.runAll,
    CommandIDs.clearAllOutputs,
    CommandIDs.toggleAllLines,
    CommandIDs.editMode,
    CommandIDs.commandMode,
    CommandIDs.switchKernel,
    CommandIDs.closeAndShutdown,
    CommandIDs.trust
  ].forEach(command => { palette.addItem({ command, category }); });

  category = 'Notebook Cell Operations';
  [
    CommandIDs.run,
    CommandIDs.runAndAdvance,
    CommandIDs.runAndInsert,
    CommandIDs.clearOutputs,
    CommandIDs.toCode,
    CommandIDs.toMarkdown,
    CommandIDs.toRaw,
    CommandIDs.cut,
    CommandIDs.copy,
    CommandIDs.paste,
    CommandIDs.deleteCell,
    CommandIDs.split,
    CommandIDs.merge,
    CommandIDs.insertAbove,
    CommandIDs.insertBelow,
    CommandIDs.selectAbove,
    CommandIDs.selectBelow,
    CommandIDs.extendAbove,
    CommandIDs.extendBelow,
    CommandIDs.moveDown,
    CommandIDs.moveUp,
    CommandIDs.toggleLines,
    CommandIDs.undo,
    CommandIDs.redo,
    CommandIDs.markdown1,
    CommandIDs.markdown2,
    CommandIDs.markdown3,
    CommandIDs.markdown4,
    CommandIDs.markdown5,
    CommandIDs.markdown6
  ].forEach(command => { palette.addItem({ command, category }); });
}

/**
 * Creates a menu for the notebook.
 */
function createMenu(app: JupyterLab): Menu {
  let { commands } = app;
  let menu = new Menu({ commands });
  let settings = new Menu({ commands });

  menu.title.label = 'Notebook';
  settings.title.label = 'Settings';
  settings.addItem({ command: CommandIDs.toggleAllLines });

  menu.addItem({ command: CommandIDs.undo });
  menu.addItem({ command: CommandIDs.redo });
  menu.addItem({ type: 'separator' });
  menu.addItem({ command: CommandIDs.cut });
  menu.addItem({ command: CommandIDs.copy });
  menu.addItem({ command: CommandIDs.paste });
  menu.addItem({ command: CommandIDs.deleteCell });
  menu.addItem({ type: 'separator' });
  menu.addItem({ command: CommandIDs.split });
  menu.addItem({ command: CommandIDs.merge });
  menu.addItem({ type: 'separator' });
  menu.addItem({ command: CommandIDs.clearAllOutputs });
  menu.addItem({ type: 'separator' });
  menu.addItem({ command: CommandIDs.runAll });
  menu.addItem({ command: CommandIDs.interrupt });
  menu.addItem({ command: CommandIDs.restart });
  menu.addItem({ command: CommandIDs.switchKernel });
  menu.addItem({ type: 'separator' });
  menu.addItem({ command: CommandIDs.closeAndShutdown });
  menu.addItem({ command: CommandIDs.trust });
  menu.addItem({ type: 'separator' });
  menu.addItem({ type: 'submenu', submenu: settings });

  return menu;
}
