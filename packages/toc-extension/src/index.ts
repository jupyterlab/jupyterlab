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
  ITableOfContentsTracker,
  TableOfContents,
  TableOfContentsPanel,
  TableOfContentsRegistry,
  TableOfContentsTracker
} from '@jupyterlab/toc';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import {
  collapseAllIcon,
  CommandToolbarButton,
  ellipsesIcon,
  expandAllIcon,
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

  export const toggleCollapse = 'toc:toggle-collapse';
}

/**
 * Activates the ToC extension.
 *
 * @private
 * @param app - Jupyter application
 * @param tocRegistry - Table of contents registry
 * @param translator - translator
 * @param restorer - application layout restorer
 * @param labShell - Jupyter lab shell
 * @param settingRegistry - setting registry
 * @returns table of contents registry
 */
async function activateTOC(
  app: JupyterFrontEnd,
  tocRegistry: ITableOfContentsRegistry,
  translator?: ITranslator | null,
  restorer?: ILayoutRestorer | null,
  labShell?: ILabShell | null,
  settingRegistry?: ISettingRegistry | null
): Promise<ITableOfContentsTracker> {
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
        toc.model.setConfiguration({
          numberingH1: !toc.model.configuration.numberingH1
        });
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
        toc.model.setConfiguration({
          numberHeaders: !toc.model.configuration.numberHeaders
        });
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
        toc.model.setConfiguration({
          includeOutput: !toc.model.configuration.includeOutput
        });
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

  function someExpanded(model: TableOfContents.Model): boolean {
    return model.headings.some(h => !(h.collapsed ?? false));
  }

  app.commands.addCommand(CommandIDs.toggleCollapse, {
    label: () =>
      toc.model && !someExpanded(toc.model)
        ? trans.__('Expand All Headings')
        : trans.__('Collapse All Headings'),
    icon: args =>
      args.toolbar
        ? toc.model && !someExpanded(toc.model)
          ? expandAllIcon
          : collapseAllIcon
        : undefined,
    execute: () => {
      if (toc.model) {
        if (someExpanded(toc.model)) {
          toc.model.toggleCollapse({ collapsed: true });
        } else {
          toc.model.toggleCollapse({ collapsed: false });
        }
      }
    },
    isEnabled: () => toc.model !== null
  });

  const tracker = new TableOfContentsTracker();

  if (restorer) {
    // Add the ToC widget to the application restorer:
    restorer.add(toc, '@jupyterlab/toc:plugin');
  }

  // Attempt to load plugin settings:
  let settings: ISettingRegistry.ISettings | undefined;
  if (settingRegistry) {
    try {
      settings = await settingRegistry.load(registry.id);
      const updateSettings = (plugin: ISettingRegistry.ISettings) => {
        const composite = plugin.composite;
        for (const key of [...Object.keys(configuration)]) {
          const value = composite[key] as any;
          if (value !== undefined) {
            configuration[key] = value;
          }
        }

        if (labShell) {
          for (const widget of labShell.widgets('main')) {
            const model = tracker.get(widget);
            if (model) {
              model.setConfiguration(configuration);
            }
          }
        } else {
          if (app.shell.currentWidget) {
            const model = tracker.get(app.shell.currentWidget);
            if (model) {
              model.setConfiguration(configuration);
            }
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
  toc.toolbar.node.setAttribute(
    'aria-label',
    trans.__('Table of contents sidepanel toolbar')
  );
  toc.toolbar.addItem('display-numbering', numbering);

  toc.toolbar.addItem('spacer', Toolbar.createSpacerItem());

  toc.toolbar.addItem(
    'collapse-all',
    new CommandToolbarButton({
      commands: app.commands,
      id: CommandIDs.toggleCollapse,
      args: {
        toolbar: true
      },
      label: ''
    })
  );

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
    noFocusOnClick: false,
    onClick: () => {
      const bbox = menuButton.node.getBoundingClientRect();
      toolbarMenu.open(bbox.x, bbox.bottom);
    }
  });
  toc.toolbar.addItem('submenu', menuButton);

  // Add the ToC to the left area:
  app.shell.add(toc, 'left', { rank: 400, type: 'Table of Contents' });

  // Update the ToC when the active widget changes:
  if (labShell) {
    labShell.currentChanged.connect(onConnect);
  }

  // Connect to current widget
  void app.restored.then(() => {
    onConnect();
  });

  return tracker;

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
    let model = tracker.get(widget);
    if (!model) {
      model = tocRegistry.getModel(widget, configuration) ?? null;
      if (model) {
        tracker.add(widget, model);
      }

      widget.disposed.connect(() => {
        model?.dispose();
      });
    }

    if (toc.model) {
      toc.model.headingsChanged.disconnect(onCollapseChange);
      toc.model.collapseChanged.disconnect(onCollapseChange);
    }

    toc.model = model;
    if (toc.model) {
      toc.model.headingsChanged.connect(onCollapseChange);
      toc.model.collapseChanged.connect(onCollapseChange);
    }
    setToolbarButtonsState();
  }

  function setToolbarButtonsState() {
    app.commands.notifyCommandChanged(CommandIDs.displayNumbering);
    app.commands.notifyCommandChanged(CommandIDs.toggleCollapse);
  }

  function onCollapseChange() {
    app.commands.notifyCommandChanged(CommandIDs.toggleCollapse);
  }
}

/**
 * Table of contents registry plugin.
 */
const registry: JupyterFrontEndPlugin<ITableOfContentsRegistry> = {
  id: '@jupyterlab/toc-extension:registry',
  description: 'Provides the table of contents registry.',
  autoStart: true,
  provides: ITableOfContentsRegistry,
  activate: (): ITableOfContentsRegistry => {
    // Create the ToC registry
    return new TableOfContentsRegistry();
  }
};

/**
 * Table of contents tracker plugin.
 */
const tracker: JupyterFrontEndPlugin<ITableOfContentsTracker> = {
  id: '@jupyterlab/toc-extension:tracker',
  description: 'Adds the table of content widget and provides its tracker.',
  autoStart: true,
  provides: ITableOfContentsTracker,
  requires: [ITableOfContentsRegistry],
  optional: [ITranslator, ILayoutRestorer, ILabShell, ISettingRegistry],
  activate: activateTOC
};

/**
 * Exports.
 */
export default [registry, tracker];
