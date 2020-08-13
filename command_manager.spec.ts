import { expect } from 'chai';
import { CommandEntryPoint, ContextCommandManager, ICommandContext } from './command_manager';
import { JupyterLabWidgetAdapter } from './adapters/jupyterlab/jl_adapter';
import { IFeatureCommand } from "./feature";

describe('ContextMenuCommandManager', () => {
  class ManagerImplementation extends ContextCommandManager {
    public get_rank(command: IFeatureCommand): number {
      return super.get_rank(command);
    }

    entry_point: CommandEntryPoint;
    selector: string;

    get current_adapter(): JupyterLabWidgetAdapter {
      return undefined;
    }

    context_from_active_document(): ICommandContext {
      return undefined;
    }
  }
  let manager: ManagerImplementation;

  let base_command = {
    id: 'cmd',
    execute: () => {
      // nothing here het
    },
    is_enabled: () => {
      return true;
    },
    label: 'Command'
  } as IFeatureCommand;

  describe('#get_rank()', () => {
    it('uses in-group (relative) positioning by default', () => {
      manager = new ManagerImplementation(null, null, null, null, 0, 5);
      let rank = manager.get_rank(base_command);
      expect(rank).to.equal(0);

      rank = manager.get_rank({ ...base_command, rank: 1 });
      expect(rank).to.equal(1 / 5);

      manager = new ManagerImplementation(null, null, null, null, 1, 5);

      rank = manager.get_rank({ ...base_command, rank: 1 });
      expect(rank).to.equal(1 + 1 / 5);
    });
  });

  it('respects is_rank_relative value', () => {
    manager = new ManagerImplementation(null, null, null, null, 0, 5);

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
