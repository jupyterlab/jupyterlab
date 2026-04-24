// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import type { IRouter } from '@jupyterlab/application';
import type { IWindowResolver } from '@jupyterlab/apputils';
import type { IStateDB } from '@jupyterlab/statedb';
import { sleep } from '@jupyterlab/testing';
import { nullTranslator } from '@jupyterlab/translation';
import { CommandRegistry } from '@lumino/commands';
import { Token } from '@lumino/coreutils';
import plugins from '../src/index';

describe('@jupyterlab/apputils-extension', () => {
  const statePlugin = plugins.find(
    p => p.id === '@jupyterlab/apputils-extension:state'
  ) as JupyterFrontEndPlugin<IStateDB>;

  let commands: CommandRegistry;
  let navigateMock: jest.Mock;
  let reloadMock: jest.Mock;
  let registerMock: jest.Mock;
  let router: IRouter;
  let workspacesMock: { fetch: jest.Mock; save: jest.Mock };
  let app: JupyterFrontEnd;
  let resolver: IWindowResolver;

  beforeEach(() => {
    commands = new CommandRegistry();

    navigateMock = jest.fn();
    reloadMock = jest.fn();
    registerMock = jest.fn();

    router = {
      current: { hash: '', path: '/lab', request: '/lab', search: '' },
      navigate: navigateMock,
      reload: reloadMock,
      register: registerMock,
      stop: new Token<void>('test:stop'),
      routed: {} as any
    } as unknown as IRouter;

    workspacesMock = {
      fetch: jest.fn().mockRejectedValue(new Error('not found')),
      save: jest.fn().mockResolvedValue(undefined)
    };

    app = {
      commands,
      name: 'JupyterLab',
      serviceManager: {
        workspaces: workspacesMock
      },
      shell: { currentWidget: null }
    } as unknown as JupyterFrontEnd;

    resolver = { name: 'default' } as IWindowResolver;
  });

  describe('@jupyterlab/apputils-extension:state', () => {
    function getResetOnLoadRegistration(): {
      command: string;
      pattern: RegExp;
    } {
      const registrations: Array<{ command: string; pattern: RegExp }> =
        registerMock.mock.calls.map((call: any[]) => call[0]);

      const registration = registrations.find(
        r => r.command === 'apputils:reset-on-load'
      );
      expect(registration).toBeDefined();

      return registration!;
    }

    async function executeResetOnLoad(
      args: Pick<IRouter.ILocation, 'hash' | 'path' | 'search'>
    ): Promise<void> {
      const { hash, path, search } = args;
      await commands.execute('apputils:reset-on-load', {
        hash,
        path,
        search,
        request: `${path}${search}${hash}`
      });
    }

    function activatePlugin(): IStateDB {
      return statePlugin.activate(
        app,
        {} as JupyterFrontEnd.IPaths,
        router,
        nullTranslator,
        resolver
      ) as IStateDB;
    }

    async function flushAsyncEffects(): Promise<void> {
      await sleep(0);
    }

    describe('resetOnLoad command registration', () => {
      it('registers resetOnLoad with a pattern matching ?reset URLs', () => {
        activatePlugin();

        const { pattern } = getResetOnLoadRegistration();
        const matching = [
          '?reset',
          '?reset&other=1',
          '?foo=bar&reset',
          '?foo=bar&reset&baz=1',
          '?reset#section',
          '?foo=bar&reset#section',
          '?reset=1',
          '?reset=true',
          '?reset=',
          '?reset=1&other=2',
          '?foo=bar&reset=1',
          '?foo=bar&reset=true&baz=1',
          '?reset=1#section',
          '?foo=bar&reset=1#section'
        ];
        const notMatching = [
          '?noreset',
          '?noreset#section',
          '?resetAll',
          '?other=reset',
          '/lab/tree/notebook.ipynb'
        ];

        for (const value of matching) {
          expect(pattern.test(value)).toBe(true);
        }

        for (const value of notMatching) {
          expect(pattern.test(value)).toBe(false);
        }
      });
    });

    describe('resetOnLoad command execution', () => {
      it('clears the db and navigates without reset param', async () => {
        const db = activatePlugin();

        await executeResetOnLoad({
          hash: '',
          path: '/lab',
          search: '?reset=1'
        });

        // db should have been cleared (transform resolved with 'clear')
        const data = await db.toJSON();
        expect(Object.keys(data)).toHaveLength(0);

        // navigate should be called without reset param
        expect(navigateMock).toHaveBeenCalledTimes(1);
        const navigatedUrl: string = navigateMock.mock.calls[0][0];
        expect(navigatedUrl).not.toMatch(/[?&]reset/);
      });

      it('preserves other query params when removing reset', async () => {
        activatePlugin();

        await executeResetOnLoad({
          hash: '',
          path: '/lab',
          search: '?other=1&reset=1&foo=bar'
        });

        await flushAsyncEffects();

        expect(navigateMock).toHaveBeenCalledTimes(1);
        const navigatedUrl: string = navigateMock.mock.calls[0][0];
        expect(navigatedUrl).not.toMatch(/[?&]reset/);
        expect(navigatedUrl).toMatch(/other=1/);
        expect(navigatedUrl).toMatch(/foo=bar/);
      });

      it('does nothing when reset param is absent', async () => {
        activatePlugin();

        await executeResetOnLoad({
          hash: '',
          path: '/lab',
          search: '?other=1'
        });

        expect(navigateMock).not.toHaveBeenCalled();
        expect(reloadMock).not.toHaveBeenCalled();
      });

      it('preserves the URL hash when navigating', async () => {
        activatePlugin();

        await executeResetOnLoad({
          hash: '#section',
          path: '/lab',
          search: '?reset=1'
        });

        await flushAsyncEffects();

        expect(navigateMock).toHaveBeenCalledTimes(1);
        const navigatedUrl: string = navigateMock.mock.calls[0][0];
        expect(navigatedUrl).toMatch(/#section/);
      });

      it('reloads when reset is requested after state is already resolved', async () => {
        activatePlugin();

        await executeResetOnLoad({
          hash: '',
          path: '/lab',
          search: '?other=1'
        });

        await commands.execute('apputils:load-statedb', {
          hash: '',
          path: '/lab',
          search: '?other=1'
        });

        await executeResetOnLoad({
          hash: '',
          path: '/lab',
          search: '?reset=1'
        });

        expect(reloadMock).toHaveBeenCalledTimes(1);
        expect(navigateMock).not.toHaveBeenCalled();
      });

      it('navigates hard while preserving clone and removing reset', async () => {
        activatePlugin();

        const result = await commands.execute('apputils:reset-on-load', {
          hash: '',
          path: '/lab',
          search: '?clone=foo&reset=1'
        });

        await flushAsyncEffects();

        expect(result).toBeUndefined();
        expect(navigateMock).toHaveBeenCalledTimes(1);
        const [navigatedUrl, options] = navigateMock.mock.calls[0];
        expect(navigatedUrl).toBe('/lab?clone=foo');
        expect(options).toEqual({ hard: true });
        expect(reloadMock).not.toHaveBeenCalled();
      });
    });
  });
});
