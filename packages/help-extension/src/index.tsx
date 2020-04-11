// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import {
  Dialog,
  ICommandPalette,
  IFrame,
  MainAreaWidget,
  showDialog,
  WidgetTracker
} from '@jupyterlab/apputils';

import { PageConfig, URLExt } from '@jupyterlab/coreutils';

import { IInspector } from '@jupyterlab/inspector';

import { IMainMenu } from '@jupyterlab/mainmenu';

import { KernelMessage } from '@jupyterlab/services';

import { jupyterIcon, jupyterlabWordmarkIcon } from '@jupyterlab/ui-components';

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

  export const launchClassic = 'help:launch-classic-notebook';
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
 * A list of help resources.
 */

const RESOURCES = [
  {
    text: 'JupyterLab Reference',
    url: 'https://jupyterlab.readthedocs.io/en/stable/'
  },
  {
    text: 'JupyterLab FAQ',
    url: 'https://jupyterlab.readthedocs.io/en/stable/getting_started/faq.html'
  },
  {
    text: 'Jupyter Reference',
    url: 'https://jupyter.org/documentation'
  },
  {
    text: 'Markdown Reference',
    url: 'https://commonmark.org/help/'
  }
];

RESOURCES.sort((a: any, b: any) => {
  return a.text.localeCompare(b.text);
});

/**
 * The help handler extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  activate,
  id: '@jupyterlab/help-extension:plugin',
  requires: [IMainMenu],
  optional: [ICommandPalette, ILayoutRestorer, IInspector],
  autoStart: true
};

/**
 * Export the plugin as default.
 */
export default plugin;

/**
 * Activate the help handler extension.
 *
 * @param app - The phosphide application object.
 *
 * returns A promise that resolves when the extension is activated.
 */
function activate(
  app: JupyterFrontEnd,
  mainMenu: IMainMenu,
  palette: ICommandPalette | null,
  restorer: ILayoutRestorer | null,
  inspector: IInspector | null
): void {
  let counter = 0;
  const category = 'Help';
  const namespace = 'help-doc';
  const baseUrl = PageConfig.getBaseUrl();
  const { commands, shell, serviceManager } = app;
  const tracker = new WidgetTracker<MainAreaWidget<IFrame>>({ namespace });

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

  // Populate the Help menu.
  const helpMenu = mainMenu.helpMenu;
  const labGroup = [
    CommandIDs.about,
    CommandIDs.launchClassic
  ].map(command => ({ command }));
  helpMenu.addGroup(labGroup, 0);

  // Contextual help in its own group
  const contextualHelpGroup = [
    inspector ? 'inspector:open' : undefined
  ].map(command => ({ command }));
  helpMenu.addGroup(contextualHelpGroup, 0);

  const resourcesGroup = RESOURCES.map(args => ({
    args,
    command: CommandIDs.open
  }));
  helpMenu.addGroup(resourcesGroup, 10);

  // Generate a cache of the kernel help links.
  const kernelInfoCache = new Map<
    string,
    KernelMessage.IInfoReplyMsg['content']
  >();
  serviceManager.sessions.runningChanged.connect((m, sessions) => {
    // If a new session has been added, it is at the back
    // of the session list. If one has changed or stopped,
    // it does not hurt to check it.
    if (!sessions.length) {
      return;
    }
    const sessionModel = sessions[sessions.length - 1];
    if (!sessionModel.kernel || kernelInfoCache.has(sessionModel.kernel.name)) {
      return;
    }
    const session = serviceManager.sessions.connectTo({
      model: sessionModel,
      kernelConnectionOptions: { handleComms: false }
    });

    void session.kernel?.info.then(kernelInfo => {
      const name = session.kernel!.name;

      // Check the cache second time so that, if two callbacks get scheduled,
      // they don't try to add the same commands.
      if (kernelInfoCache.has(name)) {
        return;
      }
      // Set the Kernel Info cache.
      kernelInfoCache.set(name, kernelInfo);

      // Utility function to check if the current widget
      // has registered itself with the help menu.
      const usesKernel = () => {
        let result = false;
        const widget = app.shell.currentWidget;
        if (!widget) {
          return result;
        }
        helpMenu.kernelUsers.forEach(u => {
          if (u.tracker.has(widget) && u.getKernel(widget)?.name === name) {
            result = true;
          }
        });
        return result;
      };

      // Add the kernel banner to the Help Menu.
      const bannerCommand = `help-menu-${name}:banner`;
      const spec = serviceManager.kernelspecs?.specs?.kernelspecs[name];
      if (!spec) {
        return;
      }
      const kernelName = spec.display_name;
      let kernelIconUrl = spec.resources['logo-64x64'];
      if (kernelIconUrl) {
        const index = kernelIconUrl.indexOf('kernelspecs');
        kernelIconUrl = baseUrl + kernelIconUrl.slice(index);
      }
      commands.addCommand(bannerCommand, {
        label: `About the ${kernelName} Kernel`,
        isVisible: usesKernel,
        isEnabled: usesKernel,
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
                label: 'Dismiss',
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
          label: link.text,
          isVisible: usesKernel,
          isEnabled: usesKernel,
          execute: () => {
            return commands.execute(CommandIDs.open, link);
          }
        });
        kernelGroup.push({ command: commandId });
      });
      helpMenu.addGroup(kernelGroup, 21);

      // Dispose of the session object since we no longer need it.
      session.dispose();
    });
  });

  commands.addCommand(CommandIDs.about, {
    label: `About ${app.name}`,
    execute: () => {
      // Create the header of the about dialog
      const versionNumber = `Version ${app.version}`;
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
            CONTRIBUTOR LIST
          </a>
          <a
            href={jupyterURL}
            target="_blank"
            rel="noopener noreferrer"
            className="jp-Button-flat"
          >
            ABOUT PROJECT JUPYTER
          </a>
        </span>
      );
      const copyright = (
        <span className="jp-About-copyright">
          © 2015-2020 Project Jupyter Contributors
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
            label: 'Dismiss',
            className: 'jp-About-button jp-mod-reject jp-mod-styled'
          })
        ]
      });
    }
  });

  commands.addCommand(CommandIDs.open, {
    label: args => args['text'] as string,
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

  commands.addCommand(CommandIDs.launchClassic, {
    label: 'Launch Classic Notebook',
    execute: () => {
      window.open(PageConfig.getBaseUrl() + 'tree');
    }
  });

  if (palette) {
    RESOURCES.forEach(args => {
      palette.addItem({ args, command: CommandIDs.open, category });
    });
    palette.addItem({ command: 'apputils:reset', category });
    palette.addItem({ command: CommandIDs.launchClassic, category });
  }
}
