// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
  ILayoutRestorer
} from '@jupyterlab/application';

import { IInstanceTracker, InstanceTracker } from '@jupyterlab/apputils';

import { MimeDocumentFactory, MimeDocument } from '@jupyterlab/docregistry';

import { IRenderMimeRegistry } from '@jupyterlab/rendermime';

import { Token } from '@phosphor/coreutils';

/**
 * A class that tracks PDF widgets.
 */
export interface IPDFTracker extends IInstanceTracker<MimeDocument> {}

/**
 * The PDF tracker token.
 */
export const IPDFTracker = new Token<IPDFTracker>(
  '@jupyterlab/pdf-extension:IPDFTracker'
);

/**
 * The MIME type for PDF.
 */
export const MIME_TYPE = 'application/pdf';

/**
 * The name of the factory that creates PDF widgets.
 */
const FACTORY_NAME = 'PDF';

const plugin: JupyterFrontEndPlugin<IPDFTracker> = {
  id: '@jupyterlab/pdf-extension:factory',
  requires: [IRenderMimeRegistry],
  optional: [ILayoutRestorer],
  provides: IPDFTracker,
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    rendermime: IRenderMimeRegistry,
    restorer: ILayoutRestorer | null
  ) => {
    const tracker = new InstanceTracker<MimeDocument>({
      namespace: 'pdf-widget'
    });

    const factory = new MimeDocumentFactory({
      renderTimeout: 1000,
      rendermime,
      name: FACTORY_NAME,
      modelName: 'base64',
      primaryFileType: app.docRegistry.getFileType('PDF'),
      fileTypes: ['PDF'],
      defaultFor: ['PDF']
    });

    factory.widgetCreated.connect((sender, widget) => {
      widget.context.pathChanged.connect(() => {
        tracker.save(widget);
      });
      tracker.add(widget);
    });

    // Add widget factory to document registry.
    app.docRegistry.addWidgetFactory(factory);

    if (restorer) {
      // Handle state restoration.
      restorer.restore(tracker, {
        command: 'docmanager:open',
        args: widget => ({
          path: widget.context.path,
          factory: FACTORY_NAME
        }),
        name: widget => widget.context.path
      });
    }

    return tracker;
  }
};

export default plugin;
