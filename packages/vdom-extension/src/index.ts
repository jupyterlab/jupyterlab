// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
  ILayoutRestorer
} from '@jupyterlab/application';

import { InstanceTracker } from '@jupyterlab/apputils';

import { MimeDocumentFactory, MimeDocument } from '@jupyterlab/docregistry';

import { INotebookTracker } from '@jupyterlab/notebook';

import { IRenderMimeRegistry } from '@jupyterlab/rendermime';

import { RenderedVDOM, IVDOMTracker } from '@jupyterlab/vdom';

/**
 * The CSS class for a VDOM icon.
 */
const CSS_ICON_CLASS = 'jp-MaterialIcon jp-VDOMIcon';

/**
 * The MIME type for VDOM.
 */
export const MIME_TYPE = 'application/vdom.v1+json';

/**
 * The name of the factory that creates VDOM widgets.
 */
const FACTORY_NAME = 'VDOM';

const plugin: JupyterFrontEndPlugin<IVDOMTracker> = {
  id: '@jupyterlab/vdom-extension:factory',
  requires: [IRenderMimeRegistry, INotebookTracker, ILayoutRestorer],
  provides: IVDOMTracker,
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    rendermime: IRenderMimeRegistry,
    notebooks: INotebookTracker,
    restorer: ILayoutRestorer
  ) => {
    const tracker = new InstanceTracker<MimeDocument>({
      namespace: 'vdom-widget'
    });

    // Add a renderer factory to application rendermime registry.
    rendermime.addFactory(
      {
        safe: false,
        mimeTypes: [MIME_TYPE],
        createRenderer: options => new RenderedVDOM(options)
      },
      0
    );

    notebooks.widgetAdded.connect((sender, panel) => {
      // Get the notebook's context and rendermime;
      const { context, rendermime } = panel;

      // Add the renderer factory to the notebook's rendermime registry;
      rendermime.addFactory(
        {
          safe: false,
          mimeTypes: [MIME_TYPE],
          createRenderer: options => new RenderedVDOM(options, context)
        },
        0
      );
    });

    app.docRegistry.addFileType({
      name: 'vdom',
      mimeTypes: [MIME_TYPE],
      extensions: ['.vdom', '.vdom.json'],
      iconClass: CSS_ICON_CLASS
    });

    const factory = new MimeDocumentFactory({
      renderTimeout: 1000,
      dataType: 'json',
      rendermime,
      name: FACTORY_NAME,
      primaryFileType: app.docRegistry.getFileType('vdom'),
      fileTypes: ['vdom', 'json'],
      defaultFor: ['vdom']
    });

    factory.widgetCreated.connect((sender, widget) => {
      widget.context.pathChanged.connect(() => {
        void tracker.save(widget);
      });
      void tracker.add(widget);
    });

    // Add widget factory to document registry.
    app.docRegistry.addWidgetFactory(factory);

    // Handle state restoration.
    restorer.restore(tracker, {
      command: 'docmanager:open',
      args: widget => ({
        path: widget.context.path,
        factory: FACTORY_NAME
      }),
      name: widget => widget.context.path
    });

    return tracker;
  }
};

export default plugin;
