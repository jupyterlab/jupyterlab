// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Palette } from '../src/palette';
import { RecentsCommandPalette } from '@jupyterlab/apputils';
import { nullTranslator } from '@jupyterlab/translation';
import type { JupyterFrontEnd } from '@jupyterlab/application';
import { LayoutRestorer } from '@jupyterlab/application';
import type { ISettingRegistry } from '@jupyterlab/settingregistry';
import { SettingRegistry } from '@jupyterlab/settingregistry';
import type { IDataConnector } from '@jupyterlab/statedb';
import { StateDB } from '@jupyterlab/statedb';
import { signalToPromise, sleep } from '@jupyterlab/testing';
import { Application } from '@lumino/application';
import { VirtualDOM } from '@lumino/virtualdom';
import { Widget } from '@lumino/widgets';

class DummyShell extends Widget {
  added: Widget[] = [];

  add(widget: Widget): void {
    this.added.push(widget);
    widget.parent = null;
    document.body.appendChild(widget.node);
  }
}

/**
 * The palette returned by the last call to `activatePalette()`.
 */
let activated: RecentsCommandPalette | null = null;

/**
 * Activate the palette and palette restorer plugins and return the palette.
 */
function activatePalette(
  state: StateDB,
  settingRegistry: ISettingRegistry | null = null,
  restoreFirst = false
): { app: Application<DummyShell>; palette: RecentsCommandPalette } {
  const shell = new DummyShell();
  const app = new Application({ shell });
  const restorer = new LayoutRestorer({
    connector: new StateDB(),
    first: Promise.resolve(),
    registry: app.commands
  });
  const activate = () =>
    Palette.activate(
      app as unknown as JupyterFrontEnd,
      nullTranslator,
      settingRegistry
    );
  const restore = () =>
    Palette.restore(
      app as unknown as JupyterFrontEnd,
      restorer,
      nullTranslator,
      state,
      settingRegistry
    );
  if (restoreFirst) {
    restore();
    activate();
  } else {
    activate();
    restore();
  }
  const palette = shell.added.find(
    (widget): widget is RecentsCommandPalette =>
      widget instanceof RecentsCommandPalette
  )!;
  activated = palette;
  return { app, palette };
}

/**
 * Create a setting registry which serves the given palette settings.
 */
function createSettingRegistry(raw: string): SettingRegistry {
  const plugin: ISettingRegistry.IPlugin = {
    id: '@jupyterlab/apputils-extension:palette',
    data: { composite: {}, user: {} },
    raw,
    schema: {
      type: 'object',
      properties: {
        modal: { type: 'boolean', default: true },
        maxRecentCommands: { type: 'number', minimum: 0, default: 5 }
      }
    },
    version: 'test'
  };
  const connector: IDataConnector<
    ISettingRegistry.IPlugin,
    string,
    string,
    string
  > = {
    fetch: jest.fn().mockResolvedValue(plugin),
    list: jest.fn(),
    save: jest.fn(),
    remove: jest.fn()
  };
  return new SettingRegistry({ connector });
}

