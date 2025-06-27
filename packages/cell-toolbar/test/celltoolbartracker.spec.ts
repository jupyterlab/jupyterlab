/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
import {
  createToolbarFactory,
  ToolbarWidgetRegistry
} from '@jupyterlab/apputils';
import { CellBarExtension, CellToolbarTracker } from '@jupyterlab/cell-toolbar';
import { ToolbarRegistry } from '@jupyterlab/apputils';
import { NotebookPanel, NotebookTracker } from '@jupyterlab/notebook';
import { NBTestUtils } from '@jupyterlab/notebook/lib/testutils';
import { ISettingRegistry, SettingRegistry } from '@jupyterlab/settingregistry';
import { IDataConnector } from '@jupyterlab/statedb';
import { ITranslator } from '@jupyterlab/translation';
import { CommandRegistry } from '@lumino/commands';
import { Widget } from '@lumino/widgets';
import { framePromise } from '@jupyterlab/testing';

class CellBarExtensionWithCustomItemFactory extends CellBarExtension {
  protected createItemFactory(commands: CommandRegistry) {
    return (
      _widgetFactory: string,
      _widget: Widget,
      toolbarItem: ToolbarRegistry.IWidget
    ) => {
      const itemWidget = new Widget();
      if (toolbarItem.command) {
        const button = document.createElement('button');
        button.dataset.command = toolbarItem.command;
        button.disabled = !commands.isEnabled(
          toolbarItem.command,
          toolbarItem.args
        );
        itemWidget.node.appendChild(button);
      }
      return itemWidget;
    };
  }
}

const CELL_TOOLBAR_SELECTOR = '[aria-label="Cell toolbar"]';

function testToolbarFactory() {
  const pluginId = '@jupyterlab/cell-toolbar';

  const toolbarRegistry = new ToolbarWidgetRegistry({
    defaultFactory: jest.fn().mockImplementation(() => new Widget())
  });

  const bar: ISettingRegistry.IPlugin = {
    data: {
      composite: {},
      user: {}
    },
    id: pluginId,
    raw: '{}',
    schema: {
      'jupyter.lab.toolbars': {
        dummyFactory: [
          {
            name: 'insert',
            command: 'notebook:insert-cell-below',
            rank: 20
          },
          { name: 'spacer', type: 'spacer', rank: 100 },
          { name: 'cut', command: 'notebook:cut-cell', rank: 21 },
          {
            name: 'clear-all',
            command: 'notebook:clear-all-cell-outputs',
            rank: 60,
            disabled: true
          }
        ]
      },
      'jupyter.lab.transform': true,
      properties: {
        toolbar: {
          type: 'array'
        }
      },
      type: 'object'
    },
    version: 'test'
  };

  const connector: IDataConnector<
    ISettingRegistry.IPlugin,
    string,
    string,
    string
  > = {
    fetch: jest.fn().mockImplementation((id: string) => {
      switch (id) {
        case bar.id:
          return bar;
        default:
          return {};
      }
    }),
    list: jest.fn(),
    save: jest.fn(),
    remove: jest.fn()
  };

  const settingRegistry = new SettingRegistry({
    connector
  });
  const factoryName = 'dummyFactory';
  const translator: ITranslator = {
    languageCode: 'en',
    load: jest.fn()
  };

  return createToolbarFactory(
    toolbarRegistry,
    settingRegistry,
    factoryName,
    pluginId,
    translator
  );
}

describe('@jupyterlab/cell-toolbar', () => {
  describe('CellBarExtension', () => {
    let commands: CommandRegistry;
    let panel: NotebookPanel;
    let extension: CellBarExtension;

    beforeAll(() => {
      commands = new CommandRegistry();
      commands.addCommand('notebook:move-cell-up', {
        execute: args => null
      });
      commands.addCommand('notebook:move-cell-down', {
        execute: args => null
      });

      extension = new CellBarExtension(commands, testToolbarFactory());
    });

    afterEach(() => {
      if (panel) {
        panel.dispose();
      }
    });

    describe('#constructor()', () => {
      it('should create a cell toolbar extension', () => {
        expect(extension).toBeInstanceOf(CellBarExtension);
      });
    });
  });

  describe('CellToolbarTracker', () => {
    let commands: CommandRegistry;
    let panel: NotebookPanel;
    let extension: CellBarExtension;
    let notebookTracker: NotebookTracker;

    beforeAll(() => {
      commands = new CommandRegistry();
      const getPanel = (args: any) => {
        return (
          notebookTracker.find(
            panel => panel.id === args[CellBarExtension.WIDGET_ID_ARG]
          ) ?? null
        );
      };
      commands.addCommand('notebook:move-cell-up', {
        execute: args => null,
        isEnabled: args => {
          const widget = getPanel(args)!;
          return widget.content.activeCellIndex != 0;
        }
      });
      commands.addCommand('notebook:move-cell-down', {
        execute: args => null
      });
      notebookTracker = new NotebookTracker({ namespace: 'notebook' });

      extension = new CellBarExtension(commands, testToolbarFactory());
    });

    afterEach(() => {
      if (panel) {
        panel.dispose();
      }
    });

    describe('#createNew()', () => {
      it('should create a new cell toolbar tracker', async () => {
        const context = await NBTestUtils.createMockContext();
        panel = NBTestUtils.createNotebookPanel(context);

        await panel.revealed;

        const tracker = extension.createNew(panel);
        expect(tracker).toBeInstanceOf(CellToolbarTracker);
      });

      it('should track the panel for which it was created', async () => {
        // Create an cell toolbar extension with custom item factory,
        // but using the default toolbar factory so that we can
        // test the panel logic in the default toolbar factory.
        extension = new CellBarExtensionWithCustomItemFactory(commands);

        const context = await NBTestUtils.createMockContext();
        const notebookA = NBTestUtils.createNotebookPanel(context);
        const notebookB = NBTestUtils.createNotebookPanel(context);
        await notebookTracker.add(notebookA);
        await notebookTracker.add(notebookB);
        NBTestUtils.populateNotebook(notebookA.content);
        NBTestUtils.populateNotebook(notebookB.content);

        notebookA.content.activeCellIndex = 0;
        notebookB.content.activeCellIndex = 1;

        await notebookA.revealed;
        await notebookB.revealed;

        extension.createNew(notebookA);
        extension.createNew(notebookB);

        await framePromise();
        await framePromise();

        const toolbarA = notebookA.content.activeCell!.node.querySelector(
          CELL_TOOLBAR_SELECTOR
        )!;
        const toolbarB = notebookB.content.activeCell!.node.querySelector(
          CELL_TOOLBAR_SELECTOR
        )!;

        const buttonUpA = toolbarA.querySelector(
          '[data-command="notebook:move-cell-up"]'
        ) as HTMLButtonElement;
        const buttonUpB = toolbarB.querySelector(
          '[data-command="notebook:move-cell-up"]'
        ) as HTMLButtonElement;

        expect(buttonUpA.disabled).toBe(true);
        expect(buttonUpB.disabled).toBe(false);
      });
    });
  });
});
