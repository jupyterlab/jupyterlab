// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import json2html = require('json-to-html');

import {
  simulate
} from 'simulate-event';

import {
  ServiceManager, utils, IServiceManager
} from 'jupyter-js-services';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  TextModelFactory, IDocumentModel
} from '../../lib/docregistry';

import {
  Context
} from '../../lib/docmanager/context';

import {
  INotebookModel
} from '../../lib/notebook/notebook/model';

import {
  NotebookModelFactory
} from '../../lib/notebook/notebook/modelfactory';

import {
  LatexRenderer, PDFRenderer, JavascriptRenderer,
  SVGRenderer, MarkdownRenderer, TextRenderer, HTMLRenderer, ImageRenderer
} from '../../lib/renderers';

import {
  RenderMime
} from '../../lib/rendermime';

import {
  defaultSanitizer
} from '../../lib/sanitizer';


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
function createFileContext(path?: string): Promise<Context<IDocumentModel>> {
  return Private.servicePromise.then(manager => {
    let factory = Private.textFactory;
    path = path || utils.uuid() + '.txt';
    return new Context({ manager, factory, path });
  });
}


/**
 * Create a context for a notebook.
 */
export
function createNotebookContext(path?: string): Promise<Context<INotebookModel>> {
  return Private.servicePromise.then(manager => {
    let factory = Private.notebookFactory;
    path = path || utils.uuid() + '.ipynb';
    return new Context({ manager, factory, path });
  });
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
 * Accept a dialog after it is attached if it has an OK button.
 */
export
function acceptDialog(host: HTMLElement = document.body): Promise<void> {
  return waitForDialog(host).then(() => {
    let node = host.getElementsByClassName('jp-Dialog-okButton')[0];
    if (node) {
      (node as HTMLElement).click();
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
  const servicePromise: Promise<IServiceManager> = ServiceManager.create();

  export
  const textFactory = new TextModelFactory();

  export
  const notebookFactory = new NotebookModelFactory();


  class JSONRenderer extends HTMLRenderer {
    /**
     * The mimetypes this renderer accepts.
     */
    mimetypes = ['application/json'];

    /**
     * Render the transformed mime bundle.
     */
    render(options: RenderMime.IRendererOptions<string>): Widget {
      options.source = json2html(options.source);
      return super.render(options);
    }
  }


  class InjectionRenderer extends TextRenderer {
    /**
     * The mimetypes this renderer accepts.
     */
    mimetypes = ['foo/bar'];

    /**
     * Render the transformed mime bundle.
     */
    render(options: RenderMime.IRendererOptions<string>): Widget {
      if (options.injector) {
        options.injector('text/plain', 'foo');
        options.injector('application/json', { 'foo': 1 } );
      }
      return super.render(options);
    }
  }

  const TRANSFORMERS = [
    new JavascriptRenderer(),
    new JSONRenderer(),
    new MarkdownRenderer(),
    new HTMLRenderer(),
    new PDFRenderer(),
    new ImageRenderer(),
    new SVGRenderer(),
    new LatexRenderer(),
    new InjectionRenderer(),
    new TextRenderer()
  ];

  let renderers: RenderMime.MimeMap<RenderMime.IRenderer> = {};
  let order: string[] = [];
  for (let t of TRANSFORMERS) {
    for (let m of t.mimetypes) {
      renderers[m] = t;
      order.push(m);
    }
  }
  let sanitizer = defaultSanitizer;

  export
  const rendermime = new RenderMime({ renderers, order, sanitizer });
}
