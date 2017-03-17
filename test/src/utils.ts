// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import json2html = require('json-to-html');

import {
  simulate
} from 'simulate-event';

import {
  ServiceManager
} from '@jupyterlab/services';

import {
  Widget
} from '@phosphor/widgets';

import {
  nbformat, uuid
} from '@jupyterlab/coreutils';

import {
  TextModelFactory, DocumentRegistry, Context
} from '@jupyterlab/docregistry';

import {
  INotebookModel, NotebookModelFactory
} from '@jupyterlab/notebook';

import {
  RenderMime, TextRenderer, HTMLRenderer
} from '@jupyterlab/rendermime';


/**
 * Get a copy of the default rendermime instance.
 */
export
function defaultRenderMime(): RenderMime {
  return Private.rendermime.clone();
}


/**
 * Create a context for a file.
 */
export
function createFileContext(path?: string, manager?: ServiceManager.IManager): Context<DocumentRegistry.IModel> {
  manager = manager || Private.manager;
  let factory = Private.textFactory;
  path = path || uuid() + '.txt';
  return new Context({ manager, factory, path });
}


/**
 * Create a context for a notebook.
 */
export
function createNotebookContext(path?: string, manager?: ServiceManager.IManager): Context<INotebookModel> {
  manager = manager || Private.manager;
  let factory = Private.notebookFactory;
  path = path || uuid() + '.ipynb';
  return new Context({ manager, factory, path });
}


/**
 * Wait for a dialog to be attached to an element.
 */
export
function waitForDialog(host: HTMLElement = document.body): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let refresh = () => {
      let node = host.getElementsByClassName('jp-Dialog')[0];
      if (node) {
        resolve(void 0);
        return;
      }
      setTimeout(refresh, 10);
    };
    refresh();
  });
}


/**
 * Accept a dialog after it is attached by accepting the default button.
 */
export
function acceptDialog(host: HTMLElement = document.body): Promise<void> {
  return waitForDialog(host).then(() => {
    let node = host.getElementsByClassName('jp-Dialog')[0];
    if (node) {
      simulate(node as HTMLElement, 'keydown', { keyCode: 13 });
    }
  });
}


/**
 * Dismiss a dialog after it is attached.
 */
export
function dismissDialog(host: HTMLElement = document.body): Promise<void> {
  return waitForDialog(host).then(() => {
    let node = host.getElementsByClassName('jp-Dialog')[0];
    if (node) {
      simulate(node as HTMLElement, 'keydown', { keyCode: 27 });
    }
  });
}


/**
 * A namespace for private data.
 */
namespace Private {
  export
  const manager = new ServiceManager();

  export
  const textFactory = new TextModelFactory();

  export
  const notebookFactory = new NotebookModelFactory({});


  class JSONRenderer extends HTMLRenderer {

    mimeTypes = ['application/json'];

    render(options: RenderMime.IRenderOptions): Widget {
      let source = options.model.data.get(options.mimeType);
      options.model.data.set(options.mimeType, json2html(source));
      return super.render(options);
    }
  }


  class InjectionRenderer extends TextRenderer {

    mimeTypes = ['test/injector'];

    render(options: RenderMime.IRenderOptions): Widget {
      options.model.data.set('application/json', { 'foo': 1 } );
      return super.render(options);
    }
  }

  let renderers = [
    new JSONRenderer(),
    new InjectionRenderer()
  ];
  let items = RenderMime.getDefaultItems();
  for (let renderer of renderers) {
    items.push({ mimeType: renderer.mimeTypes[0], renderer });
  }
  export
  const rendermime = new RenderMime({ items });
}


/**
 * The default outputs used for testing.
 */
export
const DEFAULT_OUTPUTS: nbformat.IOutput[] = [
  {
   name: 'stdout',
   output_type: 'stream',
   text: [
    'hello world\n',
    '0\n',
    '1\n',
    '2\n'
   ]
  },
  {
   name: 'stderr',
   output_type: 'stream',
   text: [
    'output to stderr\n'
   ]
  },
  {
   name: 'stderr',
   output_type: 'stream',
   text: [
    'output to stderr2\n'
   ]
  },
  {
    output_type: 'execute_result',
    execution_count: 1,
    data: { 'text/plain': 'foo' },
    metadata: {}
  },
  {
   output_type: 'display_data',
   data: { 'text/plain': 'hello, world' },
   metadata: {}
  },
  {
    output_type: 'error',
    ename: 'foo',
    evalue: 'bar',
    traceback: ['fizz', 'buzz']
  }
];
