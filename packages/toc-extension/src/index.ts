// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module toc-extension
 */

import {
  ILabShell,
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import {
  ITableOfContentsRegistry,
  TableOfContents,
  TableOfContentsPanel,
  TableOfContentsRegistry
} from '@jupyterlab/toc';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import {
  CommandToolbarButton,
  ellipsesIcon,
  MenuSvg,
  numberingIcon,
  tocIcon,
  Toolbar,
  ToolbarButton
} from '@jupyterlab/ui-components';

/**
 * A namespace for command IDs of table of contents plugin.
 */
namespace CommandIDs {
  export const displayNumbering = 'toc:display-numbering';

  export const displayH1Numbering = 'toc:display-h1-numbering';

  export const displayOutputNumbering = 'toc:display-outputs-numbering';

  export const showPanel = 'toc:show-panel';
}

/**
 * Activates the ToC extension.
 *
 * @private
 * @param app - Jupyter application
 * @param translator - translator
 * @param restorer - application layout restorer
 * @param labShell - Jupyter lab shell
 * @param settingRegistry - setting registry
 * @returns table of contents registry
 */
async function activateTOC(
  app: JupyterFrontEnd,
  translator?: ITranslator | null,
  restorer?: ILayoutRestorer | null,
  labShell?: ILabShell | null,
  settingRegistry?: ISettingRegistry | null
): Promise<ITableOfContentsRegistry> {
  const trans = (translator ?? nullTranslator).load('jupyterlab');
  let configuration = { ...TableOfContents.defaultConfig };

  // Create the ToC widget:
  const toc = new TableOfContentsPanel(translator ?? undefined);
  toc.title.icon = tocIcon;
  toc.title.caption = trans.__('Table of Contents');
  toc.id = 'table-of-contents';
  toc.node.setAttribute('role', 'region');
  toc.node.setAttribute('aria-label', trans.__('Table of Contents section'));

  app.commands.addCommand(CommandIDs.displayH1Numbering, {
    label: trans.__('Show first-level heading number'),
    execute: () => {
      if (toc.model) {
        toc.model.configuration = {
          ...toc.model.configuration,
          numberingH1: !toc.model.configuration.numberingH1
        };
      }
    },
    isEnabled: () =>
      toc.model?.supportedOptions.includes('numberingH1') ?? false,
    isToggled: () => toc.model?.configuration.numberingH1 ?? false
  });

  app.commands.addCommand(CommandIDs.displayNumbering, {
    label: trans.__('Show heading number in the document'),
    icon: args => (args.toolbar ? numberingIcon : undefined),
    execute: () => {
      if (toc.model) {
        toc.model.configuration = {
          ...toc.model.configuration,
          numberHeaders: !toc.model.configuration.numberHeaders
        };
        app.commands.notifyCommandChanged(CommandIDs.displayNumbering);
      }
    },
    isEnabled: () =>
      toc.model?.supportedOptions.includes('numberHeaders') ?? false,
    isToggled: () => toc.model?.configuration.numberHeaders ?? false
  });

  app.commands.addCommand(CommandIDs.displayOutputNumbering, {
    label: trans.__('Show output headings'),
    execute: () => {
      if (toc.model) {
        toc.model.configuration = {
          ...toc.model.configuration,
          includeOutput: !toc.model.configuration.includeOutput
        };
      }
    },
    isEnabled: () =>
      toc.model?.supportedOptions.includes('includeOutput') ?? false,
    isToggled: () => toc.model?.configuration.includeOutput ?? false
  });

  app.commands.addCommand(CommandIDs.showPanel, {
    label: trans.__('Table of Contents'),
    execute: () => {
      app.shell.activateById(toc.id);
    }
  });

  const tocModels = new Map<string, TableOfContents.Model | null>();

  // Create the ToC registry:
  const registry = new TableOfContentsRegistry();

  if (restorer) {
    // Add the ToC widget to the application restorer:
    restorer.add(toc, '@jupyterlab/toc:plugin');
  }

  // Attempt to load plugin settings:
  let settings: ISettingRegistry.ISettings | undefined;
  if (settingRegistry) {
    try {
      settings = await settingRegistry.load(extension.id);
      const updateSettings = (plugin: ISettingRegistry.ISettings) => {
        const composite = plugin.composite;
        for (const key of [...Object.keys(configuration)]) {
          const value = composite[key] as any;
          if (value !== undefined) {
            configuration[key] = value;
          }
        }

        for (const model of tocModels.values()) {
          if (model) {
            model.configuration = configuration;
          }
        }
      };
      if (settings) {
        settings.changed.connect(updateSettings);
        updateSettings(settings);
      }
    } catch (error) {
      console.error(
        `Failed to load settings for the Table of Contents extension.\n\n${error}`
      );
    }
  }

  // Set up the panel toolbar
  const numbering = new CommandToolbarButton({
    commands: app.commands,
    id: CommandIDs.displayNumbering,
    args: {
      toolbar: true
    },
    label: ''
  });
  numbering.addClass('jp-toc-numberingButton');
  toc.toolbar.addItem('display-numbering', numbering);

  toc.toolbar.addItem('spacer', Toolbar.createSpacerItem());

  const toolbarMenu = new MenuSvg({ commands: app.commands });
  toolbarMenu.addItem({
    command: CommandIDs.displayH1Numbering
  });
  toolbarMenu.addItem({
    command: CommandIDs.displayOutputNumbering
  });
  const menuButton = new ToolbarButton({
    tooltip: trans.__('More actions…'),
    icon: ellipsesIcon,
    actualOnClick: true,
    onClick: () => {
      const bbox = menuButton.node.getBoundingClientRect();
      toolbarMenu.open(bbox.x, bbox.bottom);
    }
  });
  toc.toolbar.addItem('submenu', menuButton);

  // Add the ToC to the left area:
  app.shell.add(toc, 'left', { rank: 400 });

  // Update the ToC when the active widget changes:
  if (labShell) {
    labShell.currentChanged.connect(onConnect);
  }

  // Connect to current widget
  app.restored.then(() => {
    onConnect();
  });

  return registry;

  /**
   * Callback invoked when the active widget changes.
   *
   * @private
   */
  function onConnect() {
    let widget = app.shell.currentWidget;
    if (!widget) {
      return;
    }
    const id = widget.id;
    let model = tocModels.get(id);
    if (!model || model.isDisposed) {
      model = registry.getModel(widget, configuration) ?? null;
      tocModels.set(id, model);

      widget.disposed.connect(() => {
        tocModels.delete(id);
        model?.dispose();
      });
    }

    toc.model = model;
    setNumberingButtonState();
  }

  function setNumberingButtonState() {
    app.commands.notifyCommandChanged(CommandIDs.displayNumbering);
  }
}

/**
 * Initialization data for the ToC extension.
 *
 * @private
 */
const extension: JupyterFrontEndPlugin<ITableOfContentsRegistry> = {
  id: '@jupyterlab/toc-extension:registry',
  autoStart: true,
  provides: ITableOfContentsRegistry,
  optional: [ITranslator, ILayoutRestorer, ILabShell, ISettingRegistry],
  activate: activateTOC
};

/**
 * Exports.
 */
export default extension;
