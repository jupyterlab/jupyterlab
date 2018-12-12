// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ApplicationShell,
  ILayoutRestorer,
  JupyterLab,
  JupyterLabPlugin
} from '@jupyterlab/application';

import {
  Clipboard,
  InstanceTracker,
  MainAreaWidget,
  ToolbarButton
} from '@jupyterlab/apputils';

import { IStateDB, PageConfig, PathExt, URLExt } from '@jupyterlab/coreutils';

import { IDocumentManager } from '@jupyterlab/docmanager';

import {
  FileBrowserModel,
  FileBrowser,
  FileUploadStatus,
  IFileBrowserFactory
} from '@jupyterlab/filebrowser';

import { Launcher } from '@jupyterlab/launcher';

import { Contents } from '@jupyterlab/services';

import { IStatusBar } from '@jupyterlab/statusbar';

import { IIterator, map, reduce, toArray } from '@phosphor/algorithm';

import { CommandRegistry } from '@phosphor/commands';

import { Message } from '@phosphor/messaging';

import { Menu } from '@phosphor/widgets';

/**
 * The command IDs used by the file browser plugin.
 */
namespace CommandIDs {
  export const copy = 'filebrowser:copy';

  export const copyDownloadLink = 'filebrowser:copy-download-link';

  // For main browser only.
  export const createLauncher = 'filebrowser:create-main-launcher';

  export const cut = 'filebrowser:cut';

  export const del = 'filebrowser:delete';

  export const download = 'filebrowser:download';

  export const duplicate = 'filebrowser:duplicate';

  // For main browser only.
  export const hideBrowser = 'filebrowser:hide-main';

  export const navigate = 'filebrowser:navigate';

  export const open = 'filebrowser:open';

  export const openBrowserTab = 'filebrowser:open-browser-tab';

  export const paste = 'filebrowser:paste';

  export const createNewDirectory = 'filebrowser:create-new-directory';

  export const rename = 'filebrowser:rename';

  // For main browser only.
  export const share = 'filebrowser:share-main';

  // For main browser only.
  export const copyPath = 'filebrowser:copy-path';

  export const showBrowser = 'filebrowser:activate';

  export const shutdown = 'filebrowser:shutdown';

  // For main browser only.
  export const toggleBrowser = 'filebrowser:toggle-main';
}

/**
 * The default file browser extension.
 */
const browser: JupyterLabPlugin<void> = {
  activate: activateBrowser,
  id: '@jupyterlab/filebrowser-extension:browser',
  requires: [IFileBrowserFactory, ILayoutRestorer],
  autoStart: true
};

/**
 * The default file browser factory provider.
 */
const factory: JupyterLabPlugin<IFileBrowserFactory> = {
  activate: activateFactory,
  id: '@jupyterlab/filebrowser-extension:factory',
  provides: IFileBrowserFactory,
  requires: [IDocumentManager, IStateDB]
};

/**
 * The default file browser share-file plugin
 *
 * This extension adds a "Copy Shareable Link" command that generates a copy-
 * pastable URL. This url can be used to open a particular file in JupyterLab,
 * handy for emailing links or bookmarking for reference.
 *
 * If you need to change how this link is generated (for instance, to copy a
 * /user-redirect URL for JupyterHub), disable this plugin and replace it
 * with another implementation.
 */
const shareFile: JupyterLabPlugin<void> = {
  activate: activateShareFile,
  id: '@jupyterlab/filebrowser-extension:share-file',
  requires: [IFileBrowserFactory],
  autoStart: true
};

/**
 * A plugin providing file upload status.
 */
export const fileUploadStatus: JupyterLabPlugin<void> = {
  id: '@jupyterlab/filebrowser-extension:file-upload-status',
  autoStart: true,
  requires: [IStatusBar, IFileBrowserFactory],
  activate: (
    app: JupyterLab,
    statusBar: IStatusBar,
    browser: IFileBrowserFactory
  ) => {
    const item = new FileUploadStatus({
      tracker: browser.tracker
    });

    statusBar.registerStatusItem(
      '@jupyterlab/filebrowser-extension:file-upload-status',
      {
        item,
        align: 'middle',
        isActive: () => {
          return !!item.model && item.model.items.length > 0;
        },
        activeStateChanged: item.model.stateChanged
      }
    );
  }
};

