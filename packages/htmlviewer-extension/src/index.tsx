/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  ILayoutRestorer,
  JupyterLab,
  JupyterLabPlugin
} from '@jupyterlab/application';

import { ICommandPalette, IFrame, InstanceTracker } from '@jupyterlab/apputils';

import { DocumentRegistry } from '@jupyterlab/docregistry';

import { HTMLViewer, HTMLViewerFactory } from '@jupyterlab/htmlviewer';

/**
 * The CSS class for an HTML5 icon.
 */
const CSS_ICON_CLASS = 'jp-MaterialIcon jp-HTMLIcon';

import '../style/index.css';

/**
 * Command IDs used by the plugin.
 */
namespace CommandIDs {
  export const trustHTML = 'htmlviewer:trust-html';
}

/**
 * The HTML file handler extension.
 */
const htmlPlugin: JupyterLabPlugin<void> = {
  activate: activateHTMLViewer,
  id: '@jupyterlab/htmlviewer-extension:plugin',
  requires: [ICommandPalette, ILayoutRestorer],
  autoStart: true
};

/**
 * Activate the HTMLViewer extension.
 */
function activateHTMLViewer(
  app: JupyterLab,
  palette: ICommandPalette,
  restorer: ILayoutRestorer
): void {
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

  // Add a command to trust the active HTML document,
  // allowing script executions in its context.
  app.commands.addCommand(CommandIDs.trustHTML, {
    label: 'Trust HTML File',
    isEnabled: () => !!tracker.currentWidget,
    isToggled: () => {
      const current = tracker.currentWidget;
      if (!current) {
        return false;
      }
      const exceptions = current.content.exceptions;
      return (
        !current.content.sandbox || exceptions.indexOf('allow-scripts') !== -1
      );
    },
    execute: () => {
      const current = tracker.currentWidget;
      if (!current) {
        return false;
      }
      const sandbox = current.content.sandbox;
      const exceptions = current.content.exceptions;
      if (!sandbox) {
        current.content.sandbox = true;
        current.content.exceptions = Private.untrusted;
        current.content.url = current.content.url; // Force a refresh.
        return;
      } else {
        if (exceptions.indexOf('allow-scripts') !== -1) {
          current.content.exceptions = Private.untrusted;
          current.content.url = current.content.url; // Force a refresh.
        } else {
          current.content.exceptions = Private.trusted;
          current.content.url = current.content.url; // Force a refresh.
        }
      }
    }
  });
  palette.addItem({
    command: CommandIDs.trustHTML,
    category: 'File Operations'
  });
}
/**
 * Export the plugins as default.
 */
export default htmlPlugin;

/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * Sandbox exceptions for untrusted HTML.
   */
  export const untrusted: IFrame.SandboxExceptions[] = ['allow-same-origin'];

  /**
   * Sandbox exceptions for trusted HTML.
   */
  export const trusted: IFrame.SandboxExceptions[] = [
    'allow-same-origin',
    'allow-scripts'
  ];
}
