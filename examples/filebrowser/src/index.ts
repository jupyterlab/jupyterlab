// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import 'es6-promise/auto';  // polyfill Promise on IE
import '@jupyterlab/theme-light-extension/static/embed.css';
import '../index.css';

import {
  each
} from '@phosphor/algorithm';

import {
  CommandRegistry
} from '@phosphor/commands';

import {
  DockPanel, Menu, SplitPanel, Widget
} from '@phosphor/widgets';

import {
  ServiceManager
} from '@jupyterlab/services';

import {
  Dialog, ToolbarButton, showDialog
} from '@jupyterlab/apputils';

import {
  FileBrowser, FileBrowserModel
} from '@jupyterlab/filebrowser';

import {
  DocumentManager
} from '@jupyterlab/docmanager';

import {
  DocumentRegistry
} from '@jupyterlab/docregistry';

import {
  CodeMirrorEditorFactory, CodeMirrorMimeTypeService
} from '@jupyterlab/codemirror';

import {
  FileEditorFactory
} from '@jupyterlab/fileeditor';





function main(): void {
  let manager = new ServiceManager();
  manager.ready.then(() => {
    createApp(manager);
  });
}


function createApp(manager: ServiceManager.IManager): void {
  let widgets: Widget[] = [];
  let activeWidget: Widget;

  let opener = {
    open: (widget: Widget) => {
      if (widgets.indexOf(widget) === -1) {
        dock.addWidget(widget, { mode: 'tab-after' });
        widgets.push(widget);
      }
      dock.activateWidget(widget);
      activeWidget = widget;
      widget.disposed.connect((w: Widget) => {
        let index = widgets.indexOf(w);
        widgets.splice(index, 1);
      });
    }
  };

  let docRegistry = new DocumentRegistry();
  let docManager = new DocumentManager({
    registry: docRegistry,
    manager,
    opener
  });
  let editorServices = {
    factoryService: new CodeMirrorEditorFactory(),
    mimeTypeService: new CodeMirrorMimeTypeService()
  };
  let wFactory = new FileEditorFactory({
    editorServices,
    factoryOptions: {
      name: 'Editor',
      modelName: 'text',
      fileTypes: ['*'],
      defaultFor: ['*'],
      preferKernel: false,
      canStartKernel: true
    }
  });
  docRegistry.addWidgetFactory(wFactory);

  let commands = new CommandRegistry();

  let fbModel = new FileBrowserModel({ manager: docManager });
  let fbWidget = new FileBrowser({
    id: 'filebrowser',
    commands,
    model: fbModel
  });

  // Add a creator toolbar item.
  let creator = new ToolbarButton({
    className: 'jp-AddIcon',
    onClick: () => {
      docManager.newUntitled({
        type: 'file',
        path: fbModel.path
      }).then(model => {
        docManager.open(model.path);
      });
    }
  });
  creator.addClass('jp-MaterialIcon');
  fbWidget.toolbar.insertItem(0, 'create', creator);

  let panel = new SplitPanel();
  panel.id = 'main';
  panel.addWidget(fbWidget);
  SplitPanel.setStretch(fbWidget, 0);
  let dock = new DockPanel();
  panel.addWidget(dock);
  SplitPanel.setStretch(dock, 1);
  dock.spacing = 8;

  document.addEventListener('focus', event => {
    for (let i = 0; i < widgets.length; i++) {
      let widget = widgets[i];
      if (widget.node.contains(event.target as HTMLElement)) {
        activeWidget = widget;
        break;
      }
    }
  });

  // Add commands.
  commands.addCommand('file-open', {
    label: 'Open',
    icon: 'fa fa-folder-open-o',
    mnemonic: 0,
    execute: () => {
      each(fbWidget.selectedItems(), item => {
        docManager.openOrReveal(item.path);
      });
    }
  });
  commands.addCommand('file-rename', {
    label: 'Rename',
    icon: 'fa fa-edit',
    mnemonic: 0,
    execute: () => { fbWidget.rename(); }
  });
  commands.addCommand('file-save', {
    execute: () => {
      let context = docManager.contextForWidget(activeWidget);
      context.save();
    }
  });
  commands.addCommand('file-cut', {
    label: 'Cut',
    icon: 'fa fa-cut',
    execute: () => { fbWidget.cut(); }
  });
  commands.addCommand('file-copy', {
    label: 'Copy',
    icon: 'fa fa-copy',
    mnemonic: 0,
    execute: () => { fbWidget.copy(); }
  });
  commands.addCommand('file-delete', {
    label: 'Delete',
    icon: 'fa fa-remove',
    mnemonic: 0,
    execute: () => { fbWidget.delete(); }
  });
  commands.addCommand('file-duplicate', {
    label: 'Duplicate',
    icon: 'fa fa-copy',
    mnemonic: 0,
    execute: () => { fbWidget.duplicate(); }
  });
  commands.addCommand('file-paste', {
    label: 'Paste',
    icon: 'fa fa-paste',
    mnemonic: 0,
    execute: () => { fbWidget.paste(); }
  });
  commands.addCommand('file-download', {
    label: 'Download',
    icon: 'fa fa-download',
    execute: () => { fbWidget.download(); }
  });
  commands.addCommand('file-shutdown-kernel', {
    label: 'Shutdown Kernel',
    icon: 'fa fa-stop-circle-o',
    execute: () => { fbWidget.shutdownKernels(); }
  });
  commands.addCommand('file-dialog-demo', {
    label: 'Dialog Demo',
    execute: () => { dialogDemo(); }
  });
  commands.addCommand('file-info-demo', {
    label: 'Info Demo',
    execute: () => {
      let msg = 'The quick brown fox jumped over the lazy dog';
      showDialog({
        title: 'Cool Title',
        body: msg,
        buttons: [Dialog.okButton()]
      });
    }
  });

  commands.addKeyBinding({
    keys: ['Enter'],
    selector: '.jp-DirListing',
    command: 'file-open'
  });
  commands.addKeyBinding({
    keys: ['Accel S'],
    selector: '.jp-CodeMirrorEditor',
    command: 'file-save'
  });
  window.addEventListener('keydown', (event) => {
    commands.processKeydownEvent(event);
  });

  // Create a context menu.
  let menu = new Menu({ commands });
  menu.addItem({ command: 'file-open' });
  menu.addItem({ command: 'file-rename' });
  menu.addItem({ command: 'file-remove' });
  menu.addItem({ command: 'file-duplicate' });
  menu.addItem({ command: 'file-delete' });
  menu.addItem({ command: 'file-cut' });
  menu.addItem({ command: 'file-copy' });
  menu.addItem({ command: 'file-paste' });
  menu.addItem({ command: 'file-shutdown-kernel' });
  menu.addItem({ command: 'file-dialog-demo' });
  menu.addItem({ command: 'file-info-demo' });

  // Add a context menu to the dir listing.
  let node = fbWidget.node.getElementsByClassName('jp-DirListing-content')[0];
  node.addEventListener('contextmenu', (event: MouseEvent) => {
    event.preventDefault();
    let x = event.clientX;
    let y = event.clientY;
    menu.open(x, y);
  });

  // Attach the panel to the DOM.
  Widget.attach(panel, document.body);

  // Handle resize events.
  window.addEventListener('resize', () => { panel.update(); });
}


/**
 * Create a non-functional dialog demo.
 */
function dialogDemo(): void {
  let body = document.createElement('div');
  let input = document.createElement('input');
  input.value = 'Untitled.ipynb';
  let selector = document.createElement('select');
  let option0 = document.createElement('option');
  option0.value = 'python';
  option0.text = 'Python 3';
  selector.appendChild(option0);
  let option1 = document.createElement('option');
  option1.value = 'julia';
  option1.text = 'Julia';
  selector.appendChild(option1);
  body.appendChild(input);
  body.appendChild(selector);
  showDialog({
    title: 'Create new notebook'
  });
}


window.addEventListener('load', main);