describe('Palette', () => {
  describe('#activate()', () => {
    afterEach(async () => {
      // Reset the module-level singleton palette and let its saves complete.
      if (activated) {
        activated.maxRecentCommands = 5;
        activated.recentCommands = [];
        await sleep();
      }
    });

    it('command palette should have aria-label and role for accessibility', async () => {
      const app = new Application({ shell: new DummyShell() });
      const settingRegistry = null;
      Palette.activate(
        app as unknown as JupyterFrontEnd,
        nullTranslator,
        settingRegistry
      );

      const node = document.getElementById('command-palette')!;
      expect(node.getAttribute('aria-label')).toEqual(
        'Command Palette Section'
      );
      expect(node.getAttribute('role')).toEqual('region');
    });

    it('should restore the recently used commands after the current ones', async () => {
      const state = new StateDB();
      await state.save('command-palette:recents', {
        commands: [{ command: 'test:restored', args: {} }]
      });

      const { palette } = activatePalette(state);
      palette.recentCommands = [{ command: 'test:executed', args: {} }];

      await signalToPromise(palette.recentsChanged);
      expect(palette.recentCommands).toEqual([
        { command: 'test:executed', args: {} },
        { command: 'test:restored', args: {} }
      ]);
    });

    it('should save the recently used commands when they change', async () => {
      const state = new StateDB();
      const { palette } = activatePalette(state);
      // Let the saves of the reset and of the restoration complete.
      await sleep();

      const saved = signalToPromise(state.changed);
      palette.recentCommands = [{ command: 'test:executed', args: {} }];
      await saved;
      expect(await state.fetch('command-palette:recents')).toEqual({
        commands: [{ command: 'test:executed', args: {} }]
      });
    });

    it('should provide a command to clear the recently used commands', async () => {
      const state = new StateDB();
      await state.save('command-palette:recents', {
        commands: [{ command: 'test:restored', args: {} }]
      });

      const { app, palette } = activatePalette(state);
      await signalToPromise(palette.recentsChanged);
      await sleep();
      expect(app.commands.isEnabled('apputils:clear-recent-commands')).toBe(
        true
      );

      let notified = 0;
      app.commands.commandChanged.connect((registry, args) => {
        if (args.id === 'apputils:clear-recent-commands') {
          notified += 1;
        }
      });
      const saved = signalToPromise(state.changed);
      await app.commands.execute('apputils:clear-recent-commands');
      expect(palette.recentCommands).toEqual([]);
      expect(app.commands.isEnabled('apputils:clear-recent-commands')).toBe(
        false
      );
      expect(notified).toBe(1);

      await saved;
      expect(await state.fetch('command-palette:recents')).toEqual({
        commands: []
      });
    });

    it.each([
      { first: 'provider', restoreFirst: false },
      { first: 'restorer', restoreFirst: true }
    ])(
      'should restore the recently used commands after applying the settings when the $first activates first',
      async ({ restoreFirst }) => {
        const commands = [...Array(7).keys()].map(i => ({
          command: `test:restored-${i}`,
          args: {}
        }));
        const state = new StateDB();
        await state.save('command-palette:recents', { commands });

        const { palette } = activatePalette(
          state,
          createSettingRegistry('{ "modal": false, "maxRecentCommands": 10 }'),
          restoreFirst
        );

        // The default limit of 5 would truncate the restored history.
        await signalToPromise(palette.recentsChanged);
        expect(palette.maxRecentCommands).toBe(10);
        expect(palette.recentCommands).toEqual(commands);
      }
    );

    it('should clear the stored history if the limit is 0', async () => {
      const state = new StateDB();
      await state.save('command-palette:recents', {
        commands: [{ command: 'test:restored', args: {} }]
      });

      const saved = signalToPromise(state.changed);
      const { palette } = activatePalette(
        state,
        createSettingRegistry('{ "modal": false, "maxRecentCommands": 0 }')
      );

      await saved;
      expect(palette.recentCommands).toEqual([]);
      expect(await state.fetch('command-palette:recents')).toBeUndefined();
    });

    it('should render a badge for the recently used commands', () => {
      const { palette } = activatePalette(new StateDB());
      const command = palette.commands.addCommand('test:badge', {
        label: 'Badge',
        execute: () => void 0
      });
      const item = palette.addItem({ command: 'test:badge', category: 'Test' });
      const render = () =>
        VirtualDOM.realize(
          palette.renderer.renderItem({ item, indices: null, active: false })
        );

      expect(
        render().querySelector('.jp-CommandPalette-recentBadge')
      ).toBeNull();
      expect(render().querySelector('.jp-mod-recent')).toBeNull();

      palette.recentCommands = [{ command: 'test:badge', args: {} }];
      const badge = render().querySelector('.jp-CommandPalette-recentBadge');
      expect(badge?.textContent).toBe('recently used');
      expect(
        badge?.parentElement?.matches(
          '.lm-CommandPalette-itemContent.jp-mod-recent'
        )
      ).toBe(true);

      palette.removeItem(item);
      command.dispose();
    });
  });
});
