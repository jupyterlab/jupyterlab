// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { PageConfig, URLExt } from '@jupyterlab/coreutils';
(window as any).__webpack_public_path__ = URLExt.join(
  PageConfig.getBaseUrl(),
  'example/'
);

// Import style through JS file to deduplicate them.
import './style';

import { CommandRegistry } from '@lumino/commands';

import { DockPanel, Menu, SplitPanel, Widget } from '@lumino/widgets';

import { ServiceManager } from '@jupyterlab/services';

import { Dialog, showDialog } from '@jupyterlab/apputils';

import {
  CodeMirrorEditorFactory,
  CodeMirrorMimeTypeService,
  EditorLanguageRegistry
} from '@jupyterlab/codemirror';

import { DocumentManager } from '@jupyterlab/docmanager';

import { DocumentRegistry } from '@jupyterlab/docregistry';

import { FileBrowser, FilterFileBrowserModel } from '@jupyterlab/filebrowser';

import { FileEditorFactory } from '@jupyterlab/fileeditor';

import {
  ITranslator,
  nullTranslator,
  TranslationManager
} from '@jupyterlab/translation';

import { addIcon, ToolbarButton } from '@jupyterlab/ui-components';

const LANG = 'default';

async function main(): Promise<void> {
  // init translator
  const translator = new TranslationManager();
  await translator.fetch(LANG);

  const manager = new ServiceManager();
  void manager.ready.then(() => {
    createApp(manager, translator);
  });
}

