/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  ILayoutRestorer,
  JupyterLab,
  JupyterLabPlugin
} from '@jupyterlab/application';

import { InstanceTracker } from '@jupyterlab/apputils';

import { DocumentRegistry } from '@jupyterlab/docregistry';

import { HTMLViewer, HTMLViewerFactory } from '@jupyterlab/htmlviewer';

/**
 * The CSS class for an HTML5 icon.
 */
const CSS_ICON_CLASS = 'jp-MaterialIcon jp-HTMLIcon';

/**
 * The HTML file handler extension.
 */
const htmlPlugin: JupyterLabPlugin<void> = {
  activate: activateHTMLViewer,
  id: '@jupyterlab/htmlviewer-extension:plugin',
  requires: [ILayoutRestorer],
  autoStart: true
};

/**
 * Activate the HTMLViewer extension.
 */
function activateHTMLViewer(app: JupyterLab, restorer: ILayoutRestorer): void {
  // Add an HTML file type to the docregistry.
  const ft: DocumentRegistry.IFileType = {
    name: 'html',
    contentType: 'file',
    fileFormat: 'text',
    displayName: 'HTML File',
    extensions: ['.html'],
    mimeTypes: ['text/html'],
    iconClass: CSS_ICON_CLASS
  };
  app.docRegistry.addFileType(ft);

  // Create a new viewer factory.
  const factory = new HTMLViewerFactory({
    name: 'HTML Viewer',
    fileTypes: ['html'],
    defaultFor: ['html'],
    readOnly: true
  });

  // Create an instance tracker for HTML documents.
  const tracker = new InstanceTracker<HTMLViewer>({
    namespace: 'htmlviewer'
  });

  // Handle state restoration.
  restorer.restore(tracker, {
    command: 'docmanager:open',
    args: widget => ({ path: widget.context.path, factory: 'HTML Viewer' }),
    name: widget => widget.context.path
  });

  app.docRegistry.addWidgetFactory(factory);
  factory.widgetCreated.connect((sender, widget) => {
    // Track the widget.
    tracker.add(widget);
    // Notify the instance tracker if restore data needs to update.
    widget.context.pathChanged.connect(() => {
      tracker.save(widget);
    });

    widget.title.iconClass = ft.iconClass;
    widget.title.iconLabel = ft.iconLabel;
  });
}
/**
 * Export the plugins as default.
 */
export default htmlPlugin;
