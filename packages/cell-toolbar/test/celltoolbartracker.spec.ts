/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
import {
  createToolbarFactory,
  ToolbarWidgetRegistry
} from '@jupyterlab/apputils';
import { CellBarExtension } from '@jupyterlab/cell-toolbar';
import { NotebookPanel } from '@jupyterlab/notebook';
import { ISettingRegistry, SettingRegistry } from '@jupyterlab/settingregistry';
import { IDataConnector } from '@jupyterlab/statedb';
import { NBTestUtils } from '@jupyterlab/testutils';
import { ITranslator } from '@jupyterlab/translation';

import { CommandRegistry } from '@lumino/commands';
import { Signal } from '@lumino/signaling';

import { CellToolbarTracker } from '../src/celltoolbartracker';

class TestSettings implements ISettingRegistry.ISettings {
  changed = new Signal<this, void>(this);
  composite = {};
  id = 'test-settings';
  isDisposed = false;
  plugin = {
    id: 'test-plugin',
    data: {
      composite: {},
      user: {}
    }, // ISettingBundle
    raw: '',
    schema: { type: 'object' } as ISettingRegistry.ISchema,
    version: '0.0.1'
  };
  raw = '';
  schema = { type: 'object' } as ISettingRegistry.ISchema;
  user = {};
  version = '0.0.2';
  annotatedDefaults = jest.fn();
  default = jest.fn();
  get = jest.fn();
  remove = jest.fn();
  save = jest.fn();
  set = jest.fn();
  validate = jest.fn();
  dispose = jest.fn();
}

function testToolbarFactory() {
  const pluginId = '@jupyterlab/cell-toolbar';

  const toolbarRegistry = new ToolbarWidgetRegistry({
    defaultFactory: jest.fn()
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
    let settings: ISettingRegistry.ISettings;
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

      settings = new TestSettings();

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
