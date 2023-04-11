// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module help-extension
 */

import {
  ILabShell,
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import {
  Dialog,
  ICommandPalette,
  MainAreaWidget,
  showDialog,
  WidgetTracker
} from '@jupyterlab/apputils';
import { PageConfig, URLExt } from '@jupyterlab/coreutils';
import { IMainMenu } from '@jupyterlab/mainmenu';
import { Kernel, KernelMessage, Session } from '@jupyterlab/services';
import { ITranslator } from '@jupyterlab/translation';
import {
  CommandToolbarButton,
  copyrightIcon,
  IFrame,
  jupyterIcon,
  jupyterlabWordmarkIcon,
  refreshIcon,
  Toolbar
} from '@jupyterlab/ui-components';
import { ReadonlyJSONObject } from '@lumino/coreutils';
import { Menu } from '@lumino/widgets';
import * as React from 'react';
import { Licenses } from './licenses';

/**
 * The command IDs used by the help plugin.
 */
namespace CommandIDs {
  export const open = 'help:open';

  export const about = 'help:about';

  export const activate = 'help:activate';

  export const close = 'help:close';

  export const show = 'help:show';

  export const hide = 'help:hide';

  export const jupyterForum = 'help:jupyter-forum';

  export const licenses = 'help:licenses';

  export const licenseReport = 'help:license-report';

  export const refreshLicenses = 'help:licenses-refresh';
}

/**
 * A flag denoting whether the application is loaded over HTTPS.
 */
const LAB_IS_SECURE = window.location.protocol === 'https:';

/**
 * The class name added to the help widget.
 */
const HELP_CLASS = 'jp-Help';

/**
 * Add a command to show an About dialog.
 */
const about: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/help-extension:about',
  description: 'Adds a "About" dialog feature.',
  autoStart: true,
  requires: [ITranslator],
  optional: [ICommandPalette],
  activate: (
    app: JupyterFrontEnd,
    translator: ITranslator,
    palette: ICommandPalette | null
  ): void => {
    const { commands } = app;
    const trans = translator.load('jupyterlab');
    const category = trans.__('Help');

    commands.addCommand(CommandIDs.about, {
      label: trans.__('About %1', app.name),
      execute: () => {
        // Create the header of the about dialog
        const versionNumber = trans.__('Version %1', app.version);
        const versionInfo = (
          <span className="jp-About-version-info">
            <span className="jp-About-version">{versionNumber}</span>
          </span>
        );
        const title = (
          <span className="jp-About-header">
            <jupyterIcon.react margin="7px 9.5px" height="auto" width="58px" />
            <div className="jp-About-header-info">
              <jupyterlabWordmarkIcon.react height="auto" width="196px" />
              {versionInfo}
            </div>
          </span>
        );

        // Create the body of the about dialog
        const jupyterURL = 'https://jupyter.org/about.html';
        const contributorsURL =
          'https://github.com/jupyterlab/jupyterlab/graphs/contributors';
        const externalLinks = (
          <span className="jp-About-externalLinks">
            <a
              href={contributorsURL}
              target="_blank"
              rel="noopener noreferrer"
              className="jp-Button-flat"
            >
              {trans.__('CONTRIBUTOR LIST')}
            </a>
            <a
              href={jupyterURL}
              target="_blank"
              rel="noopener noreferrer"
              className="jp-Button-flat"
            >
              {trans.__('ABOUT PROJECT JUPYTER')}
            </a>
          </span>
        );
        const copyright = (
          <span className="jp-About-copyright">
            {trans.__('© 2015-2023 Project Jupyter Contributors')}
          </span>
        );
        const body = (
          <div className="jp-About-body">
            {externalLinks}
            {copyright}
          </div>
        );

        return showDialog({
          title,
          body,
          buttons: [
            Dialog.createButton({
              label: trans.__('Dismiss'),
              className: 'jp-About-button jp-mod-reject jp-mod-styled'
            })
          ]
        });
      }
    });

    if (palette) {
      palette.addItem({ command: CommandIDs.about, category });
    }
  }
};

/**
 * A plugin to add a command to open the Jupyter Forum.
 */