/**
 * The file browser namespace token.
 */
const namespace = 'filebrowser';

/**
 * Export the plugins as default.
 */
const plugins: JupyterLabPlugin<any>[] = [
  factory,
  browser,
  shareFile,
  fileUploadStatus
];
export default plugins;

/**
 * Activate the file browser factory provider.
 */
function activateFactory(
  app: JupyterLab,
  docManager: IDocumentManager,
  state: IStateDB
): IFileBrowserFactory {
  const { commands } = app;
  const tracker = new InstanceTracker<FileBrowser>({ namespace });
  const createFileBrowser = (
    id: string,
    options: IFileBrowserFactory.IOptions = {}
  ) => {
    const model = new FileBrowserModel({
      manager: docManager,
      driveName: options.driveName || '',
      refreshInterval: options.refreshInterval,
      state: options.state === null ? null : options.state || state
    });
    const widget = new FileBrowser({
      id,
      model
    });

    // Add a launcher toolbar item.
    let launcher = new ToolbarButton({
      iconClassName: 'jp-AddIcon jp-Icon jp-Icon-16',
      onClick: () => {
        return createLauncher(commands, widget);
      },
      tooltip: 'New Launcher'
    });
    widget.toolbar.insertItem(0, 'launch', launcher);

    // Track the newly created file browser.
    tracker.add(widget);

    return widget;
  };
  const defaultBrowser = createFileBrowser('filebrowser');

  return { createFileBrowser, defaultBrowser, tracker };
}

/**
 * Activate the default file browser in the sidebar.
 */
function activateBrowser(
  app: JupyterLab,
  factory: IFileBrowserFactory,
  restorer: ILayoutRestorer
): void {
  const browser = factory.defaultBrowser;
  const { commands, shell } = app;

  // Let the application restorer track the primary file browser (that is
  // automatically created) for restoration of application state (e.g. setting
  // the file browser as the current side bar widget).
  //
  // All other file browsers created by using the factory function are
  // responsible for their own restoration behavior, if any.
  restorer.add(browser, namespace);

  addCommands(app, factory.tracker, browser);

  browser.title.iconClass = 'jp-FolderIcon jp-SideBar-tabIcon';
  browser.title.caption = 'File Browser';
  shell.addToLeftArea(browser, { rank: 100 });

  // If the layout is a fresh session without saved data, open file browser.
  app.restored.then(layout => {
    if (layout.fresh) {
      commands.execute(CommandIDs.showBrowser, void 0);
    }
  });

  Promise.all([app.restored, browser.model.restored]).then(() => {
    function maybeCreate() {
      // Create a launcher if there are no open items.
      if (app.shell.isEmpty('main')) {
        createLauncher(commands, browser);
      }
    }

    // When layout is modified, create a launcher if there are no open items.
    shell.layoutModified.connect(() => {
      maybeCreate();
    });
    maybeCreate();
  });
}

function activateShareFile(
  app: JupyterLab,
  factory: IFileBrowserFactory
): void {
  const { commands } = app;
  const { tracker } = factory;

  commands.addCommand(CommandIDs.share, {
    execute: () => {
      const widget = tracker.currentWidget;
      if (!widget) {
        return;
      }
      const path = encodeURI(widget.selectedItems().next().path);
      const tree = PageConfig.getTreeUrl({ workspace: true });

      Clipboard.copyToSystem(URLExt.join(tree, path));
    },
    isVisible: () =>
      tracker.currentWidget &&
      toArray(tracker.currentWidget.selectedItems()).length === 1,
    iconClass: 'jp-MaterialIcon jp-LinkIcon',
    label: 'Copy Shareable Link'
  });
}

/**
 * Add the main file browser commands to the application's command registry.
 */
