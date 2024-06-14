// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { JupyterFrontEnd } from '@jupyterlab/application';
import { nullTranslator } from '@jupyterlab/translation';
import { CommandRegistry } from '@lumino/commands';
import extensions, { CommandIDs } from '@jupyterlab/hub-extension';

describe('@jupyterlab/hub-extension', () => {
  // Mock path parameters
  const hubPrefix = '/hub';
  const hubUser = 'test_user';
  const hubServerName = 'test_server';

  // Extension in test
  const hubExtension = extensions[0];

  // Spy on window open
  let windowOpenSpy: jest.SpyInstance;

  // To restore original open after each test
  const { open } = window;

  beforeEach(() => {
    // Replace with the custom value
    window.open = jest.fn();
    windowOpenSpy = jest.spyOn(window, 'open');
  });

  afterAll(() => {
    // Restore original
    window.open = open;
  });

  describe('hub commands', () => {
    const activateHubExtension = (
      commands: CommandRegistry,
      urls: Partial<JupyterFrontEnd.IPaths['urls']>
    ) => {
      return hubExtension.activate(
        { commands } as JupyterFrontEnd,
        { urls },
        nullTranslator
      );
    };
    it('should add hub commands to registry', async () => {
      let commands = new CommandRegistry();
      void activateHubExtension(commands, {
        hubPrefix
      });

      expect(commands.hasCommand(CommandIDs.controlPanel)).toBeTruthy();
      expect(commands.hasCommand(CommandIDs.restart)).toBeTruthy();
      expect(commands.hasCommand(CommandIDs.logout)).toBeTruthy();
    });

    it('should not add hub commands when hubPrefix is empty', async () => {
      let commands = new CommandRegistry();
      void activateHubExtension(commands, {
        hubPrefix: ''
      });

      expect(commands.hasCommand(CommandIDs.controlPanel)).toBeFalsy();
      expect(commands.hasCommand(CommandIDs.restart)).toBeFalsy();
      expect(commands.hasCommand(CommandIDs.logout)).toBeFalsy();
    });

    it('should include hubServerName in restartUrl when it is non empty', async () => {
      let commands = new CommandRegistry();
      void activateHubExtension(commands, {
        hubPrefix,
        hubUser,
        hubServerName
      });

      await commands.execute(CommandIDs.restart);
      expect(windowOpenSpy).toHaveBeenCalledWith(
        `${hubPrefix}/spawn/${hubUser}/${hubServerName}`,
        '_blank'
      );
    });

    it('should set spawn URL for default server when hubServerName is empty', async () => {
      let commands = new CommandRegistry();
      void activateHubExtension(commands, {
        hubPrefix,
        hubUser
      });

      await commands.execute(CommandIDs.restart);
      expect(windowOpenSpy).toHaveBeenCalledWith(
        `${hubPrefix}/spawn`,
        '_blank'
      );
    });

    it('should set correct hub home URL', async () => {
      let commands = new CommandRegistry();
      void activateHubExtension(commands, {
        hubPrefix,
        hubUser,
        hubServerName
      });

      await commands.execute(CommandIDs.controlPanel);
      expect(windowOpenSpy).toHaveBeenCalledWith(`${hubPrefix}/home`, '_blank');
    });

    it('should reject on invalid username', async () => {
      let commands = new CommandRegistry();
      const callback = async () => {
        await activateHubExtension(commands, {
          hubPrefix,
          hubUser: '../',
          hubServerName
        });
      };
      await expect(callback).rejects.toThrow();
    });

    it('should reject on invalid server name', async () => {
      let commands = new CommandRegistry();
      const callback = async () => {
        await activateHubExtension(commands, {
          hubPrefix,
          hubUser,
          hubServerName: '../../'
        });
      };
      await expect(callback).rejects.toThrow();
    });
  });
});
