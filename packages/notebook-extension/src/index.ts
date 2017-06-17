// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ILayoutRestorer, JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  Dialog, ICommandPalette, IMainMenu, showDialog
} from '@jupyterlab/apputils';

import {
  IEditorServices
} from '@jupyterlab/codeeditor';

import {
  IStateDB
} from '@jupyterlab/coreutils';

import {
  IDocumentRegistry
} from '@jupyterlab/docregistry';

import {
  ILauncher
} from '@jupyterlab/launcher';

import {
  CellTools, ICellTools, INotebookTracker, NotebookActions,
  NotebookModelFactory,  NotebookPanel, NotebookTracker, NotebookWidgetFactory
} from '@jupyterlab/notebook';

import {
  IRenderMime
} from '@jupyterlab/rendermime';

import {
  IServiceManager
} from '@jupyterlab/services';

import {
  JSONObject
} from '@phosphor/coreutils';

import {
  Message, MessageLoop
} from '@phosphor/messaging';

import {
  Menu, Widget
} from '@phosphor/widgets';

import {
  URLExt
} from '@jupyterlab/coreutils';



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
  const createConsole = 'notebook:create-console';

  export
  const clearAllOutputs = 'notebook:clear-outputs';

  export
  const closeAndShutdown = 'notebook:close-and-shutdown';

  export
  const trust = 'notebook:trust';

  export
  const exportToFormat = 'notebook:export-to-format';

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

  export
  const hideInputs = 'notebook-cells:hide-input';

  export
  const showInputs = 'notebook-cells:show-input';
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
 * The allowed Export To ... formats and their human readable labels.
 */
const EXPORT_TO_FORMATS = [
  { 'format': 'html', 'label': 'HTML' },
  { 'format': 'latex', 'label': 'LaTeX' },
  { 'format': 'markdown', 'label': 'Markdown' },
  { 'format': 'pdf', 'label': 'PDF' },
  { 'format': 'rst', 'label': 'ReStructured Text' },
  { 'format': 'script', 'label': 'Executable Script' },
  { 'format': 'slides', 'label': 'Reveal JS' }
];


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
  optional: [ILauncher],
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
  requires: [INotebookTracker, IEditorServices, IStateDB]
};


/**
 * Export the plugins as default.
 */
const plugins: JupyterLabPlugin<any>[] = [contentFactoryPlugin, trackerPlugin, cellToolsPlugin];
export default plugins;


/**
 * Activate the cell tools extension.
 */
function activateCellTools(app: JupyterLab, tracker: INotebookTracker, editorServices: IEditorServices, state: IStateDB): Promise<ICellTools> {
  const id = 'cell-tools';
  const celltools = new CellTools({ tracker });
  const activeCellTool = new CellTools.ActiveCellTool();
  const slideShow = CellTools.createSlideShowSelector();
  const nbConvert = CellTools.createNBConvertSelector();
  const editorFactory = editorServices.factoryService.newInlineEditor
    .bind(editorServices.factoryService);
  const metadataEditor = new CellTools.MetadataEditorTool({ editorFactory });

  // Create message hook for triggers to save to the database.
  const hook = (sender: any, message: Message): boolean => {
    switch (message) {
      case Widget.Msg.ActivateRequest:
        state.save(id, { open: true });
        break;
      case Widget.Msg.AfterHide:
      case Widget.Msg.CloseRequest:
        state.remove(id);
        break;
      default:
        break;
    }
    return true;
  };

  celltools.title.label = 'Cell Tools';
  celltools.id = id;
  celltools.addItem({ tool: activeCellTool, rank: 1 });
  celltools.addItem({ tool: slideShow, rank: 2 });
  celltools.addItem({ tool: nbConvert, rank: 3 });
  celltools.addItem({ tool: metadataEditor, rank: 4 });
  MessageLoop.installMessageHook(celltools, hook);

  // Wait until the application has finished restoring before rendering.
  Promise.all([state.fetch(id), app.restored]).then(([args]) => {
    const open = (args && args['open'] as boolean) || false;

    // After initial restoration, check if the cell tools should render.
    if (tracker.size) {
      app.shell.addToLeftArea(celltools);
      if (open) {
        app.shell.activateById(celltools.id);
      }
    }

    // For all subsequent widget changes, check if the cell tools should render.
    app.shell.currentChanged.connect((sender, args) => {
      // If there are any open notebooks, add cell tools to the side panel if
      // it is not already there.
      if (tracker.size) {
        if (!celltools.isAttached) {
          app.shell.addToLeftArea(celltools);
        }
        return;
      }
      // If there are no notebooks, close cell tools.
      celltools.close();
    });
  });

  return Promise.resolve(celltools);
}


/**
 * Activate the notebook handler extension.
 */
