import { CommandRegistry } from '@lumino/commands';
import { IRankedMenu, RankedMenu } from '../lib';

describe('@jupyterlab/ui-components', () => {
  let commands: CommandRegistry;
  const id = 'test-command';
  const options: CommandRegistry.ICommandOptions = {
    execute: jest.fn()
  };

  beforeAll(() => {
    commands = new CommandRegistry();
    commands.addCommand(id, options);
  });
  describe('IRankedMenu', () => {
    describe('#addItem', () => {
      it('should return a disposable item', () => {
        const menu = new RankedMenu({ commands }) as IRankedMenu;

        const item = menu.addItem({ command: id });

        expect(menu.items.length).toEqual(1);

        item.dispose();

        expect(menu.items.length).toEqual(0);
      });
    });
  });
});
