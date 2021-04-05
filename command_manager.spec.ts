import { IDocumentWidget } from '@jupyterlab/docregistry';
import { expect } from 'chai';

import { WidgetAdapter } from './adapters/adapter';
import {
  CommandEntryPoint,
  ContextCommandManager,
  IContextMenuOptions
} from './command_manager';
import { IFeatureCommand } from './feature';
import { BrowserConsole } from './virtual/console';

describe('ContextMenuCommandManager', () => {
  class ManagerImplementation extends ContextCommandManager {
    constructor(options: IContextMenuOptions) {
      super({
        app: null,
        adapter_manager: null,
        palette: null,
        tracker: null,
        suffix: null,
        entry_point: null,
        console: new BrowserConsole(),
        ...options
      });
    }

    public get_rank(command: IFeatureCommand): number {
      return super.get_rank(command);
    }

    entry_point: CommandEntryPoint;
    selector: string;

    get current_adapter(): WidgetAdapter<IDocumentWidget> {
      return undefined;
    }
  }
  let manager: ManagerImplementation;

  let base_command = {
    id: 'cmd',
    execute: () => {
      // nothing here yet
    },
    is_enabled: () => {
      return true;
    },
    label: 'Command'
  } as IFeatureCommand;

  describe('#get_rank()', () => {
    it('uses in-group (relative) positioning by default', () => {
      manager = new ManagerImplementation({
        selector: null,
        rank_group: 0,
        rank_group_size: 5
      });
      let rank = manager.get_rank(base_command);
      expect(rank).to.equal(0);

      rank = manager.get_rank({ ...base_command, rank: 1 });
      expect(rank).to.equal(1 / 5);

      manager = new ManagerImplementation({
        selector: null,
        rank_group: 1,
        rank_group_size: 5
      });

      rank = manager.get_rank({ ...base_command, rank: 1 });
      expect(rank).to.equal(1 + 1 / 5);

      manager = new ManagerImplementation({
        selector: null
      });
      rank = manager.get_rank(base_command);
      expect(rank).to.equal(Infinity);
    });
  });

  it('respects is_rank_relative value', () => {
    manager = new ManagerImplementation({
      selector: null,
      rank_group: 0,
      rank_group_size: 5
    });

    let rank = manager.get_rank({
      ...base_command,
      rank: 1,
      is_rank_relative: false
    });
    expect(rank).to.equal(1);

    rank = manager.get_rank({
      ...base_command,
      rank: 1,
      is_rank_relative: true
    });
    expect(rank).to.equal(1 / 5);
  });
});