const jupyterForum: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/help-extension:jupyter-forum',
  description: 'Adds command to open the Jupyter Forum website.',
  autoStart: true,
  requires: [ITranslator],
  optional: [ICommandPalette],
  activate: (
    app: JupyterFrontEnd,
    translator: ITranslator,
    palette: ICommandPalette | null
  ): void => {
    const { commands } = app;
    const trans = translator.load('jupyterlab');
    const category = trans.__('Help');

    commands.addCommand(CommandIDs.jupyterForum, {
      label: trans.__('Jupyter Forum'),
      execute: () => {
        window.open('https://discourse.jupyter.org/c/jupyterlab');
      }
    });

    if (palette) {
      palette.addItem({ command: CommandIDs.jupyterForum, category });
    }
  }
};

/**
 * A plugin to add a list of resources to the help menu.
 */
const resources: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/help-extension:resources',
  description: 'Adds commands to Jupyter reference documentation websites.',
  autoStart: true,
  requires: [IMainMenu, ITranslator],
  optional: [ILabShell, ICommandPalette, ILayoutRestorer],
  activate: (
    app: JupyterFrontEnd,
    mainMenu: IMainMenu,
    translator: ITranslator,
    labShell: ILabShell | null,
    palette: ICommandPalette | null,
    restorer: ILayoutRestorer | null
  ): void => {
    const trans = translator.load('jupyterlab');
    let counter = 0;
    const category = trans.__('Help');
    const namespace = 'help-doc';
    const { commands, shell, serviceManager } = app;
    const tracker = new WidgetTracker<MainAreaWidget<IFrame>>({ namespace });
    const resources = [
      {
        text: trans.__('JupyterLab Reference'),
        url: 'https://jupyterlab.readthedocs.io/en/latest/'
      },
      {
        text: trans.__('JupyterLab FAQ'),
        url: 'https://jupyterlab.readthedocs.io/en/latest/getting_started/faq.html'
      },
      {
        text: trans.__('Jupyter Reference'),
        url: 'https://jupyter.org/documentation'
      },
      {
        text: trans.__('Markdown Reference'),
        url: 'https://commonmark.org/help/'
      }
    ];

    resources.sort((a: any, b: any) => {
      return a.text.localeCompare(b.text);
    });

    /**
     * Create a new HelpWidget widget.
     */
    function newHelpWidget(url: string, text: string): MainAreaWidget<IFrame> {
      // Allow scripts and forms so that things like
      // readthedocs can use their search functionality.
      // We *don't* allow same origin requests, which
      // can prevent some content from being loaded onto the
      // help pages.
      const content = new IFrame({
        sandbox: ['allow-scripts', 'allow-forms']
      });
      content.url = url;
      content.addClass(HELP_CLASS);
      content.title.label = text;
      content.id = `${namespace}-${++counter}`;
      const widget = new MainAreaWidget({ content });
      widget.addClass('jp-Help');
      return widget;
    }

    commands.addCommand(CommandIDs.open, {
      label: args =>
        (args['text'] as string) ??
        trans.__('Open the provided `url` in a tab.'),
      execute: args => {
        const url = args['url'] as string;
        const text = args['text'] as string;
        const newBrowserTab = (args['newBrowserTab'] as boolean) || false;

        // If help resource will generate a mixed content error, load externally.
        if (
          newBrowserTab ||
          (LAB_IS_SECURE && URLExt.parse(url).protocol !== 'https:')
        ) {
          window.open(url);
          return;
        }

        const widget = newHelpWidget(url, text);
        void tracker.add(widget);
        shell.add(widget, 'main');
        return widget;
      }
    });

    // Handle state restoration.
    if (restorer) {
      void restorer.restore(tracker, {
        command: CommandIDs.open,
        args: widget => ({
          url: widget.content.url,
          text: widget.content.title.label
        }),
        name: widget => widget.content.url
      });
    }

    // Populate the Help menu.
    const helpMenu = mainMenu.helpMenu;

    const resourcesGroup = resources.map(args => ({
      args,
      command: CommandIDs.open
    }));
    helpMenu.addGroup(resourcesGroup, 10);

    // Generate a cache of the kernel help links.
    const kernelInfoCache = new Map<
      string,
      KernelMessage.IInfoReplyMsg['content']
    >();

    const onSessionRunningChanged = (
      m: Session.IManager,
      sessions: Session.IModel[]
    ) => {
      // If a new session has been added, it is at the back
      // of the session list. If one has changed or stopped,
      // it does not hurt to check it.
      if (!sessions.length) {
        return;
      }
      const sessionModel = sessions[sessions.length - 1];
      if (
        !sessionModel.kernel ||
        kernelInfoCache.has(sessionModel.kernel.name)
      ) {
        return;
      }
      const session = serviceManager.sessions.connectTo({
        model: sessionModel,
        kernelConnectionOptions: { handleComms: false }
      });

      void session.kernel?.info
        .then(kernelInfo => {
          const name = session.kernel!.name;

          // Check the cache second time so that, if two callbacks get scheduled,
          // they don't try to add the same commands.
          if (kernelInfoCache.has(name)) {
            return;
          }

          const spec = serviceManager.kernelspecs?.specs?.kernelspecs[name];
          if (!spec) {
            return;
          }

          // Set the Kernel Info cache.
          kernelInfoCache.set(name, kernelInfo);

          // Utility function to check if the current widget
          // has registered itself with the help menu.
          let usesKernel = false;
          const onCurrentChanged = async () => {
            const kernel: Kernel.IKernelConnection | null =
              await commands.execute('helpmenu:get-kernel');
            usesKernel = kernel?.name === name;
          };
          // Set the status for the current widget
          onCurrentChanged().catch(error => {
            console.error(
              'Failed to get the kernel for the current widget.',
              error
            );
          });
          if (labShell) {
            // Update status when current widget changes
            labShell.currentChanged.connect(onCurrentChanged);
          }
          const isEnabled = () => usesKernel;

          // Add the kernel banner to the Help Menu.
          const bannerCommand = `help-menu-${name}:banner`;
          const kernelName = spec.display_name;
          const kernelIconUrl =
            spec.resources['logo-svg'] || spec.resources['logo-64x64'];
          commands.addCommand(bannerCommand, {
            label: trans.__('About the %1 Kernel', kernelName),
            isVisible: isEnabled,
            isEnabled,
            execute: () => {
              // Create the header of the about dialog
              const headerLogo = <img src={kernelIconUrl} />;
              const title = (
                <span className="jp-About-header">
                  {headerLogo}
                  <div className="jp-About-header-info">{kernelName}</div>
                </span>
              );
              const banner = <pre>{kernelInfo.banner}</pre>;
              const body = <div className="jp-About-body">{banner}</div>;

              return showDialog({
                title,
                body,
                buttons: [
                  Dialog.createButton({
                    label: trans.__('Dismiss'),
                    className: 'jp-About-button jp-mod-reject jp-mod-styled'
                  })
                ]
              });
            }
          });
          helpMenu.addGroup([{ command: bannerCommand }], 20);

          // Add the kernel info help_links to the Help menu.
          const kernelGroup: Menu.IItemOptions[] = [];
          (kernelInfo.help_links || []).forEach(link => {
            const commandId = `help-menu-${name}:${link.text}`;
            commands.addCommand(commandId, {
              label: commands.label(CommandIDs.open, link),
              isVisible: isEnabled,
              isEnabled,
              execute: () => {
                return commands.execute(CommandIDs.open, link);
              }
            });
            kernelGroup.push({ command: commandId });
          });
          helpMenu.addGroup(kernelGroup, 21);
        })
        .then(() => {
          // Dispose of the session object since we no longer need it.
          session.dispose();
        });
    };

    // Create menu items for currently running sessions
    for (const model of serviceManager.sessions.running()) {
      onSessionRunningChanged(serviceManager.sessions, [model]);
    }
    serviceManager.sessions.runningChanged.connect(onSessionRunningChanged);

    if (palette) {
      resources.forEach(args => {
        palette.addItem({ args, command: CommandIDs.open, category });
      });
      palette.addItem({
        args: { reload: true },
        command: 'apputils:reset',
        category
      });
    }
  }
};

