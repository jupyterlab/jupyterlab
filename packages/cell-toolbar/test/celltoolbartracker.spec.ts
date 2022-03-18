import { CellBarExtension } from '@jupyterlab/cell-toolbar';
import { NotebookPanel } from '@jupyterlab/notebook';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { NBTestUtils } from '@jupyterlab/testutils';

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

/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
describe('@jupyterlab/cell-toolbar', () => {
  describe('CellBarExtension', () => {
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

      extension = new CellBarExtension(commands, settings);
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

      extension = new CellBarExtension(commands, settings);
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
