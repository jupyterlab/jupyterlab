// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Launcher, LauncherModel } from '@jupyterlab/launcher';
import { framePromise, simulate } from '@jupyterlab/testing';
import { CommandRegistry } from '@lumino/commands';
import { Widget } from '@lumino/widgets';

describe('@jupyterlab/launcher', () => {
  describe('Launcher keyboard interaction', () => {
    const command = 'launcher:test-command';
    let executeSpy: jest.Mock;
    let launcher: Launcher;

    beforeEach(async () => {
      const commands = new CommandRegistry();
      executeSpy = jest.fn().mockResolvedValue(undefined);

      commands.addCommand(command, {
        label: 'New Notebook',
        caption: 'Create a new notebook',
        execute: executeSpy
      });

      const model = new LauncherModel();
      model.add({ category: 'Notebook', command });

      launcher = new Launcher({
        callback: () => undefined,
        commands,
        cwd: '/tmp',
        model
      });

      Widget.attach(launcher, document.body);
      await framePromise();
      await framePromise();
    });

    afterEach(() => {
      launcher.dispose();
      document.body.textContent = '';
    });

    function getCard(): HTMLElement {
      const card = launcher.node.querySelector('.jp-LauncherCard');
      expect(card).not.toBeNull();
      return card as HTMLElement;
    }

    it('should execute a command for Enter', () => {
      const card = getCard();
      simulate(card, 'keydown', { key: 'Enter' });
      expect(executeSpy).toHaveBeenCalledTimes(1);
    });

    it('should execute a command for Space', () => {
      const card = getCard();
      simulate(card, 'keydown', { key: ' ' });
      expect(executeSpy).toHaveBeenCalledTimes(1);
    });

    it('should prevent default browser behavior for Space', () => {
      const card = getCard();
      const event = new KeyboardEvent('keydown', {
        key: ' ',
        bubbles: true,
        cancelable: true
      });

      card.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
      expect(executeSpy).toHaveBeenCalledTimes(1);
    });
  });
});
