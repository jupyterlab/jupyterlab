import { CellBarExtension } from "@jupyterlab/cell-toolbar";
import { ISettingRegistry } from "@jupyterlab/settingregistry";

import { CommandRegistry } from "@lumino/commands";
import { Signal } from "@lumino/signaling";


class TestSettings implements ISettingRegistry.ISettings {
  changed = new Signal<this, void>(this);
  composite = {};
  id = "test-settings";
  isDisposed = false;
  plugin = {
    id: 'test-plugin',
    data: {
      composite: {},
      user: {}
    }, // ISettingBundle
    raw: '',
    schema: {type: 'object'} as ISettingRegistry.ISchema,
    version: '0.0.1'
  };
  raw = '';
  schema = {type: 'object'} as ISettingRegistry.ISchema;
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

    beforeAll(() => {
      commands = new CommandRegistry();
      commands.addCommand('notebook:move-cell-up', {
        execute: (args) => null,
      });
      commands.addCommand('notebook:move-cell-down', {
        execute: (args) => null,
      });

      settings = new TestSettings();
    });

    describe('#constructor()', () => {
      it('should create a cell toolbar extension', () => {
        const extension = new CellBarExtension(commands, settings);
        expect(extension).toBeInstanceOf(CellBarExtension);
      });
    });
  });
});