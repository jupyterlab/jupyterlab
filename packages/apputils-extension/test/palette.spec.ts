// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Palette } from '../src/palette';
import type { RecentsCommandPalette } from '@jupyterlab/apputils';
import { nullTranslator } from '@jupyterlab/translation';
import type { JupyterFrontEnd } from '@jupyterlab/application';
import { StateDB } from '@jupyterlab/statedb';
import { signalToPromise } from '@jupyterlab/testing';
import { Application } from '@lumino/application';
import { Widget } from '@lumino/widgets';

class DummyShell extends Widget {
  widgets: Widget[] = [];

  add(widget: Widget): void {
    this.widgets.push(widget);
    document.body.appendChild(widget.node);
  }
}

describe('Palette', () => {
  describe('#activate()', () => {
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

    it('should restore and save the recently used commands with the state database', async () => {
      const state = new StateDB();
      await state.save('command-palette:recents', {
        commands: [{ command: 'test:restored', args: {} }]
      });

      const shell = new DummyShell();
      const app = new Application({ shell });
      Palette.activate(
        app as unknown as JupyterFrontEnd,
        nullTranslator,
        null,
        state
      );
      const palette = shell.widgets.find(
        widget => widget.id === 'command-palette'
      ) as RecentsCommandPalette;

      // The recently used commands are restored from the state database.
      await signalToPromise(palette.recentsChanged);
      expect(palette.recentCommands).toEqual([
        { command: 'test:restored', args: {} }
      ]);

      // A change of the recently used commands is saved to the state database.
      const saved = signalToPromise(state.changed);
      palette.recentCommands = [
        { command: 'test:executed', args: {} },
        ...palette.recentCommands
      ];
      await saved;
      const value = (await state.fetch('command-palette:recents')) as
        | { commands?: RecentsCommandPalette.IRecentCommand[] }
        | undefined;
      expect(value?.commands).toEqual([
        { command: 'test:executed', args: {} },
        { command: 'test:restored', args: {} }
      ]);
    });

    it('should provide a command to clear the recently used commands', async () => {
      const state = new StateDB();
      await state.save('command-palette:recents', {
        commands: [{ command: 'test:restored', args: {} }]
      });

      const shell = new DummyShell();
      const app = new Application({ shell });
      Palette.activate(
        app as unknown as JupyterFrontEnd,
        nullTranslator,
        null,
        state
      );
      const palette = shell.widgets.find(
        widget => widget.id === 'command-palette'
      ) as RecentsCommandPalette;
      // Reset the history leaking from the other tests of this file, since
      // the palette is a module-level singleton.
      palette.recentCommands = [];

      await signalToPromise(palette.recentsChanged);
      expect(app.commands.isEnabled('apputils:clear-recent-commands')).toBe(
        true
      );

      let notified = 0;
      app.commands.commandChanged.connect((registry, args) => {
        if (args.id === 'apputils:clear-recent-commands') {
          notified += 1;
        }
      });
      // Observe the save triggered by clearing the history.
      const saved = signalToPromise(state.changed);
      await app.commands.execute('apputils:clear-recent-commands');
      expect(palette.recentCommands).toEqual([]);
      expect(app.commands.isEnabled('apputils:clear-recent-commands')).toBe(
        false
      );
      expect(notified).toBe(1);

      // The cleared history is saved to the state database.
      await saved;
      const value = (await state.fetch('command-palette:recents')) as
        | { commands?: RecentsCommandPalette.IRecentCommand[] }
        | undefined;
      expect(value?.commands).toEqual([]);
    });
  });
});