function activateNotebookHandler(app: JupyterLab, registry: IDocumentRegistry, services: IServiceManager, rendermime: IRenderMime, mainMenu: IMainMenu, palette: ICommandPalette, contentFactory: NotebookPanel.IContentFactory, editorServices: IEditorServices, restorer: ILayoutRestorer, launcher: ILauncher | null): INotebookTracker {

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
  const { commands } = app;
  const tracker = new NotebookTracker({ namespace: 'notebook' });

  // Handle state restoration.
  restorer.restore(tracker, {
    command: 'file-operations:open',
    args: panel => ({ path: panel.context.path, factory: FACTORY }),
    name: panel => panel.context.path,
    when: services.ready
  });

  // Update the command registry when the notebook state changes.
  tracker.currentChanged.connect(() => {
    if (tracker.size <= 1) {
      commands.notifyCommandChanged(CommandIDs.interrupt);
    }
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

  // The launcher callback.
  let callback = (cwd: string, name: string) => {
    return commands.execute(
      'file-operations:new-untitled', { path: cwd, type: 'notebook' }
    ).then(model => {
      return commands.execute('file-operations:open', {
        path: model.path, factory: FACTORY,
        kernel: { name }
      });
    });
  };

  // Add a launcher item if the launcher is available.
  if (launcher) {
    services.ready.then(() => {
      let specs = services.specs;
      for (let name in specs.kernelspecs) {
        let displayName = specs.kernelspecs[name].display_name;
        let rank = name === specs.default ? 0 : Infinity;
        launcher.add({
          displayName,
          category: 'Notebook',
          name,
          iconClass: 'jp-ImageNotebook',
          callback,
          rank
        });
      }
    });
  }

  app.contextMenu.addItem({command: CommandIDs.clearOutputs, selector: '.jp-Notebook .jp-Cell'});
  app.contextMenu.addItem({command: CommandIDs.split, selector: '.jp-Notebook .jp-Cell'});
  app.contextMenu.addItem({ type: 'separator', selector: '.jp-Notebook', rank: 0 });
  app.contextMenu.addItem({command: CommandIDs.undo, selector: '.jp-Notebook', rank: 1});
  app.contextMenu.addItem({command: CommandIDs.redo, selector: '.jp-Notebook', rank: 2});
  app.contextMenu.addItem({ type: 'separator', selector: '.jp-Notebook', rank: 0 });
  app.contextMenu.addItem({command: CommandIDs.createConsole, selector: '.jp-Notebook', rank: 3});

  return tracker;
}



/**
 * Add the notebook commands to the application's command registry.
 */
function addCommands(app: JupyterLab, services: IServiceManager, tracker: NotebookTracker): void {
  const { commands, shell } = app;

  // Get the current widget and activate unless the args specify otherwise.
  function getCurrent(args: JSONObject): NotebookPanel | null {
    let widget = tracker.currentWidget;
    let activate = args['activate'] !== false;
    if (activate && widget) {
      shell.activateById(widget.id);
    }
    return widget;
  }

  /**
   * Whether there is an active notebook.
   */
  function hasWidget(): boolean {
    return tracker.currentWidget !== null;
  }

  commands.addCommand(CommandIDs.runAndAdvance, {
    label: 'Run Cell(s) and Select Below',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      let content = current.notebook;
      return NotebookActions.runAndAdvance(content, current.context.session);
    },
    isEnabled: hasWidget
  });
  commands.addCommand(CommandIDs.run, {
    label: 'Run Cell(s)',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.run(current.notebook, current.context.session);
    },
    isEnabled: hasWidget
  });
  commands.addCommand(CommandIDs.runAndInsert, {
    label: 'Run Cell(s) and Insert Below',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.runAndInsert(
        current.notebook, current.context.session
      );
    },
    isEnabled: hasWidget
  });
  commands.addCommand(CommandIDs.runAll, {
    label: 'Run All Cells',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.runAll(current.notebook, current.context.session);
    },
    isEnabled: hasWidget
  });
  commands.addCommand(CommandIDs.restart, {
    label: 'Restart Kernel',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      current.session.restart();
    },
    isEnabled: hasWidget
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
          return current.context.session.shutdown().then(() => {
            current.dispose();
          });
        } else {
          return;
        }
      });
    },
    isEnabled: hasWidget
  });
  commands.addCommand(CommandIDs.trust, {
    label: 'Trust Notebook',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.trust(current.notebook).then(() => {
        return current.context.save();
      });
    },
    isEnabled: hasWidget
  });
  commands.addCommand(CommandIDs.exportToFormat, {
    label: args => {
        let formatLabel = (args['label']) as string;
        return (args['isPalette'] ? 'Export To ' : '') + formatLabel;
    },
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }

      let notebookPath = URLExt.encodeParts(current.context.path);
      let url = URLExt.join(
        services.serverSettings.baseUrl,
        'nbconvert',
        (args['format']) as string,
        notebookPath
      ) + '?download=true';

      let w = window.open('', '_blank');
      if (current.context.model.dirty && !current.context.model.readOnly) {
        return current.context.save().then(() => {
          w.location.assign(url);
        });
      } else {
        return new Promise((resolve, reject) => {
          w.location.assign(url);
        });
      }
    },
    isEnabled: hasWidget
  });
  commands.addCommand(CommandIDs.restartClear, {
    label: 'Restart Kernel & Clear Outputs',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return current.session.restart().then(() => {
        NotebookActions.clearAllOutputs(current.notebook);
      });
    },
    isEnabled: hasWidget
  });
  commands.addCommand(CommandIDs.restartRunAll, {
    label: 'Restart Kernel & Run All',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return current.session.restart().then(() => {
        NotebookActions.runAll(current.notebook, current.context.session);
      });
    },
    isEnabled: hasWidget
  });
  commands.addCommand(CommandIDs.clearAllOutputs, {
    label: 'Clear All Outputs',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.clearAllOutputs(current.notebook);
    },
    isEnabled: hasWidget
  });
  commands.addCommand(CommandIDs.clearOutputs, {
    label: 'Clear Output(s)',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.clearOutputs(current.notebook);
    },
    isEnabled: hasWidget
  });
  commands.addCommand(CommandIDs.interrupt, {
    label: 'Interrupt Kernel',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      let kernel = current.context.session.kernel;
      if (kernel) {
        return kernel.interrupt();
      }
    },
    isEnabled: hasWidget
  });
  commands.addCommand(CommandIDs.toCode, {
    label: 'Change to Code Cell Type',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.changeCellType(current.notebook, 'code');
    },
    isEnabled: hasWidget
  });
  commands.addCommand(CommandIDs.toMarkdown, {
    label: 'Change to Markdown Cell Type',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.changeCellType(current.notebook, 'markdown');
    },
    isEnabled: hasWidget
  });
  commands.addCommand(CommandIDs.toRaw, {
    label: 'Change to Raw Cell Type',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.changeCellType(current.notebook, 'raw');
    },
    isEnabled: hasWidget
  });
  commands.addCommand(CommandIDs.cut, {
    label: 'Cut Cell(s)',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.cut(current.notebook);
    },
    isEnabled: hasWidget
  });
  commands.addCommand(CommandIDs.copy, {
    label: 'Copy Cell(s)',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.copy(current.notebook);
    },
    isEnabled: hasWidget
  });
  commands.addCommand(CommandIDs.paste, {
    label: 'Paste Cell(s) Below',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.paste(current.notebook);
    },
    isEnabled: hasWidget
  });
  commands.addCommand(CommandIDs.deleteCell, {
    label: 'Delete Cell(s)',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.deleteCells(current.notebook);
    },
    isEnabled: hasWidget
  });
  commands.addCommand(CommandIDs.split, {
    label: 'Split Cell',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.splitCell(current.notebook);
    },
    isEnabled: hasWidget
  });
  commands.addCommand(CommandIDs.merge, {
    label: 'Merge Selected Cell(s)',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.mergeCells(current.notebook);
    },
    isEnabled: hasWidget
  });
  commands.addCommand(CommandIDs.insertAbove, {
    label: 'Insert Cell Above',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.insertAbove(current.notebook);
    },
    isEnabled: hasWidget
  });
  commands.addCommand(CommandIDs.insertBelow, {
    label: 'Insert Cell Below',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.insertBelow(current.notebook);
    },
    isEnabled: hasWidget
  });
  commands.addCommand(CommandIDs.selectAbove, {
    label: 'Select Cell Above',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.selectAbove(current.notebook);
    },
    isEnabled: hasWidget
  });
  commands.addCommand(CommandIDs.selectBelow, {
    label: 'Select Cell Below',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.selectBelow(current.notebook);
    },
    isEnabled: hasWidget
  });
  commands.addCommand(CommandIDs.extendAbove, {
    label: 'Extend Selection Above',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.extendSelectionAbove(current.notebook);
    },
    isEnabled: hasWidget
  });
  commands.addCommand(CommandIDs.extendBelow, {
    label: 'Extend Selection Below',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.extendSelectionBelow(current.notebook);
    },
    isEnabled: hasWidget
  });
  commands.addCommand(CommandIDs.moveUp, {
    label: 'Move Cell(s) Up',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.moveUp(current.notebook);
    },
    isEnabled: hasWidget
  });
  commands.addCommand(CommandIDs.moveDown, {
    label: 'Move Cell(s) Down',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.moveDown(current.notebook);
    },
    isEnabled: hasWidget
  });
  commands.addCommand(CommandIDs.toggleLines, {
    label: 'Toggle Line Numbers',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.toggleLineNumbers(current.notebook);
    },
    isEnabled: hasWidget
  });
  commands.addCommand(CommandIDs.toggleAllLines, {
    label: 'Toggle All Line Numbers',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.toggleAllLineNumbers(current.notebook);
    },
    isEnabled: hasWidget
  });
  commands.addCommand(CommandIDs.commandMode, {
    label: 'Enter Command Mode',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return current.notebook.mode = 'command';
    },
    isEnabled: hasWidget
  });
  commands.addCommand(CommandIDs.editMode, {
    label: 'Enter Edit Mode',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      current.notebook.mode = 'edit';
    },
    isEnabled: hasWidget
  });
  commands.addCommand(CommandIDs.undo, {
    label: 'Undo Cell Operation',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.undo(current.notebook);
    },
    isEnabled: hasWidget
  });
  commands.addCommand(CommandIDs.redo, {
    label: 'Redo Cell Operation',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.redo(current.notebook);
    },
    isEnabled: hasWidget
  });
  commands.addCommand(CommandIDs.switchKernel, {
    label: 'Change Kernel',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return current.context.session.selectKernel();
    },
    isEnabled: hasWidget
  });
  commands.addCommand(CommandIDs.createConsole, {
    label: 'Create Console for Notebook',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      let widget = tracker.currentWidget;
      if (!widget) {
        return;
      }
      let options: JSONObject = {
        path: widget.context.path,
        preferredLanguage: widget.context.model.defaultKernelLanguage,
        activate: args['activate']
      };
      return commands.execute('console:create', options);
    },
    isEnabled: hasWidget
  });
  commands.addCommand(CommandIDs.markdown1, {
    label: 'Change to Heading 1',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.setMarkdownHeader(current.notebook, 1);
    },
    isEnabled: hasWidget
  });
  commands.addCommand(CommandIDs.markdown2, {
    label: 'Change to Heading 2',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.setMarkdownHeader(current.notebook, 2);
    },
    isEnabled: hasWidget
  });
  commands.addCommand(CommandIDs.markdown3, {
    label: 'Change to Heading 3',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.setMarkdownHeader(current.notebook, 3);
    },
    isEnabled: hasWidget
  });
  commands.addCommand(CommandIDs.markdown4, {
    label: 'Change to Heading 4',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.setMarkdownHeader(current.notebook, 4);
    },
    isEnabled: hasWidget
  });
  commands.addCommand(CommandIDs.markdown5, {
    label: 'Change to Heading 5',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.setMarkdownHeader(current.notebook, 5);
    },
    isEnabled: hasWidget
  });
  commands.addCommand(CommandIDs.markdown6, {
    label: 'Change to Heading 6',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.setMarkdownHeader(current.notebook, 6);
    },
    isEnabled: hasWidget
  });
  commands.addCommand(CommandIDs.hideInputs, {
    label: 'Hide input(s)',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.hideInputs(current.notebook);
    },
    isEnabled: hasWidget
  });
  commands.addCommand(CommandIDs.showInputs, {
    label: 'Show input(s)',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return NotebookActions.showInputs(current.notebook);
    },
    isEnabled: hasWidget
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
    CommandIDs.createConsole,
    CommandIDs.closeAndShutdown,
    CommandIDs.trust
  ].forEach(command => { palette.addItem({ command, category }); });

  EXPORT_TO_FORMATS.forEach(exportToFormat => {
    let args = { 'format': exportToFormat['format'], 'label': exportToFormat['label'], 'isPalette': true };
    palette.addItem({ command: CommandIDs.exportToFormat, category: category, args: args });
  });

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
    CommandIDs.markdown6,
    CommandIDs.hideInputs,
    CommandIDs.showInputs
  ].forEach(command => { palette.addItem({ command, category }); });
}


/**
 * Creates a menu for the notebook.
 */
function createMenu(app: JupyterLab): Menu {
  let { commands } = app;
  let menu = new Menu({ commands });
  let settings = new Menu({ commands });
  let exportTo = new Menu({ commands } );

  menu.title.label = 'Notebook';
  settings.title.label = 'Settings';
  settings.addItem({ command: CommandIDs.toggleAllLines });

  exportTo.title.label = "Export to ...";
  EXPORT_TO_FORMATS.forEach(exportToFormat => {
    exportTo.addItem({ command: CommandIDs.exportToFormat, args: exportToFormat });
  });

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
  menu.addItem({ command: CommandIDs.createConsole });
  menu.addItem({ type: 'separator' });
  menu.addItem({ command: CommandIDs.closeAndShutdown });
  menu.addItem({ command: CommandIDs.trust });
  menu.addItem({ type: 'submenu', submenu: exportTo });
  menu.addItem({ type: 'separator' });
  menu.addItem({ type: 'submenu', submenu: settings });

  return menu;
}
