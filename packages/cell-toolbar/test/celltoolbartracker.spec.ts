/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
import {
  createToolbarFactory,
  ToolbarWidgetRegistry
} from '@jupyterlab/apputils';
import { CellBarExtension, CellToolbarTracker } from '@jupyterlab/cell-toolbar';
import { NotebookPanel } from '@jupyterlab/notebook';
import { NBTestUtils } from '@jupyterlab/notebook/lib/testutils';
import { ISettingRegistry, SettingRegistry } from '@jupyterlab/settingregistry';
import { IDataConnector } from '@jupyterlab/statedb';
import { ITranslator } from '@jupyterlab/translation';
import { CommandRegistry } from '@lumino/commands';
import { Widget } from '@lumino/widgets';

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

    describe('#createNew()', () => {
      it('should create a new cell toolbar tracker', async () => {
        const context = await NBTestUtils.createMockContext();
        panel = NBTestUtils.createNotebookPanel(context);

        await panel.revealed;

        const tracker = extension.createNew(panel);
        expect(tracker).toBeInstanceOf(CellToolbarTracker);
      });
    });
  });
});
