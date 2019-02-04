// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { InstanceTracker, IThemeManager, Dialog } from '@jupyterlab/apputils';

import { ISearchProviderRegistry } from '@jupyterlab/documentsearch';

import {
  CSVViewer,
  TextRenderConfig,
  CSVViewerFactory,
  TSVViewerFactory
} from '@jupyterlab/csvviewer';

import { IDocumentWidget } from '@jupyterlab/docregistry';

import { DataGrid } from '@phosphor/datagrid';

import { IMainMenu, IEditMenu } from '@jupyterlab/mainmenu';
import { CSVSearchProvider } from './searchprovider';

/**
 * The name of the factories that creates widgets.
 */
const FACTORY_CSV = 'CSVTable';
const FACTORY_TSV = 'TSVTable';

/**
 * The CSV file handler extension.
 */
const csv: JupyterFrontEndPlugin<void> = {
  activate: activateCsv,
  id: '@jupyterlab/csvviewer-extension:csv',
  requires: [ILayoutRestorer, IThemeManager, IMainMenu],
  optional: [ISearchProviderRegistry],
  autoStart: true
};

/**
 * The TSV file handler extension.
 */
const tsv: JupyterFrontEndPlugin<void> = {
  activate: activateTsv,
  id: '@jupyterlab/csvviewer-extension:tsv',
  requires: [ILayoutRestorer, IThemeManager, IMainMenu],
  optional: [ISearchProviderRegistry],
  autoStart: true
};

/**
 * Connect menu entries for find and go to line.
 */
function addMenuEntries(
  mainMenu: IMainMenu,
  tracker: InstanceTracker<IDocumentWidget<CSVViewer>>
) {
  // Add go to line capability to the edit menu.
  mainMenu.editMenu.goToLiners.add({
    tracker,
    goToLine: (widget: IDocumentWidget<CSVViewer>) => {
      return Dialog.prompt<number>('Go to Line', 0).then(value => {
        if (value.button.accept) {
          widget.content.goToLine(value.value);
        }
      });
    }
  } as IEditMenu.IGoToLiner<IDocumentWidget<CSVViewer>>);
}

/**
 * Activate cssviewer extension for CSV files
 */
function activateCsv(
  app: JupyterFrontEnd,
  restorer: ILayoutRestorer,
  themeManager: IThemeManager,
  mainMenu: IMainMenu,
  searchregistry: ISearchProviderRegistry = null
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
  let rendererConfig: TextRenderConfig = Private.LIGHT_TEXT_CONFIG;

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
    widget.content.rendererConfig = rendererConfig;
  });

  // Keep the themes up-to-date.
  const updateThemes = () => {
    const isLight = themeManager.isLight(themeManager.theme);
    style = isLight ? Private.LIGHT_STYLE : Private.DARK_STYLE;
    rendererConfig = isLight
      ? Private.LIGHT_TEXT_CONFIG
      : Private.DARK_TEXT_CONFIG;
    tracker.forEach(grid => {
      grid.content.style = style;
      grid.content.rendererConfig = rendererConfig;
    });
  };
  themeManager.themeChanged.connect(updateThemes);

  addMenuEntries(mainMenu, tracker);
  if (searchregistry) {
    searchregistry.registerProvider('csv', CSVSearchProvider);
  }
}

/**
 * Activate cssviewer extension for TSV files
 */
function activateTsv(
  app: JupyterFrontEnd,
  restorer: ILayoutRestorer,
  themeManager: IThemeManager,
  mainMenu: IMainMenu,
  searchregistry: ISearchProviderRegistry = null
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
  let rendererConfig: TextRenderConfig = Private.LIGHT_TEXT_CONFIG;

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
    widget.content.rendererConfig = rendererConfig;
  });

  // Keep the themes up-to-date.
  const updateThemes = () => {
    const isLight = themeManager.isLight(themeManager.theme);
    style = isLight ? Private.LIGHT_STYLE : Private.DARK_STYLE;
    rendererConfig = isLight
      ? Private.LIGHT_TEXT_CONFIG
      : Private.DARK_TEXT_CONFIG;
    tracker.forEach(grid => {
      grid.content.style = style;
      grid.content.rendererConfig = rendererConfig;
    });
  };
  themeManager.themeChanged.connect(updateThemes);

  addMenuEntries(mainMenu, tracker);
  if (searchregistry) {
    searchregistry.registerProvider('tsv', CSVSearchProvider);
  }
}

/**
 * Export the plugins as default.
 */
const plugins: JupyterFrontEndPlugin<any>[] = [csv, tsv];
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
   * The light config for the data grid renderer.
   */
  export const LIGHT_TEXT_CONFIG: TextRenderConfig = {
    textColor: '#111111',
    matchBackgroundColor: '#FFFFE0',
    currentMatchBackgroundColor: '#FFFF00',
    horizontalAlignment: 'right'
  };

  /**
   * The dark config for the data grid renderer.
   */
  export const DARK_TEXT_CONFIG: TextRenderConfig = {
    textColor: '#F5F5F5',
    matchBackgroundColor: '#838423',
    currentMatchBackgroundColor: '#A3807A',
    horizontalAlignment: 'right'
  };
}
