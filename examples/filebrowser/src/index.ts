/*-----------------------------------------------------------------------------
| Copyright (c) 2014-2015, Jupyter Development Team.
|
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
'use strict';

import {
  ContentsManager, ISessionOptions, NotebookSessionManager
} from 'jupyter-js-services';

import {
  FileHandler
} from 'jupyter-js-ui/lib/docmanager';

import {
  FileBrowserWidget, FileBrowserModel
} from 'jupyter-js-ui/lib/filebrowser';

import {
  getConfigOption
} from 'jupyter-js-utils';

import * as arrays
 from 'phosphor-arrays';

import {
  CodeMirrorWidget
} from 'phosphor-codemirror';

import {
  DockPanel
} from 'phosphor-dockpanel';

import {
  KeymapManager
} from 'phosphor-keymap';

import {
  Menu, MenuBar, MenuItem
} from 'phosphor-menus';

import {
  SplitPanel
} from 'phosphor-splitpanel';

import {
  Widget
} from 'phosphor-widget';


import 'jupyter-js-ui/lib/index.css';
import 'jupyter-js-ui/lib/theme.css';


function main(): void {

  let baseUrl = getConfigOption('baseUrl');
  let contentsManager = new ContentsManager(baseUrl);
  let sessionsManager = new NotebookSessionManager({ baseUrl: baseUrl });

  let fbModel = new FileBrowserModel(contentsManager, sessionsManager);
  let fbWidget = new FileBrowserWidget(fbModel)
  fbWidget.widgetFactory = model => {
    return handler.open(model);
  };
  let handler = new FileHandler(contentsManager);

  let panel = new SplitPanel();
  panel.addChild(fbWidget);
  let dock = new DockPanel();
  panel.addChild(dock);
  dock.spacing = 8;

  fbModel.openRequested.connect((fbModel, model) => {
    let editor = handler.open(model);
    dock.insertTabAfter(editor);
  });

  let keymapManager = new KeymapManager();
  keymapManager.add([{
    sequence: ['Enter'],
    selector: '.jp-DirListing',
    handler: () => {
      fbWidget.open();
      return true;
    }
  }, {
    sequence: ['Ctrl N'], // Add emacs keybinding for select next.
    selector: '.jp-DirListing',
    handler: () => {
      fbWidget.selectNext();
      return true;
    }
  }, {
    sequence: ['Ctrl P'], // Add emacs keybinding for select previous.
    selector: '.jp-DirListing',
    handler: () => {
      fbWidget.selectPrevious();
      return true;
    }
  }, {
    sequence: ['Accel S'],
    selector: '.jp-CodeMirrorWidget',
    handler: () => {
      handler.save();
      return true;
    }
  }, {
    sequence: ['Accel R'],
    selector: '.jp-CodeMirrorWidget',
    handler: () => {
      handler.revert();
      return true;
    }
  }, {
    sequence: ['Ctrl W'],
    selector: '.jp-CodeMirrorWidget',
    handler: () => {
      handler.close();
      return true;
    }
  }]);

  window.addEventListener('keydown', (event) => {
    keymapManager.processKeydownEvent(event);
  });

  let contextMenu = new Menu([
    new MenuItem({
      text: '&Open',
      icon: 'fa fa-folder-open-o',
      shortcut: 'Ctrl+O',
      handler: () => { fbWidget.open(); }
    }),
    new MenuItem({
      text: '&Rename',
      icon: 'fa fa-edit',
      shortcut: 'Ctrl+R',
      handler: () => { fbWidget.rename(); }
    }),
    new MenuItem({
      text: '&Delete',
      icon: 'fa fa-remove',
      shortcut: 'Ctrl+D',
      handler: () => { fbWidget.delete(); }
    }),
    new MenuItem({
      text: 'Duplicate',
      icon: 'fa fa-copy',
      handler: () => { fbWidget.duplicate(); }
    }),
    new MenuItem({
      text: 'Cut',
      icon: 'fa fa-cut',
      shortcut: 'Ctrl+X',
      handler: () => { fbWidget.cut(); }
    }),
    new MenuItem({
      text: '&Copy',
      icon: 'fa fa-copy',
      shortcut: 'Ctrl+C',
      handler: () => { fbWidget.copy(); }
    }),
    new MenuItem({
      text: '&Paste',
      icon: 'fa fa-paste',
      shortcut: 'Ctrl+V',
      handler: () => { fbWidget.paste(); }
    }),
    new MenuItem({
      text: 'Download',
      icon: 'fa fa-download',
      handler: () => { fbWidget.download(); }
    }),
    new MenuItem({
      text: 'Shutdown Kernel',
      icon: 'fa fa-stop-circle-o',
      handler: () => { fbWidget.shutdownKernels(); }
    }),
  ]);

  // Start a default session.
  contentsManager.newUntitled('', { type: 'notebook' }).then(contents => {
    sessionsManager.startNew({ notebookPath: contents.path }).then(() => {
      panel.attach(document.body);
    });
  });

  // Add a context menu to the dir listing.
  let node = fbWidget.node.getElementsByClassName('jp-DirListing-content')[0];
  node.addEventListener('contextmenu', (event: MouseEvent) => {
    event.preventDefault();
    let x = event.clientX;
    let y = event.clientY;
    contextMenu.popup(x, y);
  });

  window.onresize = () => panel.update();
}


window.onload = main;
