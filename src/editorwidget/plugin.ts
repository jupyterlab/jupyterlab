// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  each
} from 'phosphor/lib/algorithm/iteration';

import {
  Menu
} from 'phosphor/lib/ui/menu';

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  IDocumentRegistry
} from '../docregistry';

import {
  EditorWidget
} from './widget';

import {
  ICommandPalette
} from '../commandpalette';

import {
  IMainMenu
} from '../mainmenu';

/**
 * The class name for all main area portrait tab icons.
 */
const PORTRAIT_ICON_CLASS = 'jp-MainAreaPortraitIcon';

/**
 * The class name for the text editor icon from the default theme.
 */
const EDITOR_ICON_CLASS = 'jp-ImageTextEditor';


/**
 * The editor handler extension.
 */
export
const editorHandlerProvider: JupyterLabPlugin<EditorWidget.Tracker> = {
  id: 'jupyter.services.editor-handler',
  requires: [IDocumentRegistry, IMainMenu, ICommandPalette, EditorWidget.IFactory],
  provides: EditorWidget.Tracker,
  activate: activateEditorHandler,
  autoStart: true
};


/**
 * The map of command ids used by the editor.
 */
const cmdIds = {
  closeAll: 'editor:close-all'
};

/**
 * Sets up the editor widget
 */
function activateEditorHandler(app: JupyterLab, registry: IDocumentRegistry, mainMenu: IMainMenu, palette: ICommandPalette, factory:EditorWidget.Factory): EditorWidget.Tracker {
  factory.widgetCreated.connect((sender, widget) => {
    widget.title.icon = `${PORTRAIT_ICON_CLASS} ${EDITOR_ICON_CLASS}`;
  })
  registry.addWidgetFactory(factory,
  {
    fileExtensions: ['*'],
    displayName: 'Editor',
    modelName: 'text',
    defaultFor: ['*'],
    preferKernel: false,
    canStartKernel: false
  });

  const category = 'Editor';
  factory.registerCommands(category);

  const menu = createMenu(app);
  factory.registerMenuItems(menu);
  mainMenu.addMenu(menu, {rank: 30});
  
  addCommands(app, factory.tracker);
  palette.addItem({
     command: cmdIds.closeAll, 
     category: category 
  });

  return factory.tracker;
}


/**
 * Add the editor commands to the application's command registry.
 */
function addCommands(app: JupyterLab, tracker: EditorWidget.Tracker) : void {
  app.commands.addCommand(cmdIds.closeAll, {
    execute: () => { closeAllFiles(tracker); },
    label: 'Close all files'
  });
 /* */
}

/**
 * Close all currently open text editor files
 */
function closeAllFiles(tracker: EditorWidget.Tracker) {
  each(tracker.widgets, widget => {
    widget.close();
  });
}


/**
 * Create a menu for the editor.
 */
function createMenu(app: JupyterLab): Menu {
  const { commands, keymap } = app;
  const menu = new Menu({ commands, keymap });
  menu.title.label = 'Editor';

  menu.addItem({ command: 'file-operations:new-text-file' });
  menu.addItem({ command: 'file-operations:save' });
  menu.addItem({ command: cmdIds.closeAll });
  menu.addItem({ type: 'separator' });

  return menu;
}
