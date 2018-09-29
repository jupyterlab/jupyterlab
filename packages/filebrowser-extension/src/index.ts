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
  IFileBrowserFactory
} from '@jupyterlab/filebrowser';

import { Launcher } from '@jupyterlab/launcher';

import { map, reduce, toArray } from '@phosphor/algorithm';

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

  // paste command used when user did not click on an item
  export const pasteNotItem = 'filebrowser:paste-not-item';

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
 * The file browser namespace token.
 */
const namespace = 'filebrowser';

/**
 * Export the plugins as default.
 */
const plugins: JupyterLabPlugin<any>[] = [factory, browser];
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
      model,
      commands: options.commands || commands
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
    iconClass: 'jp-MaterialIcon jp-OpenFolderIcon',
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
  class OpenwithMenu extends Menu {
    protected onBeforeAttach(msg: Message): void {
      const widget = tracker.currentWidget;
      let listings = widget.selectedItems();
      let listing = listings.next();

      // clear the current menu items
      this.clearItems();

      // listing will be undefined if widget.selectedItems() is empty
      if (listing) {
        // get the intersection of all the preferred factories in the current file browser selection
        let factories = new Set(
          registry.preferredWidgetFactories(listing.path)
        );
        factories = reduce(
          listings,
          (i, l) => {
            return new Set(
              registry.preferredWidgetFactories(l.path).filter(x => i.has(x))
            );
          },
          factories
        );

        // make new menu items from the preferred factories
        factories.forEach(factory => {
          this.addItem({
            args: { factory: factory.name },
            command: CommandIDs.open
          });
        });
      }

      super.onBeforeAttach(msg);
    }
  }

  // matches anywhere on filebrowser that is not an item
  const selectorDeadSpace = '.jp-DirListing-deadSpace';
  // matches all filebrowser items
  const selectorItem = '.jp-DirListing-item[data-isdir]';
  // matches only non-directory items
  const selectorNotDir = '.jp-DirListing-item[data-isdir="false"]';

  // If the user did not click on any file, we still want to show paste
  app.contextMenu.addItem({
    command: CommandIDs.paste,
    selector: selectorDeadSpace,
    rank: 1
  });

  app.contextMenu.addItem({
    command: CommandIDs.open,
    selector: selectorItem,
    rank: 1
  });

  const openWith = new OpenwithMenu({ commands });
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
    command: CommandIDs.paste,
    selector: selectorItem,
    rank: 8
  });

  app.contextMenu.addItem({
    command: CommandIDs.duplicate,
    selector: selectorNotDir,
    rank: 9
  });
  app.contextMenu.addItem({
    command: CommandIDs.download,
    selector: selectorNotDir,
    rank: 10
  });
  app.contextMenu.addItem({
    command: CommandIDs.shutdown,
    selector: selectorNotDir,
    rank: 11
  });

  app.contextMenu.addItem({
    command: CommandIDs.share,
    selector: selectorItem,
    rank: 12
  });
  app.contextMenu.addItem({
    command: CommandIDs.copyPath,
    selector: selectorItem,
    rank: 13
  });
  app.contextMenu.addItem({
    command: CommandIDs.copyDownloadLink,
    selector: selectorItem,
    rank: 14
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
