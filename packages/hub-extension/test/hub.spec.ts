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
  let dummyPaths = {} as JupyterFrontEnd.IPaths;

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
    it('should add hub commands to registry', async () => {
      // Override readonly props on the interface
      (dummyPaths as any)['urls'] = {
        hubPrefix: hubPrefix
      };
      let commands = new CommandRegistry();
      void hubExtension.activate(
        {
          commands: commands
        } as any,
        dummyPaths,
        nullTranslator
      );

      expect(commands.hasCommand(CommandIDs.controlPanel)).toBeTruthy();
      expect(commands.hasCommand(CommandIDs.restart)).toBeTruthy();
      expect(commands.hasCommand(CommandIDs.logout)).toBeTruthy();
    });

    it('should not add hub commands when hubPrefix is empty', async () => {
      // Override readonly props on the interface
      (dummyPaths as any)['urls'] = {
        hubPrefix: ''
      };
      let commands = new CommandRegistry();
      void hubExtension.activate(
        {
          commands: commands
        } as any,
        dummyPaths,
        nullTranslator
      );

      expect(commands.hasCommand(CommandIDs.controlPanel)).toBeFalsy();
      expect(commands.hasCommand(CommandIDs.restart)).toBeFalsy();
      expect(commands.hasCommand(CommandIDs.logout)).toBeFalsy();
    });

    it('should include hubServerName in restartUrl when it is non empty', async () => {
      // Override readonly props on the interface
      (dummyPaths as any)['urls'] = {
        hubPrefix: hubPrefix,
        hubUser: hubUser,
        hubServerName: hubServerName
      };
      let commands = new CommandRegistry();
      void hubExtension.activate(
        {
          commands: commands
        } as any,
        dummyPaths,
        nullTranslator
      );

      await commands.execute(CommandIDs.restart);
      expect(windowOpenSpy).toHaveBeenCalledWith(
        `${hubPrefix}/spawn/${hubUser}/${hubServerName}`,
        '_blank'
      );
    });

    it('should set spawn Url for default server when hubServerName is empty', async () => {
      // Override readonly props on the interface
      (dummyPaths as any)['urls'] = {
        hubPrefix: hubPrefix,
        hubUser: hubUser
      };
      let commands = new CommandRegistry();
      void hubExtension.activate(
        {
          commands: commands
        } as any,
        dummyPaths,
        nullTranslator
      );

      await commands.execute(CommandIDs.restart);
      expect(windowOpenSpy).toHaveBeenCalledWith(
        `${hubPrefix}/spawn`,
        '_blank'
      );
    });

    it('should set correct hub home Url', async () => {
      // Override readonly props on the interface
      (dummyPaths as any)['urls'] = {
        hubPrefix: hubPrefix,
        hubUser: hubUser,
        hubServerName: hubServerName
      };
      let commands = new CommandRegistry();
      void hubExtension.activate(
        {
          commands: commands
        } as any,
        dummyPaths,
        nullTranslator
      );

      await commands.execute(CommandIDs.controlPanel);
      expect(windowOpenSpy).toHaveBeenCalledWith(`${hubPrefix}/home`, '_blank');
    });
  });
});
