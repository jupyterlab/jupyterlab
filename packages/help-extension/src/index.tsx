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
import { URLExt } from '@jupyterlab/coreutils';
import { IMainMenu } from '@jupyterlab/mainmenu';
import { Kernel, KernelMessage, Session } from '@jupyterlab/services';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import {
  IFrame,
  jupyterIcon,
  jupyterlabWordmarkIcon
} from '@jupyterlab/ui-components';
import { Menu } from '@lumino/widgets';
import * as React from 'react';

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

  // Commands kept for backwards compatibility after the move to the apputils-extension
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
 * A plugin to keep licenses commands that were previously defined in the help-extension.
 * This is mostly for backwards compatibility, in case some other plugins were manually executing these commands.
 */
const licensesCommands: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/help-extension:licenses-commands',
  autoStart: true,
  optional: [ITranslator],
  description: 'Add licenses commands for backwards compatibility.',
  activate: (app: JupyterFrontEnd, translator: ITranslator | null): void => {
    const { commands } = app;

    const trans = (translator ?? nullTranslator).load('jupyterlab');

    const licensesText = trans.__('Licenses');
    const downloadAsText = trans.__('Download All Licenses');
    const refreshLicenses = trans.__('Refresh Licenses');

    const apputilsLicencesCommand = 'apputils:licenses';
    commands.addCommand(CommandIDs.licenses, {
      label: licensesText,
      execute: args => {
        console.warn(
          `The command ${CommandIDs.licenses} is deprecated, use ${apputilsLicencesCommand} instead.`
        );
        return commands.execute(apputilsLicencesCommand, args);
      }
    });

    const apputilsLicenseReportCommand = 'apputils:license-report';
    commands.addCommand(CommandIDs.licenseReport, {
      label: downloadAsText,
      execute: args => {
        console.warn(
          `The command ${CommandIDs.licenseReport} is deprecated, use ${apputilsLicenseReportCommand} instead.`
        );
        return commands.execute(apputilsLicenseReportCommand, args);
      }
    });

    const apputilsRefreshLicensesCommand = 'apputils:licenses-refresh';
    commands.addCommand(CommandIDs.refreshLicenses, {
      label: refreshLicenses,
      execute: args => {
        console.warn(
          `The command ${CommandIDs.refreshLicenses} is deprecated, use ${apputilsRefreshLicensesCommand} instead.`
        );
        return commands.execute(apputilsRefreshLicensesCommand, args);
      }
    });
  }
};

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
            {trans.__('© %1-%2 Project Jupyter Contributors', 2015, 2025)}
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
            Dialog.cancelButton({
              label: trans.__('Close')
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
 * A plugin to open resources in IFrames or new browser tabs.
 */
const open: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/help-extension:open',
  description: 'Add command to open websites as panel or browser tab.',
  autoStart: true,
  requires: [ITranslator],
  optional: [ILayoutRestorer],
  activate: (
    app: JupyterFrontEnd,
    translator: ITranslator,
    restorer: ILayoutRestorer | null
  ): void => {
    const { commands, shell } = app;
    const trans = translator.load('jupyterlab');
    const namespace = 'help-doc';

    const tracker = new WidgetTracker<MainAreaWidget<IFrame>>({ namespace });
    let counter = 0;

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
        sandbox: ['allow-scripts', 'allow-forms'],
        loading: 'lazy'
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
  }
};

/**
 * A plugin to add a list of resources to the help menu.
 */
const resources: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/help-extension:resources',
  description: 'Adds menu entries to Jupyter reference documentation websites.',
  autoStart: true,
  requires: [IMainMenu, ITranslator],
  optional: [ILabShell, ICommandPalette],
  activate: (
    app: JupyterFrontEnd,
    mainMenu: IMainMenu,
    translator: ITranslator,
    labShell: ILabShell | null,
    palette: ICommandPalette | null
  ): void => {
    const trans = translator.load('jupyterlab');
    const category = trans.__('Help');
    const { commands, serviceManager } = app;
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
              const headerLogo = (
                <img src={kernelIconUrl} alt={trans.__('Kernel Icon')} />
              );
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
                  Dialog.cancelButton({
                    label: trans.__('Close')
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

const plugins: JupyterFrontEndPlugin<any>[] = [
  about,
  jupyterForum,
  licensesCommands,
  open,
  resources
];

export default plugins;