function createApp(
  manager: ServiceManager.IManager,
  translator?: ITranslator
): void {
  translator = translator || nullTranslator;
  const trans = translator.load('jupyterlab');

  const widgets: Widget[] = [];
  let activeWidget: Widget;

  const opener = {
    open: (widget: Widget) => {
      if (widgets.indexOf(widget) === -1) {
        dock.addWidget(widget, { mode: 'tab-after' });
        widgets.push(widget);
      }
      dock.activateWidget(widget);
      activeWidget = widget;
      widget.disposed.connect((w: Widget) => {
        const index = widgets.indexOf(w);
        widgets.splice(index, 1);
      });
    },
    get opened() {
      return {
        connect: () => {
          return false;
        },
        disconnect: () => {
          return false;
        }
      };
    }
  };

  const docRegistry = new DocumentRegistry();
  const docManager = new DocumentManager({
    registry: docRegistry,
    manager,
    opener
  });
  const languages = new EditorLanguageRegistry();
  EditorLanguageRegistry.getDefaultLanguages()
    .filter(language =>
      ['ipython', 'julia', 'python'].includes(language.name.toLowerCase())
    )
    .forEach(language => {
      languages.addLanguage(language);
    });
  // Language for Markdown cells
  languages.addLanguage({
    name: 'ipythongfm',
    mime: 'text/x-ipythongfm',
    load: async () => {
      const m = await import('@codemirror/lang-markdown');
      return m.markdown({
        codeLanguages: (info: string) => languages.findBest(info) as any
      });
    }
  });
  const factoryService = new CodeMirrorEditorFactory({ languages });
  const mimeTypeService = new CodeMirrorMimeTypeService(languages);
  const editorServices = {
    factoryService,
    mimeTypeService
  };
  const wFactory = new FileEditorFactory({
    editorServices,
    factoryOptions: {
      name: trans.__('Editor'),
      modelName: 'text',
      fileTypes: ['*'],
      defaultFor: ['*'],
      preferKernel: false,
      canStartKernel: true
    }
  });
  docRegistry.addWidgetFactory(wFactory);

  const commands = new CommandRegistry();

  const fbModel = new FilterFileBrowserModel({
    manager: docManager
  });
  const fbWidget = new FileBrowser({
    id: 'filebrowser',
    model: fbModel
  });

  // Add a creator toolbar item.
  const creator = new ToolbarButton({
    icon: addIcon,
    onClick: () => {
      void docManager
        .newUntitled({
          type: 'file',
          path: fbModel.path
        })
        .then(model => {
          docManager.open(model.path);
        });
    }
  });
  fbWidget.toolbar.insertItem(0, 'create', creator);

  const panel = new SplitPanel();
  panel.id = 'main';
  panel.addWidget(fbWidget);
  SplitPanel.setStretch(fbWidget, 0);
  const dock = new DockPanel();
  panel.addWidget(dock);
  SplitPanel.setStretch(dock, 1);
  dock.spacing = 8;

  document.addEventListener('focus', event => {
    for (let i = 0; i < widgets.length; i++) {
      const widget = widgets[i];
      if (widget.node.contains(event.target as HTMLElement)) {
        activeWidget = widget;
        break;
      }
    }
  });

  // Add commands.
  commands.addCommand('file-open', {
    label: trans.__('Open'),
    iconClass: 'fa fa-folder-open-o',
    mnemonic: 0,
    execute: () => {
      for (const item of fbWidget.selectedItems()) {
        docManager.openOrReveal(item.path);
      }
    }
  });
  commands.addCommand('file-rename', {
    label: trans.__('Rename'),
    iconClass: 'fa fa-edit',
    mnemonic: 0,
    execute: () => {
      return fbWidget.rename();
    }
  });
  commands.addCommand('file-save', {
    execute: () => {
      const context = docManager.contextForWidget(activeWidget);
      return context?.save();
    }
  });
  commands.addCommand('file-cut', {
    label: trans.__('Cut'),
    iconClass: 'fa fa-cut',
    execute: () => {
      fbWidget.cut();
    }
  });
  commands.addCommand('file-copy', {
    label: trans.__('Copy'),
    iconClass: 'fa fa-copy',
    mnemonic: 0,
    execute: () => {
      fbWidget.copy();
    }
  });
  commands.addCommand('file-delete', {
    label: trans.__('Delete'),
    iconClass: 'fa fa-remove',
    mnemonic: 0,
    execute: () => {
      return fbWidget.delete();
    }
  });
  commands.addCommand('file-duplicate', {
    label: trans.__('Duplicate'),
    iconClass: 'fa fa-copy',
    mnemonic: 0,
    execute: () => {
      return fbWidget.duplicate();
    }
  });
  commands.addCommand('file-paste', {
    label: trans.__('Paste'),
    iconClass: 'fa fa-paste',
    mnemonic: 0,
    execute: () => {
      return fbWidget.paste();
    }
  });
  commands.addCommand('file-download', {
    label: trans.__('Download'),
    iconClass: 'fa fa-download',
    execute: () => {
      return fbWidget.download();
    }
  });
  commands.addCommand('file-shutdown-kernel', {
    label: trans.__('Shut Down Kernel'),
    iconClass: 'fa fa-stop-circle-o',
    execute: () => {
      return fbWidget.shutdownKernels();
    }
  });
  commands.addCommand('file-dialog-demo', {
    label: trans.__('Dialog Demo'),
    execute: () => {
      dialogDemo();
    }
  });
  commands.addCommand('file-info-demo', {
    label: trans.__('Info Demo'),
    execute: () => {
      const msg = 'The quick brown fox jumped over the lazy dog';
      void showDialog({
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
  window.addEventListener('keydown', event => {
    commands.processKeydownEvent(event);
  });

  // Create a context menu.
  const menu = new Menu({ commands });
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
  const node = fbWidget.node.getElementsByClassName('jp-DirListing-content')[0];
  node.addEventListener('contextmenu', (event: MouseEvent) => {
    event.preventDefault();
    const x = event.clientX;
    const y = event.clientY;
    menu.open(x, y);
  });

  // Ensure Jupyter styling
  panel.addClass('jp-ThemedContainer');
  menu.addClass('jp-ThemedContainer');
  // [optional] Enforce Jupyter styling on the full page
  document.body.classList.add('jp-ThemedContainer');

  // Attach the panel to the DOM.
  Widget.attach(panel, document.body);

  // Handle resize events.
  window.addEventListener('resize', () => {
    panel.update();
  });

  console.debug('Example started!');
}

/**
 * Create a non-functional dialog demo.
 */
function dialogDemo(): void {
  const body = document.createElement('div');
  const input = document.createElement('input');
  input.value = 'Untitled.ipynb';
  const selector = document.createElement('select');
  const option0 = document.createElement('option');
  option0.value = 'python';
  option0.text = 'Python 3';
  selector.appendChild(option0);
  const option1 = document.createElement('option');
  option1.value = 'julia';
  option1.text = 'Julia';
  selector.appendChild(option1);
  body.appendChild(input);
  body.appendChild(selector);
  void showDialog({
    title: 'Create new notebook'
  });
}

window.addEventListener('load', main);
