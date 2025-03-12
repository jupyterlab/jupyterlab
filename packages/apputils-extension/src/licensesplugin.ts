/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import {
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import {
  ICommandPalette,
  ILicensesClient,
  Licenses,
  MainAreaWidget,
  WidgetTracker
} from '@jupyterlab/apputils';
import { PageConfig, URLExt } from '@jupyterlab/coreutils';
import { IMainMenu } from '@jupyterlab/mainmenu';
import { ITranslator } from '@jupyterlab/translation';
import {
  CommandToolbarButton,
  copyrightIcon,
  refreshIcon,
  Toolbar
} from '@jupyterlab/ui-components';
import { ReadonlyJSONObject } from '@lumino/coreutils';

/**
 * The command IDs used by the licenses plugin.
 */
namespace CommandIDs {
  export const licenses = 'apputils:licenses';

  export const licenseReport = 'apputils:license-report';

  export const refreshLicenses = 'apputils:licenses-refresh';
}

/**
 * The license client plugin for fetching licenses.
 */
export const licensesClient: JupyterFrontEndPlugin<ILicensesClient> = {
  id: '@jupyterlab/apputils-extension:licenses-client',
  description: 'The licenses client plugin for fetching licenses.',
  autoStart: true,
  provides: ILicensesClient,
  activate: (app: JupyterFrontEnd) => {
    const licensesUrl =
      URLExt.join(
        PageConfig.getBaseUrl(),
        PageConfig.getOption('licensesUrl')
      ) + '/';
    const serverSettings = app.serviceManager.serverSettings;
    return new Licenses.LicensesClient({ licensesUrl, serverSettings });
  }
};

/**
 * A plugin to add a licenses reporting tools.
 */
export const licensesPlugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/apputils-extension:licenses-plugin',
  description: 'Adds licenses reporting tools.',
  requires: [ILicensesClient, ITranslator],
  optional: [ILayoutRestorer, IMainMenu, ICommandPalette],
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    client: ILicensesClient,
    translator: ITranslator,
    restorer: ILayoutRestorer | null,
    menu: IMainMenu | null,
    palette: ICommandPalette | null
  ) => {
    const { commands, shell } = app;

    const trans = translator.load('jupyterlab');

    const category = trans.__('Help');
    const downloadAsText = trans.__('Download All Licenses as');
    const refreshLicenses = trans.__('Refresh Licenses');

    const licensesNamespace = 'help-licenses';
    const licensesTracker = new WidgetTracker<MainAreaWidget<Licenses>>({
      namespace: licensesNamespace
    });

    // translation strings
    const licensesText = trans.__('Licenses');

    // an incrementer for license widget ids
    let counter = 0;

    /**
     * Create a MainAreaWidget for a license viewer
     */
    function createLicenseWidget(args: Licenses.ICreateArgs) {
      const licensesModel = new Licenses.Model({
        ...args,
        client,
        trans
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

    /**
     * Return a full license report format based on a format name
     */
    function formatOrDefault(format: string): Licenses.IReportFormat {
      return (
        Licenses.REPORT_FORMATS[format] ||
        Licenses.REPORT_FORMATS[Licenses.DEFAULT_FORMAT]
      );
    }

    // register license-related commands
    commands.addCommand(CommandIDs.licenses, {
      label: licensesText,
      execute: (args: any) => {
        // bail if no license API is available from the server
        if (!PageConfig.getOption('licensesUrl')) {
          console.warn('No license API available from the server');
          return;
        }
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
