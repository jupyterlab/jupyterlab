// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ILayoutRestorer,
  JupyterLab,
  JupyterLabPlugin
} from '@jupyterlab/application';

import { InstanceTracker, IThemeManager } from '@jupyterlab/apputils';

import {
  CSVViewer,
  CSVViewerFactory,
  TSVViewerFactory
} from '@jupyterlab/csvviewer';

import { IDocumentWidget } from '@jupyterlab/docregistry';

import { DataGrid, TextRenderer } from '@phosphor/datagrid';

/**
 * The name of the factories that creates widgets.
 */
const FACTORY_CSV = 'CSVTable';
const FACTORY_TSV = 'TSVTable';

/**
 * The CSV file handler extension.
 */

const csv: JupyterLabPlugin<void> = {
  activate: activateCsv,
  id: '@jupyterlab/csvviewer-extension:csv',
  requires: [ILayoutRestorer, IThemeManager],
  autoStart: true
};

/**
 * The TSV file handler extension.
 */
const tsv: JupyterLabPlugin<void> = {
  activate: activateTsv,
  id: '@jupyterlab/csvviewer-extension:tsv',
  requires: [ILayoutRestorer, IThemeManager],
  autoStart: true
};

/**
 * Activate cssviewer extension for CSV files
 */
function activateCsv(
  app: JupyterLab,
  restorer: ILayoutRestorer,
  themeManager: IThemeManager
): void {
  const factory = new CSVViewerFactory({
    name: FACTORY_CSV,
    fileTypes: ['csv'],
    defaultFor: ['csv'],
    readOnly: true
  });
  const tracker = new InstanceTracker<IDocumentWidget<CSVViewer>>({
    namespace: 'csvviewer'
  });

  // The current styles for the data grids.
  let style: DataGrid.IStyle = Private.LIGHT_STYLE;
  let renderer: TextRenderer = Private.LIGHT_RENDERER;

  // Handle state restoration.
  restorer.restore(tracker, {
    command: 'docmanager:open',
    args: widget => ({ path: widget.context.path, factory: FACTORY_CSV }),
    name: widget => widget.context.path
  });

  app.docRegistry.addWidgetFactory(factory);
  let ft = app.docRegistry.getFileType('csv');
  factory.widgetCreated.connect((sender, widget) => {
    // Track the widget.
    tracker.add(widget);
    // Notify the instance tracker if restore data needs to update.
    widget.context.pathChanged.connect(() => {
      tracker.save(widget);
    });

    if (ft) {
      widget.title.iconClass = ft.iconClass;
      widget.title.iconLabel = ft.iconLabel;
    }
    // Set the theme for the new widget.
    widget.content.style = style;
    widget.content.renderer = renderer;
  });

  // Keep the themes up-to-date.
  const updateThemes = () => {
    const isLight = themeManager.isLight(themeManager.theme);
    style = isLight ? Private.LIGHT_STYLE : Private.DARK_STYLE;
    renderer = isLight ? Private.LIGHT_RENDERER : Private.DARK_RENDERER;
    tracker.forEach(grid => {
      grid.content.style = style;
      grid.content.renderer = renderer;
    });
  };
  themeManager.themeChanged.connect(updateThemes);
}

/**
 * Activate cssviewer extension for TSV files
 */
function activateTsv(
  app: JupyterLab,
  restorer: ILayoutRestorer,
  themeManager: IThemeManager
): void {
  const factory = new TSVViewerFactory({
    name: FACTORY_TSV,
    fileTypes: ['tsv'],
    defaultFor: ['tsv'],
    readOnly: true
  });
  const tracker = new InstanceTracker<IDocumentWidget<CSVViewer>>({
    namespace: 'tsvviewer'
  });

  // The current styles for the data grids.
  let style: DataGrid.IStyle = Private.LIGHT_STYLE;
  let renderer: TextRenderer = Private.LIGHT_RENDERER;

  // Handle state restoration.
  restorer.restore(tracker, {
    command: 'docmanager:open',
    args: widget => ({ path: widget.context.path, factory: FACTORY_TSV }),
    name: widget => widget.context.path
  });

  app.docRegistry.addWidgetFactory(factory);
  let ft = app.docRegistry.getFileType('tsv');
  factory.widgetCreated.connect((sender, widget) => {
    // Track the widget.
    tracker.add(widget);
    // Notify the instance tracker if restore data needs to update.
    widget.context.pathChanged.connect(() => {
      tracker.save(widget);
    });

    if (ft) {
      widget.title.iconClass = ft.iconClass;
      widget.title.iconLabel = ft.iconLabel;
    }
    // Set the theme for the new widget.
    widget.content.style = style;
    widget.content.renderer = renderer;
  });

  // Keep the themes up-to-date.
  const updateThemes = () => {
    const isLight = themeManager.isLight(themeManager.theme);
    style = isLight ? Private.LIGHT_STYLE : Private.DARK_STYLE;
    renderer = isLight ? Private.LIGHT_RENDERER : Private.DARK_RENDERER;
    tracker.forEach(grid => {
      grid.content.style = style;
      grid.content.renderer = renderer;
    });
  };
  themeManager.themeChanged.connect(updateThemes);
}

/**
 * Export the plugins as default.
 */
const plugins: JupyterLabPlugin<any>[] = [csv, tsv];
export default plugins;

/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * The light theme for the data grid.
   */
  export const LIGHT_STYLE: DataGrid.IStyle = {
    ...DataGrid.defaultStyle,
    voidColor: '#F3F3F3',
    backgroundColor: 'white',
    headerBackgroundColor: '#EEEEEE',
    gridLineColor: 'rgba(20, 20, 20, 0.15)',
    headerGridLineColor: 'rgba(20, 20, 20, 0.25)',
    rowBackgroundColor: i => (i % 2 === 0 ? '#F5F5F5' : 'white')
  };

  /**
   * The dark theme for the data grid.
   */
  export const DARK_STYLE: DataGrid.IStyle = {
    voidColor: 'black',
    backgroundColor: '#111111',
    headerBackgroundColor: '#424242',
    gridLineColor: 'rgba(235, 235, 235, 0.15)',
    headerGridLineColor: 'rgba(235, 235, 235, 0.25)',
    rowBackgroundColor: i => (i % 2 === 0 ? '#212121' : '#111111')
  };

  /**
   * The light renderer for the data grid.
   */
  export const LIGHT_RENDERER = new TextRenderer({
    textColor: '#111111',
    horizontalAlignment: 'right'
  });

  /**
   * The dark renderer for the data grid.
   */
  export const DARK_RENDERER = new TextRenderer({
    textColor: '#F5F5F5',
    horizontalAlignment: 'right'
  });
}
