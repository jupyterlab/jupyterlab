// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  DockPanel
} from 'phosphor-dockpanel';

import {
  KeymapManager
} from 'phosphor-keymap';

import {
  ContentsManager
} from 'jupyter-js-services';

import {
  FileHandler, DocumentManager
} from 'jupyter-js-ui/lib/docmanager';

import {
  getBaseUrl
} from 'jupyter-js-utils';


function main(): void {
  let dock = new DockPanel();
  dock.id = 'main';
  dock.attach(document.body);
  window.onresize = () => dock.update();
  let keymapManager = new KeymapManager();
  window.addEventListener('keydown', (event) => {
    keymapManager.processKeydownEvent(event);
  });

  let contentsManager = new ContentsManager(getBaseUrl());
  let fileHandler = new FileHandler(contentsManager);
  let docManager = new DocumentManager();
  docManager.registerDefault(fileHandler);
  contentsManager.get('index.html').then(contents => {
    let widget = docManager.open(contents);
    dock.insertTabAfter(widget);
    keymapManager.add([{
      sequence: ['Accel S'],
      selector: '.jp-CodeMirrorWidget',
      handler: () => {
        fileHandler.save();
        return true;
      }
    }]);
  });

}

window.onload = main;