function addCommands(
  app: JupyterLab,
  tracker: InstanceTracker<FileBrowser>,
  browser: FileBrowser
): void {
  const registry = app.docRegistry;

  const getBrowserForPath = (path: string): FileBrowser => {
    const driveName = app.serviceManager.contents.driveName(path);

    if (driveName) {
      let browserForPath = tracker.find(fb => fb.model.driveName === driveName);

      if (!browserForPath) {
        // warn that no filebrowser could be found for this driveName
        console.warn(
          `${CommandIDs.navigate} failed to find filebrowser for path: ${path}`
        );
        return;
      }

      return browserForPath;
    }

    // if driveName is empty, assume the main filebrowser
    return browser;
  };
  const { commands } = app;

  commands.addCommand(CommandIDs.del, {
    execute: () => {
      const widget = tracker.currentWidget;

      if (widget) {
        return widget.delete();
      }
    },
    iconClass: 'jp-MaterialIcon jp-CloseIcon',
    label: 'Delete',
    mnemonic: 0
  });

  commands.addCommand(CommandIDs.copy, {
    execute: () => {
      const widget = tracker.currentWidget;

      if (widget) {
        return widget.copy();
      }
    },
    iconClass: 'jp-MaterialIcon jp-CopyIcon',
    label: 'Copy',
    mnemonic: 0
  });

  commands.addCommand(CommandIDs.cut, {
    execute: () => {
      const widget = tracker.currentWidget;

      if (widget) {
        return widget.cut();
      }
    },
    iconClass: 'jp-MaterialIcon jp-CutIcon',
    label: 'Cut'
  });

  commands.addCommand(CommandIDs.download, {
    execute: () => {
      const widget = tracker.currentWidget;

      if (widget) {
        return widget.download();
      }
    },
    iconClass: 'jp-MaterialIcon jp-DownloadIcon',
    label: 'Download'
  });

  commands.addCommand(CommandIDs.duplicate, {
    execute: () => {
      const widget = tracker.currentWidget;

      if (widget) {
        return widget.duplicate();
      }
    },
    iconClass: 'jp-MaterialIcon jp-CopyIcon',
    label: 'Duplicate'
  });

  commands.addCommand(CommandIDs.hideBrowser, {
    execute: () => {
      const widget = tracker.currentWidget;
      if (widget && !widget.isHidden) {
        app.shell.collapseLeft();
      }
    }
  });

  commands.addCommand(CommandIDs.navigate, {
    execute: args => {
      const path = (args.path as string) || '';
      const browserForPath = getBrowserForPath(path);
      const services = app.serviceManager;
      const localPath = services.contents.localPath(path);
      const failure = (reason: any) => {
        console.warn(`${CommandIDs.navigate} failed to open: ${path}`, reason);
      };

      return services.ready
        .then(() => services.contents.get(path))
        .then(value => {
          const { model } = browserForPath;
          const { restored } = model;

          if (value.type === 'directory') {
            return restored.then(() => model.cd(`/${localPath}`));
          }

          return restored
            .then(() => model.cd(`/${PathExt.dirname(localPath)}`))
            .then(() => commands.execute('docmanager:open', { path: path }));
        })
        .catch(failure);
    }
  });

  commands.addCommand(CommandIDs.open, {
    execute: args => {
      const factory = (args['factory'] as string) || void 0;
      const widget = tracker.currentWidget;

      if (!widget) {
        return;
      }

      return Promise.all(
        toArray(
          map(widget.selectedItems(), item => {
            if (item.type === 'directory') {
              return widget.model.cd(item.name);
            }

            return commands.execute('docmanager:open', {
              factory: factory,
              path: item.path
            });
          })
        )
      );
    },
    iconClass: args => {
      const factory = (args['factory'] as string) || void 0;
      if (factory) {
        // if an explicit factory is passed...
        const ft = registry.getFileType(factory);
        if (ft) {
          // ...set an icon if the factory name corresponds to a file type name...
          return ft.iconClass;
        } else {
          // ...or leave the icon blank
          return '';
        }
      } else {
        return 'jp-MaterialIcon jp-OpenFolderIcon';
      }
    },
    label: args => (args['label'] || args['factory'] || 'Open') as string,
    mnemonic: 0
  });

  commands.addCommand(CommandIDs.openBrowserTab, {
    execute: () => {
      const widget = tracker.currentWidget;

      if (!widget) {
        return;
      }

      return Promise.all(
        toArray(
          map(widget.selectedItems(), item => {
            return commands.execute('docmanager:open-browser-tab', {
              path: item.path
            });
          })
        )
      );
    },
    iconClass: 'jp-MaterialIcon jp-AddIcon',
    label: 'Open in New Browser Tab',
    mnemonic: 0
  });

  commands.addCommand(CommandIDs.copyDownloadLink, {
    execute: () => {
      const widget = tracker.currentWidget;
      if (!widget) {
        return;
      }

      return widget.model.manager.services.contents
        .getDownloadUrl(widget.selectedItems().next().path)
        .then(url => {
          Clipboard.copyToSystem(url);
        });
    },
    iconClass: 'jp-MaterialIcon jp-CopyIcon',
    label: 'Copy Download Link',
    mnemonic: 0
  });

  commands.addCommand(CommandIDs.paste, {
    execute: () => {
      const widget = tracker.currentWidget;

      if (widget) {
        return widget.paste();
      }
    },
    iconClass: 'jp-MaterialIcon jp-PasteIcon',
    label: 'Paste',
    mnemonic: 0
  });

  commands.addCommand(CommandIDs.createNewDirectory, {
    execute: () => {
      const widget = tracker.currentWidget;

      if (widget) {
        return widget.createNewDirectory();
      }
    },
    iconClass: 'jp-MaterialIcon jp-NewFolderIcon',
    label: 'New Folder'
  });

  commands.addCommand(CommandIDs.rename, {
    execute: args => {
      const widget = tracker.currentWidget;

      if (widget) {
        return widget.rename();
      }
    },
    iconClass: 'jp-MaterialIcon jp-EditIcon',
    label: 'Rename',
    mnemonic: 0
  });

  commands.addCommand(CommandIDs.copyPath, {
    execute: () => {
      const widget = tracker.currentWidget;
      if (!widget) {
        return;
      }
      const item = widget.selectedItems().next();
      if (!item) {
        return;
      }

      Clipboard.copyToSystem(item.path);
    },
    isVisible: () =>
      tracker.currentWidget &&
      tracker.currentWidget.selectedItems().next !== undefined,
    iconClass: 'jp-MaterialIcon jp-FileIcon',
    label: 'Copy Path'
  });

  commands.addCommand(CommandIDs.showBrowser, {
    execute: args => {
      const path = (args.path as string) || '';
      const browserForPath = getBrowserForPath(path);

      // Check for browser not found
      if (!browserForPath) {
        return;
      }
      // Shortcut if we are using the main file browser
      if (browser === browserForPath) {
        app.shell.activateById(browser.id);
        return;
      } else {
        const areas: ApplicationShell.Area[] = ['left', 'right'];
        for (let area of areas) {
          const it = app.shell.widgets(area);
          let widget = it.next();
          while (widget) {
            if (widget.contains(browserForPath)) {
              app.shell.activateById(widget.id);
              return;
            }
            widget = it.next();
          }
        }
      }
    }
  });

  commands.addCommand(CommandIDs.shutdown, {
    execute: () => {
      const widget = tracker.currentWidget;

      if (widget) {
        return widget.shutdownKernels();
      }
    },
    iconClass: 'jp-MaterialIcon jp-StopIcon',
    label: 'Shutdown Kernel'
  });

  commands.addCommand(CommandIDs.toggleBrowser, {
    execute: () => {
      if (browser.isHidden) {
        return commands.execute(CommandIDs.showBrowser, void 0);
      }

      return commands.execute(CommandIDs.hideBrowser, void 0);
    }
  });

  commands.addCommand(CommandIDs.createLauncher, {
    label: 'New Launcher',
    execute: () => createLauncher(commands, browser)
  });

  /**
   * A menu widget that dynamically populates with different widget factories
   * based on current filebrowser selection.
   */
  class OpenWithMenu extends Menu {
    protected onBeforeAttach(msg: Message): void {
      // clear the current menu items
      this.clearItems();

      // get the widget factories that could be used to open all of the items
      // in the current filebrowser selection
      let factories = OpenWithMenu._intersection(
        map(tracker.currentWidget.selectedItems(), i => {
          return OpenWithMenu._getFactories(i);
        })
      );

      if (factories) {
        // make new menu items from the widget factories
        factories.forEach(factory => {
          this.addItem({
            args: { factory: factory },
            command: CommandIDs.open
          });
        });
      }

      super.onBeforeAttach(msg);
    }

    static _getFactories(item: Contents.IModel): Array<string> {
      let factories = registry
        .preferredWidgetFactories(item.path)
        .map(f => f.name);
      const notebookFactory = registry.getWidgetFactory('notebook').name;
      if (
        item.type === 'notebook' &&
        factories.indexOf(notebookFactory) === -1
      ) {
        factories.unshift(notebookFactory);
      }

      return factories;
    }

    static _intersection<T>(iter: IIterator<Array<T>>): Set<T> | void {
      // pop the first element of iter
      let first = iter.next();
      // first will be undefined if iter is empty
      if (!first) {
        return;
      }

      // "initialize" the intersection from first
      let isect = new Set(first);
      // reduce over the remaining elements of iter
      return reduce(
        iter,
        (isect, subarr) => {
          // filter out all elements not present in both isect and subarr,
          // accumulate result in new set
          return new Set(subarr.filter(x => isect.has(x)));
        },
        isect
      );
    }
  }

  // matches anywhere on filebrowser
  const selectorContent = '.jp-DirListing-content';
  // matches all filebrowser items
  const selectorItem = '.jp-DirListing-item[data-isdir]';
  // matches only non-directory items
  const selectorNotDir = '.jp-DirListing-item[data-isdir="false"]';

  // If the user did not click on any file, we still want to show paste and new folder,
  // so target the content rather than an item.
  app.contextMenu.addItem({
    command: CommandIDs.createNewDirectory,
    selector: selectorContent,
    rank: 1
  });

  app.contextMenu.addItem({
    command: CommandIDs.paste,
    selector: selectorContent,
    rank: 2
  });

  app.contextMenu.addItem({
    command: CommandIDs.open,
    selector: selectorItem,
    rank: 1
  });

  const openWith = new OpenWithMenu({ commands });
  openWith.title.label = 'Open With';
  app.contextMenu.addItem({
    type: 'submenu',
    submenu: openWith,
    selector: selectorNotDir,
    rank: 2
  });

  app.contextMenu.addItem({
    command: CommandIDs.openBrowserTab,
    selector: selectorNotDir,
    rank: 3
  });

  app.contextMenu.addItem({
    command: CommandIDs.rename,
    selector: selectorItem,
    rank: 4
  });
  app.contextMenu.addItem({
    command: CommandIDs.del,
    selector: selectorItem,
    rank: 5
  });
  app.contextMenu.addItem({
    command: CommandIDs.cut,
    selector: selectorItem,
    rank: 6
  });

  app.contextMenu.addItem({
    command: CommandIDs.copy,
    selector: selectorNotDir,
    rank: 7
  });

  app.contextMenu.addItem({
    command: CommandIDs.duplicate,
    selector: selectorNotDir,
    rank: 8
  });
  app.contextMenu.addItem({
    command: CommandIDs.download,
    selector: selectorNotDir,
    rank: 9
  });
  app.contextMenu.addItem({
    command: CommandIDs.shutdown,
    selector: selectorNotDir,
    rank: 10
  });

  app.contextMenu.addItem({
    command: CommandIDs.share,
    selector: selectorItem,
    rank: 11
  });
  app.contextMenu.addItem({
    command: CommandIDs.copyPath,
    selector: selectorItem,
    rank: 12
  });
  app.contextMenu.addItem({
    command: CommandIDs.copyDownloadLink,
    selector: selectorNotDir,
    rank: 13
  });
}

/**
 * Create a launcher for a given filebrowser widget.
 */
function createLauncher(
  commands: CommandRegistry,
  browser: FileBrowser
): Promise<MainAreaWidget<Launcher>> {
  const { model } = browser;

  return commands
    .execute('launcher:create', { cwd: model.path })
    .then((launcher: MainAreaWidget<Launcher>) => {
      model.pathChanged.connect(
        () => {
          launcher.content.cwd = model.path;
        },
        launcher
      );
      return launcher;
    });
}