/**
 * A plugin to add a licenses reporting tools.
 */
const licenses: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/help-extension:licenses',
  description: 'Adds licenses used report tools.',
  autoStart: true,
  requires: [ITranslator],
  optional: [IMainMenu, ICommandPalette, ILayoutRestorer],
  activate: (
    app: JupyterFrontEnd,
    translator: ITranslator,
    menu: IMainMenu | null,
    palette: ICommandPalette | null,
    restorer: ILayoutRestorer | null
  ) => {
    // bail if no license API is available from the server
    if (!PageConfig.getOption('licensesUrl')) {
      return;
    }

    const { commands, shell } = app;
    const trans = translator.load('jupyterlab');

    // translation strings
    const category = trans.__('Help');
    const downloadAsText = trans.__('Download All Licenses as');
    const licensesText = trans.__('Licenses');
    const refreshLicenses = trans.__('Refresh Licenses');

    // an incrementer for license widget ids
    let counter = 0;

    const licensesUrl =
      URLExt.join(
        PageConfig.getBaseUrl(),
        PageConfig.getOption('licensesUrl')
      ) + '/';

    const licensesNamespace = 'help-licenses';
    const licensesTracker = new WidgetTracker<MainAreaWidget<Licenses>>({
      namespace: licensesNamespace
    });

    /**
     * Return a full license report format based on a format name
     */
    function formatOrDefault(format: string): Licenses.IReportFormat {
      return (
        Licenses.REPORT_FORMATS[format] ||
        Licenses.REPORT_FORMATS[Licenses.DEFAULT_FORMAT]
      );
    }

    /**
     * Create a MainAreaWidget for a license viewer
     */
    function createLicenseWidget(args: Licenses.ICreateArgs) {
      const licensesModel = new Licenses.Model({
        ...args,
        licensesUrl,
        trans,
        serverSettings: app.serviceManager.serverSettings
      });
      const content = new Licenses({ model: licensesModel });
      content.id = `${licensesNamespace}-${++counter}`;
      content.title.label = licensesText;
      content.title.icon = copyrightIcon;
      const main = new MainAreaWidget({
        content,
        reveal: licensesModel.licensesReady
      });

      main.toolbar.addItem(
        'refresh-licenses',
        new CommandToolbarButton({
          id: CommandIDs.refreshLicenses,
          args: { noLabel: 1 },
          commands
        })
      );

      main.toolbar.addItem('spacer', Toolbar.createSpacerItem());

      for (const format of Object.keys(Licenses.REPORT_FORMATS)) {
        const button = new CommandToolbarButton({
          id: CommandIDs.licenseReport,
          args: { format, noLabel: 1 },
          commands
        });
        main.toolbar.addItem(`download-${format}`, button);
      }

      return main;
    }

    // register license-related commands
    commands.addCommand(CommandIDs.licenses, {
      label: licensesText,
      execute: (args: any) => {
        const licenseMain = createLicenseWidget(args as Licenses.ICreateArgs);
        shell.add(licenseMain, 'main', { type: 'Licenses' });

        // add to tracker so it can be restored, and update when choices change
        void licensesTracker.add(licenseMain);
        licenseMain.content.model.trackerDataChanged.connect(() => {
          void licensesTracker.save(licenseMain);
        });
        return licenseMain;
      }
    });

    commands.addCommand(CommandIDs.refreshLicenses, {
      label: args => (args.noLabel ? '' : refreshLicenses),
      caption: refreshLicenses,
      icon: refreshIcon,
      execute: async () => {
        return licensesTracker.currentWidget?.content.model.initLicenses();
      }
    });

    commands.addCommand(CommandIDs.licenseReport, {
      label: args => {
        if (args.noLabel) {
          return '';
        }
        const format = formatOrDefault(`${args.format}`);
        return `${downloadAsText} ${format.title}`;
      },
      caption: args => {
        const format = formatOrDefault(`${args.format}`);
        return `${downloadAsText} ${format.title}`;
      },
      icon: args => {
        const format = formatOrDefault(`${args.format}`);
        return format.icon;
      },
      execute: async args => {
        const format = formatOrDefault(`${args.format}`);
        return await licensesTracker.currentWidget?.content.model.download({
          format: format.id
        });
      }
    });

    // handle optional integrations
    if (palette) {
      palette.addItem({ command: CommandIDs.licenses, category });
    }

    if (menu) {
      const helpMenu = menu.helpMenu;
      helpMenu.addGroup([{ command: CommandIDs.licenses }], 0);
    }

    if (restorer) {
      void restorer.restore(licensesTracker, {
        command: CommandIDs.licenses,
        name: widget => 'licenses',
        args: widget => {
          const { currentBundleName, currentPackageIndex, packageFilter } =
            widget.content.model;

          const args: Licenses.ICreateArgs = {
            currentBundleName,
            currentPackageIndex,
            packageFilter
          };
          return args as ReadonlyJSONObject;
        }
      });
    }
  }
};

const plugins: JupyterFrontEndPlugin<any>[] = [
  about,
  jupyterForum,
  resources,
  licenses
];

export default plugins;
